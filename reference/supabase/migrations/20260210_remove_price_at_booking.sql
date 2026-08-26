-- Migration to remove price_at_booking from booking_add_ons
ALTER TABLE booking_add_ons DROP COLUMN IF EXISTS price_at_booking;