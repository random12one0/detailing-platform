-- Andrew's Auto Detail & Car Wash - Booking System Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Create packages table
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('interior', 'exterior')),
    tier VARCHAR(50) NOT NULL CHECK (tier IN ('standard', 'deluxe', 'ultimate')),
    base_price DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    description TEXT,
    features JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(category, tier)
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Customer Information
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_address TEXT,
    
    -- Booking Details
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_duration_minutes INTEGER NOT NULL,
    
    -- Service Details
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('mobile', 'dropoff')),
    vehicle_size VARCHAR(20) NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
    vehicle_size_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Selected Packages
    interior_package_id UUID REFERENCES packages(id),
    exterior_package_id UUID REFERENCES packages(id),
    
    -- Pricing
    subtotal DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    
    -- Additional Info
    has_water_electric BOOLEAN DEFAULT FALSE,
    customer_notes TEXT,
    
    -- Calendar Integration
    google_calendar_event_id VARCHAR(255),
    ics_file_sent BOOLEAN DEFAULT FALSE,
    
    -- Status & Timestamps
    status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Constraints
    CONSTRAINT require_package CHECK (interior_package_id IS NOT NULL OR exterior_package_id IS NOT NULL),
    CONSTRAINT mobile_requires_address CHECK (service_type != 'mobile' OR customer_address IS NOT NULL)
);

-- Create indexes for better query performance
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert package data
INSERT INTO packages (name, category, tier, base_price, duration_minutes, description, features) VALUES
-- Interior Packages
('Interior Standard', 'interior', 'standard', 20.00, 30, 'Standard Interior Clean', 
 '["Full interior vacuum", "Quick wipe-down", "Trash removal", "Optional interior scent add-on"]'::jsonb),
 
('Interior Deluxe', 'interior', 'deluxe', 40.00, 45, 'Deluxe Interior Clean',
 '["Full interior vacuum", "Light interior touch-up cleaning", "Trash removal", "Floor mat cleaning", "Optional interior scent add-on"]'::jsonb),
 
('Interior Ultimate', 'interior', 'ultimate', 60.00, 60, 'Ultimate Interior Clean',
 '["Full interior vacuum", "Deep cleaning of dash, console, door panels, and seats", "Trash removal", "Floor mat cleaning", "Carpet and upholstery cleaning", "Stain treatment", "Door Jam cleaning", "Optional interior scent add-on"]'::jsonb),

-- Exterior Packages
('Exterior Standard', 'exterior', 'standard', 20.00, 30, 'Standard Exterior Detail',
 '["Hand wash", "Light Wheel and tire cleaning", "Tire shine"]'::jsonb),
 
('Exterior Deluxe', 'exterior', 'deluxe', 35.00, 45, 'Deluxe Exterior Detail',
 '["Pre-wash", "Hand wash", "Deep Wheel and tire cleaning", "Tire shine", "Window cleaning"]'::jsonb),
 
('Exterior Ultimate', 'exterior', 'ultimate', 50.00, 60, 'Ultimate Exterior Detail',
 '["Pre-wash", "Hand wash", "Deep Wheel and tire cleaning", "Tire shine", "Window cleaning", "Trim enhancement", "Headlight Brightening", "1 Month Exterior protection with hydrophobic finish"]'::jsonb);

-- Enable Row Level Security (RLS)
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for packages (public read)
CREATE POLICY "Allow public read access to packages" ON packages
    FOR SELECT USING (true);

-- Create policies for bookings (public insert, authenticated read/update)
CREATE POLICY "Allow public insert on bookings" ON bookings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated read on bookings" ON bookings
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow authenticated update on bookings" ON bookings
    FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Create function to check booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict(
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM bookings
        WHERE booking_date = p_booking_date
        AND status != 'cancelled'
        AND (p_booking_id IS NULL OR id != p_booking_id)
        AND (
            -- New booking starts during existing booking
            (p_start_time >= start_time AND p_start_time < end_time)
            OR
            -- New booking ends during existing booking
            (p_end_time > start_time AND p_end_time <= end_time)
            OR
            -- New booking completely overlaps existing booking
            (p_start_time <= start_time AND p_end_time >= end_time)
        )
    ) INTO conflict_exists;
    
    RETURN conflict_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_booking_conflict(DATE, TIME, TIME, UUID) TO anon, authenticated, service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Total packages created: %', (SELECT COUNT(*) FROM packages);
END $$;
