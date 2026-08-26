-- Migration: Create dropoff_only_periods table for drop-off only days/times
CREATE TABLE IF NOT EXISTS dropoff_only_periods (
  id BIGSERIAL PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE, -- nullable, for multi-day periods; if null, only start_date is used
  start_time TIME, -- nullable, for time-specific blocks; if null, applies all day
  end_time TIME,   -- nullable, for time-specific blocks; if null, applies all day
  reason TEXT,     -- optional, for admin notes
  created_at TIMESTAMPTZ DEFAULT now()
);
