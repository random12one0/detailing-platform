-- ROADMAP 2.15a — A LENGTH BOUND IN THE DATABASE FOR THE FIVE TENANT NAMES.
--
-- 2.15a's table: five strings a detailer types, each landing somewhere that
-- reserves space for it, **and not one of them bounded anywhere**. The browser
-- half is done — `maxLength={60}` is on `Plans.jsx:283`, `Catalog.jsx:732`,
-- `Catalog.jsx:777` (one shared editor, two columns) and
-- `BusinessInfo.jsx:260` since 2026-10-02. This is the other half, and it
-- matters because **two of the boxes that write `businesses.name` still have no
-- cap at all** (`CreateBusiness.jsx:138`, the signup screen every new detailer
-- meets, and `AdminPage.jsx:984`, the back office's own create form), and
-- because `maxLength` is a property of ONE input element: it says nothing about
-- an edge function, a script, a SQL session or a future screen.
--
-- `platform-admin`'s `create` action passes `body.name` straight into the
-- insert (`index.ts:814`) and `_shared/newBusiness.ts:48` trims it and refuses
-- only an EMPTY name. So today an arbitrarily long business name can be written
-- by anything that can call either path, and it lands in the `<h1>` of the
-- booking page, the confirmation and the manage screen.
--
-- ---------------------------------------------------------------------------
-- THE NUMBER IS 60, AND IT IS NOT A NEW NUMBER
-- ---------------------------------------------------------------------------
-- It is the cap already on all five boxes, which came from `Plans.jsx`'s
-- long-standing `maxLength={60}` — the manager's ruling, 2026-10-02: *"it is
-- not a new number … picking the number the neighbouring box already uses is a
-- smaller act than leaving four boxes with no limit at all."*
--
-- **And 60 is the length that was actually rendered and measured.** 2.15a's own
-- sweep (`bk-bar-clearance.mjs`, 137 targets, 943 assertions) put all five at
-- the 60-character cap through 4 customer emails x 5 widths and the two
-- settings screens at 320 / 392 / 768 / 1440 / 1920: nothing escaped its box in
-- the emails, nothing was truncated, the documents were over by 0px, and the
-- screens truncated with an ellipsis and still took a press. **The one thing
-- still open at 60 is the business name overflowing by 5px at 1440 and 1920**,
-- recorded in the entry as measured-but-not-eyeballed. So 60 is a figure with a
-- sweep behind it, which is the opposite of a figure somebody liked.
--
-- **A TIGHTER DATABASE CAP THAN THE SCREEN'S WOULD BE A BUG**, and a looser one
-- would not be a guard. Equal is the only defensible choice: the column refuses
-- exactly what no box can produce.
--
-- ---------------------------------------------------------------------------
-- `char_length`, NEVER `octet_length` — AND THIS PRODUCT IS BILINGUAL
-- ---------------------------------------------------------------------------
-- `char_length` counts characters. `octet_length` counts bytes, and in UTF-8
-- every accented character is two: *“Detallado Rápido de Automóviles”* is 31
-- characters and 33 bytes (two accents, one extra byte each). A 60-BYTE bound would refuse Spanish names a
-- Spanish-speaking detailer typed into a box that accepted them, and the
-- existing data cannot reveal that — every value in all five columns today is
-- pure ASCII, so bytes and characters are equal in every row (measured below).
-- **A bound that is correct on the data you have and wrong on the data you are
-- for is this repo's recurring shape.**
--
-- The browser's `maxLength` counts UTF-16 code units, which is never FEWER than
-- the character count, so `char_length(…) <= 60` can never refuse a value a
-- capped box allowed. (An emoji costs 2 units in the box and 1 character here.)
-- `20260831001000_catalog_groups_and_tenant_shapes.sql:152` set the precedent
-- with `char_length(vehicle_size) between 1 and 60`; this follows it exactly.
--
-- ---------------------------------------------------------------------------
-- `between 1 and 60`, SO AN EMPTY NAME GOES TOO — CHECKED AGAINST LIVE DATA
-- ---------------------------------------------------------------------------
-- Read-only against `kguqylyzgyzfktkfnhjb` on 2026-10-07, before writing this
-- file, so that no existing row can be made illegal by applying it:
--
--   | column                | rows | longest | shortest | >60 | nulls | empty |
--   |-----------------------|------|---------|----------|-----|-------|-------|
--   | businesses.name       |   17 |      48 |        9 |   0 |     0 |     0 |
--   | services.name         |   28 |      22 |        6 |   0 |     0 |     0 |
--   | add_ons.name          |    7 |      21 |        5 |   0 |     0 |     0 |
--   | service_groups.name   |    4 |      10 |        7 |   0 |     0 |     0 |
--   | plans.name            |    4 |      21 |       11 |   0 |     0 |     0 |
--
-- **Nothing is within 12 characters of the cap.** No row violates it, no row is
-- NULL, none is empty and none has untrimmed whitespace, so the lower bound of
-- 1 costs nothing today and refuses a nameless service tomorrow.
--
-- `char_length(null) between 1 and 60` is NULL, and a CHECK only rejects FALSE,
-- so a nullable column stays nullable. **Nothing here changes nullability, a
-- type, a default or a policy.**
--
-- ---------------------------------------------------------------------------
-- WHAT IS DELIBERATELY NOT HERE
-- ---------------------------------------------------------------------------
-- **`business_branding.tagline`, `business_branding.about_copy` and
-- `businesses.service_area` are NOT capped**, and that is 2.15a's own measured
-- ruling rather than an omission: the length ladder in
-- `bk-bar-clearance.mjs --ladder` took them to 40, 60, 80, 120, 200 and 400
-- characters through the real render path and found `tagline` clean to 400 at
-- 1000 / 1440 / 1920, `service_area` clean to 400 at 320 / 392, and
-- `about_copy` never rendering on that page at any length. **Nothing breaks, so
-- there is no measurement to cap from** — and `about_copy` belongs to the
-- tenant site, which that instrument cannot reach and does not pretend to.
-- (Live longest today: tagline 29, about_copy 58, service_area 22.)
--
-- Capping them would be picking a number, which is what 2.15a says a session
-- does not get to do.
--
-- ---------------------------------------------------------------------------
-- WHAT APPLYING THIS COSTS, SAID BEFORE IT IS APPLIED
-- ---------------------------------------------------------------------------
-- A caller that writes a name longer than 60 gets a constraint violation —
-- Postgres `23514`, which Supabase surfaces as a 400 with the constraint's
-- name in it. **That is a worse sentence than a screen's own refusal**, so the
-- browser cap is the first line and this is the floor under it. The two
-- uncapped boxes named at the top are therefore a REAL consequence of applying
-- this file: a 61-character name typed at signup goes from silently accepted to
-- a raw database error. **They are specified for Lane A under 2.15a and should
-- land before or with this migration, not after it.**
--
-- Applying is Andrew's. This file is written, not run.

alter table public.businesses
  add constraint businesses_name_len
    check (char_length(name) between 1 and 60);

alter table public.services
  add constraint services_name_len
    check (char_length(name) between 1 and 60);

alter table public.add_ons
  add constraint add_ons_name_len
    check (char_length(name) between 1 and 60);

alter table public.service_groups
  add constraint service_groups_name_len
    check (char_length(name) between 1 and 60);

alter table public.plans
  add constraint plans_name_len
    check (char_length(name) between 1 and 60);
