-- ============================================================================
-- MIGRATION: Relational Booking System with Proper Auth
-- Date: 2026-02-05
-- Description: Refactor to proper relational structure with customer_id FK
-- ============================================================================

-- STEP 1: Modify customers table structure
-- ============================================================================

-- Drop old unique constraint on phone, add unique constraint on email
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_key;
ALTER TABLE customers ADD CONSTRAINT customers_email_key UNIQUE (email);

-- Change id to UUID for consistency (if not already)
-- Note: This is a breaking change if customers already exist
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'customers' AND column_name = 'id') = 'bigint' THEN
    
    -- Create new UUID column
    ALTER TABLE customers ADD COLUMN id_new UUID DEFAULT gen_random_uuid();
    
    -- Copy data (in a real production scenario, you'd map old IDs)
    UPDATE customers SET id_new = gen_random_uuid();
    
    -- Drop old ID and rename new one
    ALTER TABLE customers DROP COLUMN id CASCADE;
    ALTER TABLE customers RENAME COLUMN id_new TO id;
    
    -- Set as primary key
    ALTER TABLE customers ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Ensure customers table has proper structure
ALTER TABLE customers
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN name SET NOT NULL;

-- Add index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- STEP 2: Add customer_id to bookings table
-- ============================================================================

-- Add customer_id column (nullable initially for migration)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id UUID;

-- Backfill customer_id from existing customer data in bookings
-- This attempts to match by email, creates customer if doesn't exist
DO $$
DECLARE
  booking_record RECORD;
  existing_customer_id UUID;
  new_customer_id UUID;
BEGIN
  FOR booking_record IN 
    SELECT id, customer_name, customer_email, customer_phone, customer_address
    FROM bookings 
    WHERE customer_id IS NULL AND customer_email IS NOT NULL
  LOOP
    -- Try to find existing customer by email
    SELECT id INTO existing_customer_id
    FROM customers
    WHERE email = booking_record.customer_email
    LIMIT 1;
    
    IF existing_customer_id IS NOT NULL THEN
      -- Customer exists, link it
      UPDATE bookings 
      SET customer_id = existing_customer_id 
      WHERE id = booking_record.id;
    ELSE
      -- Create new customer
      INSERT INTO customers (name, email, phone, address, total_bookings, total_spent)
      VALUES (
        booking_record.customer_name,
        booking_record.customer_email,
        booking_record.customer_phone,
        booking_record.customer_address,
        0,
        0
      )
      RETURNING id INTO new_customer_id;
      
      -- Link to booking
      UPDATE bookings 
      SET customer_id = new_customer_id 
      WHERE id = booking_record.id;
    END IF;
  END LOOP;
END $$;

-- Now make customer_id NOT NULL and add foreign key
ALTER TABLE bookings 
  ALTER COLUMN customer_id SET NOT NULL,
  ADD CONSTRAINT fk_bookings_customer 
    FOREIGN KEY (customer_id) 
    REFERENCES customers(id) 
    ON DELETE RESTRICT; -- Prevent deleting customer with bookings

-- Add index on customer_id for fast joins
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);

-- STEP 3: Remove denormalized customer fields from bookings
-- ============================================================================
-- Keep them for now for backward compatibility, but they're deprecated
-- In a future migration, these can be dropped:
-- ALTER TABLE bookings DROP COLUMN customer_name;
-- ALTER TABLE bookings DROP COLUMN customer_email;
-- ALTER TABLE bookings DROP COLUMN customer_phone;
-- ALTER TABLE bookings DROP COLUMN customer_address;

COMMENT ON COLUMN bookings.customer_name IS 'DEPRECATED: Use JOIN with customers table';
COMMENT ON COLUMN bookings.customer_email IS 'DEPRECATED: Use JOIN with customers table';
COMMENT ON COLUMN bookings.customer_phone IS 'DEPRECATED: Use JOIN with customers table';
COMMENT ON COLUMN bookings.customer_address IS 'DEPRECATED: Use JOIN with customers table';

-- STEP 4: Create admin_users table for authentication
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (clean slate)
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can read their bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can view active packages" ON packages;
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON customers;

-- CUSTOMERS TABLE POLICIES
-- ============================================================================

-- Public users: NO ACCESS (edge function uses service role)
CREATE POLICY "Public users cannot access customers"
  ON customers
  FOR ALL
  TO anon
  USING (false);

-- Authenticated admins: FULL ACCESS
CREATE POLICY "Admins can view all customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- BOOKINGS TABLE POLICIES
-- ============================================================================

-- Public users: NO ACCESS (edge function uses service role)
CREATE POLICY "Public users cannot access bookings"
  ON bookings
  FOR ALL
  TO anon
  USING (false);

-- Authenticated admins: FULL ACCESS
CREATE POLICY "Admins can view all bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete bookings"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- PACKAGES TABLE POLICIES
-- ============================================================================

-- Public users: READ ONLY (for booking widget)
CREATE POLICY "Public users can view active packages"
  ON packages
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Authenticated admins: FULL ACCESS
CREATE POLICY "Admins can manage packages"
  ON packages
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ADMIN_USERS TABLE POLICIES
-- ============================================================================

-- Only admins can view admin_users table
CREATE POLICY "Admins can view all admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Only super_admins can modify admin_users
CREATE POLICY "Super admins can manage admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  );

-- STEP 6: Triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to customers
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to bookings
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to admin_users
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- STEP 7: Create default admin user (IMPORTANT: Change password after first login)
-- ============================================================================
-- This will be done manually via Supabase Dashboard or CLI
-- Instructions:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create a new user with email and password
-- 3. Copy the user's UUID
-- 4. Run: INSERT INTO admin_users (id, email, full_name, role) VALUES ('[UUID]', '[email]', '[name]', 'super_admin');

COMMENT ON TABLE admin_users IS 'Admin users who can access the dashboard. Create via Supabase Auth, then add entry here.';

-- STEP 8: Views for easier querying
-- ============================================================================

-- View: Bookings with customer data (denormalized for read performance)
CREATE OR REPLACE VIEW bookings_with_customers AS
SELECT 
  b.*,
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  c.address as customer_address,
  c.total_bookings as customer_total_bookings,
  c.total_spent as customer_total_spent
FROM bookings b
INNER JOIN customers c ON b.customer_id = c.id;

-- Grant access to view
GRANT SELECT ON bookings_with_customers TO authenticated;

-- View: Customer stats (aggregated booking data)
CREATE OR REPLACE VIEW customer_stats AS
SELECT 
  c.id,
  c.email,
  c.name,
  c.phone,
  c.address,
  COUNT(b.id) as total_bookings,
  COALESCE(SUM(CASE 
    WHEN b.status != 'cancelled' THEN b.total_price 
    ELSE 0 
  END), 0) as total_spent,
  MAX(b.booking_date) as last_booking_date,
  MIN(b.booking_date) as first_booking_date
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
GROUP BY c.id, c.email, c.name, c.phone, c.address;

-- Grant access to view
GRANT SELECT ON customer_stats TO authenticated;

-- STEP 9: Indexes for performance
-- ============================================================================

-- Booking queries by date range
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(booking_date, status);

-- Booking queries by status
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Package lookups
CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(is_active);

-- Customer search by phone
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Migration complete! Next steps:';
  RAISE NOTICE '1. Create admin user via Supabase Dashboard';
  RAISE NOTICE '2. Add admin user to admin_users table';
  RAISE NOTICE '3. Deploy updated edge function';
  RAISE NOTICE '4. Update frontend to use Supabase Auth';
  RAISE NOTICE '5. Remove VITE_SUPABASE_SERVICE_KEY from frontend .env';
  RAISE NOTICE '=======================================================';
END $$;
