-- THE WEBSITE BRIEF, ANSWERED BY THE DETAILER, STORED ONCE.
--
-- Roadmap 9.3. The owner, 2026-09-09: *"as soon as they sign up and pay… it
-- shows this, that way I have all the information to get their website
-- built."* Until now the brief came from him in his own words, per
-- `docs/tenant-site-kit.md` § 5, which does not scale past the first client.
--
-- **ONE ROW PER BUSINESS AND THE ANSWERS ARE ONE JSONB COLUMN, deliberately.**
-- The alternative is ~79 typed columns for a form whose questions are still
-- being rewritten after the first three detailers take it
-- (`docs/tenant-site-intake-form.md` § 11 asks for exactly that), and every
-- rewrite would then be a migration. Nothing in the product BRANCHES on an
-- answer — it is read by a person building a site — so there is no query that
-- wants a column, and `answers ? 'A9'` is enough for the one report that
-- might. **If something ever branches on an answer, promote that one key to a
-- column; do not promote the lot.**
--
-- **AND NOTHING HERE DUPLICATES THE DASHBOARD.** The form asks nothing the
-- product already stores — services, prices, hours, colour, gallery, reviews,
-- FAQs, social links (`docs/tenant-site-intake.md` § 1). A second copy of a
-- price is a price that goes stale the day it is changed in a pocket, which is
-- the one thing this product promises a detailer they can do.
--
-- **IT IS A PLAIN RLS TABLE AND NOT AN EDGE FUNCTION**, which is the split
-- `lib/api.js` already documents: consequential writes go through functions,
-- settings-style writes go straight to the database. Nothing here is charged,
-- booked, emailed or priced. It is a form a business fills in about itself.

create table if not exists public.site_intake (
  business_id  uuid primary key references public.businesses(id) on delete cascade,
  -- { "A1": "...", "F3": ["Card","Cash"], "A1::n": "a note" }
  answers      jsonb not null default '{}'::jsonb,
  -- Where they were when they last closed it, so re-entering resumes rather
  -- than restarting. A form somebody has to scroll back through is a form
  -- they finish once.
  step         int not null default 0,
  -- Null until they press the last button. The difference matters: a
  -- half-answered draft is not a brief, and building a site from one is how
  -- a detailer gets a website that claims something they never said.
  submitted_at timestamptz,
  dismissed    boolean not null default false,
  updated_at   timestamptz not null default now()
);

alter table public.site_intake enable row level security;

-- Staff can SEE it (they may be the one who fills it in at the desk) and only
-- an owner can write it, which is exactly `business_branding`'s split.
create policy site_intake_member_select on public.site_intake
  for select to authenticated
  using (business_id in (select public.current_business_ids()));

create policy site_intake_owner_insert on public.site_intake
  for insert to authenticated
  with check (public.is_business_owner(business_id));

create policy site_intake_owner_update on public.site_intake
  for update to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- NO DELETE POLICY, ON PURPOSE. A brief is a record of what a detailer told
-- us their site may claim, and the site outlives the form. It goes when the
-- business goes, by the cascade above.

comment on table public.site_intake is
  'The website brief a detailer answers after signing up. One jsonb of answers keyed by question id; see docs/tenant-site-intake-form.md.';
