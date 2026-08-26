-- Add admin_notes column to bookings table
-- This field stores internal admin notes that are not visible to customers

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_admin_notes ON bookings(admin_notes)
WHERE admin_notes IS NOT NULL;
