-- Migration: Add referral and loyalty fields to customers and bookings tables
-- Add completed_washes_count, referral_code, referred_by to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS completed_washes_count INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- Add referral_code_used to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS referral_code_used TEXT;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_customers_referral_code ON customers(referral_code);
CREATE INDEX IF NOT EXISTS idx_customers_referred_by ON customers(referred_by);
CREATE INDEX IF NOT EXISTS idx_bookings_referral_code_used ON bookings(referral_code_used);
