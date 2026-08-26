-- Migration: Create monthly_plans table for monthly detail plan selection
CREATE TABLE IF NOT EXISTS monthly_plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    description TEXT,
    discount_type TEXT CHECK (discount_type IN ('percentage', 'amount')) NOT NULL DEFAULT 'amount',
    discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
