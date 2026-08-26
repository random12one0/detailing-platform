-- Reviews/testimonials (CMS-managed). Applied live earlier this session; recorded
-- here so the repo matches the database.
CREATE TABLE IF NOT EXISTS public.testimonials (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author      text NOT NULL,
    quote       text NOT NULL,
    rating      int DEFAULT 5,
    source      text,
    sort_order  int DEFAULT 0,
    is_active   boolean DEFAULT true,
    created_at  timestamptz DEFAULT now()
);
-- RLS is configured by the lockdown migration (public read, admin write).
