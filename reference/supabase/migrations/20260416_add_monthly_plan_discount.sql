-- Migration: Add monthly_plan_discount to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS monthly_plan_discount DECIMAL(10, 2);
