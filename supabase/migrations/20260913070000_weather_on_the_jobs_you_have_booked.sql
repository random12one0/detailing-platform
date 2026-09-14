-- WEATHER BECOMES A FACT ABOUT A BOOKING — Andrew, 2026-09-13.
--
-- *"The weather thing wasn't supposed to be, oh, so I could see what the
-- weather was today. It was so you could see the weather on your upcoming
-- bookings."*
--
-- The first build put today's sky under the date on Today, which is a worse
-- version of the app already on the detailer's phone. What this product can
-- say that a weather app cannot is *what the sky is doing over the work you
-- have booked*, and that needs one thing a detailer has to choose: WHEN IT IS
-- WORTH SAYING ANYTHING. His examples were *"hey, it's set to rain this day"*
-- and *"hey, this is gonna be a hundred and ten degrees"* — both a threshold,
-- and 110 is a summer Tuesday in Phoenix and an emergency in Seattle.
--
-- ── WHY JSONB AND NOT SIX COLUMNS ──────────────────────────────────────────
-- Same reasoning `payment_methods` (20260911001000) and `setup`
-- (20260902002000) already carry: these values have no identity, nothing joins
-- to them, nothing queries them, and they are read all at once by one screen.
-- Six columns would be six migrations the first time he wants a seventh kind
-- of weather worth warning about.
--
-- ── NULL MEANS THE DEFAULTS, WHOLE ─────────────────────────────────────────
-- Not field by field. `app/src/lib/weather.js` owns what a sensible warning
-- is, and a half-merged row — his hot threshold beside a default he never saw
-- — is a setting nobody chose that looks exactly like one somebody did. This
-- is the same rule `platform_settings.prices` takes for the price table.
--
-- ── AND THE SHAPE IS ALL SQL ASSERTS ───────────────────────────────────────
-- It is an object and it is small. What a threshold MEANS is decided in
-- `weather.js`, which is the one place that also decides what to do with it;
-- splitting that judgement across a CHECK constraint is the two-places problem
-- this repo keeps paying for.
alter table public.business_settings
  add column if not exists weather_prefs jsonb;

alter table public.business_settings
  drop constraint if exists business_settings_weather_prefs_shape;

alter table public.business_settings
  add constraint business_settings_weather_prefs_shape check (
    weather_prefs is null
    or (jsonb_typeof(weather_prefs) = 'object' and length(weather_prefs::text) <= 2000)
  );

comment on column public.business_settings.weather_prefs is
  'Per-booking weather warnings. NULL = the defaults in app/src/lib/weather.js, WHOLE. See 20260913070000.';
