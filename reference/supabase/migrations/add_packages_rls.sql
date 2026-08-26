-- Enable RLS on packages table
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active packages
CREATE POLICY "Allow public read access to packages"
ON packages
FOR SELECT
TO public
USING (is_active = true);

-- Allow authenticated users to read all packages (including inactive ones for admin)
CREATE POLICY "Allow authenticated read all packages"
ON packages
FOR SELECT
TO authenticated
USING (true);
