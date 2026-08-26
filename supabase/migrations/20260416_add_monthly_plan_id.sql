-- Migration: Add monthly_plan_id to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS monthly_plan_id INTEGER;
