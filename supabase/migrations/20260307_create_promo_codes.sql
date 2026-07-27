-- Promo Codes Table
CREATE TABLE promo_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    type text NOT NULL CHECK (type IN ('percentage', 'amount')),
    value numeric NOT NULL CHECK (value > 0),
    expires_at timestamptz,
    usage_limit integer,
    times_used integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for quick lookup
CREATE INDEX idx_promo_codes_code ON promo_codes (code);
