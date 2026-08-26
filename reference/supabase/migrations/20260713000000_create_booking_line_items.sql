-- Structured payment line items for booking finalization.
-- Replaces the free-text / single JSONB `bookings.line_items` blob with real,
-- reportable rows so the revenue page can break down upsells, add-ons, tips, etc.
--
-- Sign convention: `amount` is POSITIVE for charges (upgrades, add-ons, custom
-- charges, travel/mobile fee, tips) and NEGATIVE for discounts/comps.
-- A booking's final total = base booking total + SUM(amount * quantity).

CREATE TABLE IF NOT EXISTS public.booking_line_items (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    category   text NOT NULL CHECK (category IN (
                   'upgrade',     -- package/service upgrade at time of service
                   'add_on',      -- extra add-on service
                   'custom',      -- custom charge typed in by the owner
                   'travel_fee',  -- mobile/travel fee
                   'tip',         -- customer tip
                   'discount'     -- discount / comp (store amount as negative)
               )),
    label      text NOT NULL,          -- owner's own words, e.g. "Upgraded to Ultimate Interior"
    amount     numeric NOT NULL DEFAULT 0,
    quantity   integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_line_items_booking_id
    ON public.booking_line_items(booking_id);
