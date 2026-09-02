-- Roadmap 2.11, step 6, stage 6 — THE FAQ'S STORAGE, AND ONLY ITS STORAGE.
--
-- The owner's own split, answering the step 6 approval page's §3b: "the FAQ
-- gets its storage now and its screen later". So this migration exists with
-- no writer and no reader on purpose, and that is a decision rather than an
-- oversight — a column nothing maintains is normally exactly what this repo
-- flags (`customers.completed_washes_count`, found dead in stage 5). The
-- difference is that this one is dated: the screen is designed
-- (docs/dashboard-screen-designs-2026-08-31.md §11) and waits behind a
-- deliberate line, not behind nobody remembering.
--
-- WHY jsonb AND NOT A TABLE, which is the same reasoning roadmap 2.8c wrote
-- for `travel_zones` and 2.8b for `vehicle_sizes`: the list is small (a
-- detailer has three to ten), ordered, entirely tenant-defined, and nothing
-- ever points a foreign key at one question. A table would buy referential
-- integrity nothing needs and cost a join on the public profile read.
alter table public.business_settings
  -- [{ id, q, a }] — the detailer's own words. "They're the detailer" was the
  -- owner's answer to who writes these; AI may polish an answer that exists
  -- and never generate one.
  add column faqs jsonb not null default '[]'::jsonb,
  -- Separate from an empty list, because "I have not written any yet" and "I
  -- do not want this section on my page" are two different answers and the
  -- booking page has to be able to tell them apart.
  add column faq_enabled boolean not null default false;
