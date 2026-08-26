-- Temporarily allow anonymous inserts to bookings table for testing
-- Run this in Supabase SQL Editor

-- Create a policy to allow inserts
CREATE POLICY "Allow anonymous inserts for testing" ON bookings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- After you've created test bookings, remove this policy with:
-- DROP POLICY "Allow anonymous inserts for testing" ON bookings;
