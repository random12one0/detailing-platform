-- Add base_price column to packages table if it doesn't exist
ALTER TABLE packages ADD COLUMN IF NOT EXISTS base_price NUMERIC NOT NULL DEFAULT 0;
