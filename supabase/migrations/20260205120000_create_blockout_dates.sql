-- Blockout Dates Table for Supabase/Postgres
CREATE TABLE IF NOT EXISTS blockout_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  start_time time,
  end_time time,
  repeat text DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  admin_id uuid REFERENCES admins(id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_blockout_dates_start_end ON blockout_dates (start_date, end_date);
