-- Table: booking_hours_overrides
CREATE TABLE IF NOT EXISTS booking_hours_overrides (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    notes TEXT
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_booking_hours_date ON booking_hours_overrides(date);