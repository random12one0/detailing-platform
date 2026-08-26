-- CMS-managed gallery: single photos + before/after pairs, owner-editable by URL.
-- Applied live earlier this session; recorded here so the repo matches the database.
CREATE TABLE IF NOT EXISTS public.gallery_images (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind        text NOT NULL DEFAULT 'single' CHECK (kind IN ('single', 'before_after')),
    image_url   text,   -- used when kind = 'single'
    before_url  text,   -- used when kind = 'before_after'
    after_url   text,   -- used when kind = 'before_after'
    caption     text,
    sort_order  integer NOT NULL DEFAULT 0,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);
-- RLS is configured by the lockdown migration (public read, admin write).
