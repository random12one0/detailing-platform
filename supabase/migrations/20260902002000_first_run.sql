-- Roadmap 2.11, step 6, stage 7 — WHERE FIRST RUN REMEMBERS ITSELF.
--
-- One column, three facts, and the reason it is one column is the same
-- reasoning `faqs` and `travel_zones` carry: the shape is small, entirely
-- per-business, and nothing will ever point a foreign key at it. Three
-- boolean/array columns would be three migrations' worth of surface for a
-- thing the product reads once per sign-in.
--
--   done       the step keys the detailer has actually FINISHED. Not the ones
--              they passed. `docs/dashboard-component-inventory-2026-08-31.md`
--              §1b: a segment fills when a step is COMPLETED, never when it is
--              passed, because Business carries the same number in words and
--              the two must never disagree.
--   seen       the setup form has opened itself once. Without it, a detailer
--              who skips all seven meets it again on the next sign-in — it
--              would still be the state "nothing is set up".
--   dismissed  they asked it to stop. Business's row is gone for good.
--
-- WHAT IS DELIBERATELY *NOT* IN HERE: five of the seven steps ask for
-- something the database can already answer — a service exists or it does
-- not, hours are set or they are not, a colour is chosen or it is null. Those
-- are DERIVED at read time (`setupProgress` in app/src/components/SetupForm.jsx)
-- and `done` only has to carry what nothing else can say. That is what stops a
-- business set up through the settings screens from being told it has done
-- nothing, and it is why this column starts empty rather than being
-- backfilled.
alter table public.business_settings
  add column setup jsonb not null default '{"done": [], "seen": false, "dismissed": false}'::jsonb;

-- EVERY BUSINESS THAT ALREADY EXISTS HAS HAD ITS FIRST RUN. Without this the
-- form would open itself on the next sign-in for every detailer on the
-- platform, including the demo the verification scripts drive — a setup form
-- ambushing an established business is the exact opposite of what it is for,
-- and it is also the one thing that would make a clean sweep impossible to
-- take. New rows keep the default above and meet it as intended.
update public.business_settings
   set setup = jsonb_set(setup, '{seen}', 'true'::jsonb);
