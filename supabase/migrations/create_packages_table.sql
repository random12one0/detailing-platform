-- Create packages table
CREATE TABLE IF NOT EXISTS packages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('interior', 'exterior')),
  duration_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for category lookups
CREATE INDEX IF NOT EXISTS idx_packages_category ON packages(category);
CREATE INDEX IF NOT EXISTS idx_packages_is_active ON packages(is_active);

-- Insert some sample packages for interior detailing
INSERT INTO packages (name, description, price, category, duration_minutes) VALUES
('Basic Interior', 'Vacuum, wipe down surfaces, windows', 50.00, 'interior', 45),
('Standard Interior', 'Deep vacuum, shampoo carpets, leather conditioning', 100.00, 'interior', 90),
('Premium Interior', 'Complete interior detail with steam cleaning', 150.00, 'interior', 120);

-- Insert some sample packages for exterior detailing
INSERT INTO packages (name, description, price, category, duration_minutes) VALUES
('Basic Exterior', 'Hand wash, dry, tire shine', 40.00, 'exterior', 30),
('Standard Exterior', 'Wash, clay bar, wax, tire dressing', 80.00, 'exterior', 60),
('Premium Exterior', 'Full exterior detail with paint correction', 200.00, 'exterior', 180);
