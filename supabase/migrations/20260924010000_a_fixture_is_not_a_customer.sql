-- ROADMAP 1.3 / 0.3's CLIENT-LIST HALF — A FIXTURE IS NOT A CUSTOMER, AND A
-- DETAILER'S OWN LIST MUST NOT COUNT ONE. 2026-09-24.
--
-- ---------------------------------------------------------------------------
-- WHAT WAS WRONG
-- ---------------------------------------------------------------------------
-- The BACK-OFFICE half of 0.3 has existed since before 2026-09-23:
-- `businesses.is_demo`, read by `platform-admin`, rendered as a `demo` flag
-- and stripped out of every count the platform screen computes.
--
-- **The CLIENT-LIST half did not exist at all.** There was no `is_test` or
-- anything like it anywhere on the customer or booking side, so a detailer's
-- own Clients screen had no flag, no badge and no default-to-real filter.
-- Measured on `demo-detail`, 2026-09-24: **16 customers, of which 3 are
-- droppings left behind by test runs** — `zone-muew68al`,
-- `ROADMAP 2.8 selected 2026-09-23`, `ROADMAP 2.8 Address Test 2026-09-23`,
-- all three with phone numbers of the shape `(555) 013-3` that no phone can
-- dial. All three had **never had a completed job**, which is what
-- `lib/client-list.js` calls "gone quiet", so **all three were inside the
-- screen's headline figure: "8 gone quiet · 3 months" where the true answer
-- for real customers is 5.**
--
-- ---------------------------------------------------------------------------
-- FLAG, DO NOT DELETE — ANDREW'S RULING, AND IT IS BINDING
-- ---------------------------------------------------------------------------
-- About sixty checks in `tests/` work by signing into a seeded practice
-- business and clicking through it. They need the fake rows to exist. **A
-- check that cannot run prints something that looks very like a pass**, so
-- deleting fixtures would trade a tidy list for the loss of the net under
-- every other item. Nothing below deletes a row.
--
-- ---------------------------------------------------------------------------
-- WHY A COLUMN AND NOT A RULE THE SCREEN APPLIES
-- ---------------------------------------------------------------------------
-- A browser-side rule ("hide anyone whose email ends `.test`") needs no
-- migration and is the obvious shortcut. It is refused here for one reason:
-- **the demo tenant's thirteen seeded personas are `@example.com`, which is
-- just as reserved as `.test`** — so any rule wide enough to catch a real
-- dropping is one edit away from emptying the demo of its own content, and
-- any rule narrow enough to spare them is a spelling, not a fact. Which rows
-- are fixtures is something somebody KNOWS, not something a string match
-- derives. It belongs in a column.
--
-- ---------------------------------------------------------------------------
-- WHAT THE BACKFILL CATCHES, AND WHAT IT DOES NOT — SAID OUT LOUD
-- ---------------------------------------------------------------------------
-- `.test`, `.invalid` and `.localhost` are reserved by RFC 2606 and can never
-- be delivered to, so an address in one is never a real customer's. So is
-- `delivered@resend.dev`, Resend's documented sink.
--
-- **It does NOT catch a fixture with an ordinary-looking address**, and there
-- is at least one shape of those in this repo's history — the "Smoke TPMOY"
-- row that ROADMAP 1.3 was written about, whose mark was a broken PHONE
-- rather than an email. The column is writable precisely so that one can be
-- flagged by hand without a second migration.
--
-- ponytail: this backfill runs once. A dropping created AFTER it lands is not
-- flagged, because the row is inserted by the `create-booking` edge function
-- and nothing in `scripts/` or `app/src` can reach that insert. Closing that
-- needs one line in the function — out of this item's scope on purpose, and
-- named here rather than left to be discovered.

alter table public.customers
  add column if not exists is_test boolean not null default false;

comment on column public.customers.is_test is
  'Row exists to make a check run, not because a person booked. Hidden from a '
  'detailer''s Clients list and every count on it unless they ask to see it. '
  'Never a reason to delete the row — roughly sixty checks sign into these.';

update public.customers
   set is_test = true
 where is_test = false
   and (
        email ilike '%.test'
     or email ilike '%.invalid'
     or email ilike '%.localhost'
     or lower(email) = 'delivered@resend.dev'
   );
