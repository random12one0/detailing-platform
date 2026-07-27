-- CMS + site-wide-discount data foundation (additive; applied to live DB).
-- Single editable source of truth for business contact/brand + a global discount toggle,
-- weekly hours, and CMS feature/notes columns on the catalog tables.

CREATE TABLE IF NOT EXISTS public.business_info (
    id                    integer PRIMARY KEY DEFAULT 1,
    brand_name            text,
    phone                 text,
    email                 text,
    service_area          text,
    dropoff_address       text,
    social_yelp           text,
    social_google         text,
    social_instagram      text,
    -- Site-wide discount ("X% off everything" toggle)
    site_discount_active  boolean NOT NULL DEFAULT false,
    site_discount_percent numeric NOT NULL DEFAULT 0,
    site_discount_label   text,
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT business_info_singleton CHECK (id = 1)
);

INSERT INTO public.business_info (id, brand_name, phone, email, service_area, dropoff_address)
VALUES (1, 'Andrew''s Auto Detail & Car Wash', '562-310-1075', 'andrewswashing@gmail.com',
        'Lakewood, California', '3538 Del Amo Blvd, Lakewood, CA')
ON CONFLICT (id) DO NOTHING;

-- Weekly regular hours (0=Sunday..6=Saturday); NULL = closed. Exceptions in booking_hours_overrides.
CREATE TABLE IF NOT EXISTS public.business_hours (
    weekday    integer PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
    open_time  time,
    close_time time
);

INSERT INTO public.business_hours (weekday, open_time, close_time) VALUES
    (0, '14:00', '18:00'), (1, '16:00', '18:00'), (2, '16:00', '18:00'), (3, '16:00', '18:00'),
    (4, '16:00', '18:00'), (5, '16:00', '18:00'), (6, '10:00', '18:00')
ON CONFLICT (weekday) DO NOTHING;

-- CMS: catalog marketing content in the DB
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS features jsonb;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.add_ons  ADD COLUMN IF NOT EXISTS features jsonb;
ALTER TABLE public.add_ons  ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.add_ons  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
