-- A GUIDE DISMISSED ONCE IS DISMISSED EVERYWHERE — Andrew, 2026-09-13, using
-- the product: *"I keep having this glitch that keeps showing me the tour of
-- every single page. Like, every time I go back to it — or not every time, but
-- it keeps giving me the tour even though I've already said skip."*
--
-- ---------------------------------------------------------------------------
-- WHY A TABLE AT ALL, WHEN THE FLAG ALREADY EXISTS
-- ---------------------------------------------------------------------------
-- It exists in `localStorage["dp.tours"]`, and `App.jsx` says in as many words
-- why: *"a fact about this browser, not about the account… a second device
-- gets the tour once, which is right — it is a tour of a SCREEN, and that
-- screen is a different shape on a phone and at a desk."*
--
-- That reasoning is sound and it is not what he asked for. A skip on the
-- laptop is worth nothing on the phone, nothing in a private window, and
-- nothing on a second origin — and `localhost:5173` and the live domain are
-- two separate stores, which is most of how he meets it. **His instruction is
-- that a dismissal be final for the PERSON.** So the device flag stays as the
-- fast path and this is the one that outranks it.
--
-- ---------------------------------------------------------------------------
-- THE SHAPE: A ROW THAT EXISTS, AND NOTHING ELSE
-- ---------------------------------------------------------------------------
-- No list of names, no booleans, no array to merge. **A row here means this
-- person is done being shown around; no row means they have never said so.**
--
-- The list was the first design and it is what caused the bug. Six guides meant
-- six flags, `markTourSeen` wrote exactly the one on screen, and pressing Skip
-- on the first-run guide left five more armed — one per tab, arriving 900ms
-- after the first press of each. Measured: `tests/tours.test.mjs` § 6c.
--
-- **AND IT MAKES SKIP AND FINISH THE SAME EVENT, which was his other half.**
-- There is one row and one way to write it, so there is no version of this
-- where the two doors record different things.
--
-- **A GUIDE THAT LEAVES FOR WANT OF STEPS STILL WRITES NOTHING** (decision 6,
-- `Walkthrough.jsx` — a dashboard with nothing on it gets the guide the first
-- day there is something to point at). That is a caller rule, not a schema one,
-- and it survives unchanged: the caller simply does not insert.
--
-- **AND *SHOW ME AROUND* IS NOT GATED ON THIS.** `tours.test.mjs` § 3 already
-- requires that a guide asked for by hand runs whether or not it has been seen,
-- which is the whole of "final" being safe: the gear is always the way back in.
-- That is why there is no delete policy here — nothing needs to un-say it.

create table if not exists public.user_tours (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  dismissed_at timestamptz not null default now()
);

alter table public.user_tours enable row level security;
alter table public.user_tours force  row level security;

-- SELECT AND INSERT, AND DELIBERATELY NOTHING ELSE. There is no column worth
-- updating — the row IS the fact — so `update` would only ever be a way to
-- rewrite when you said it. A person reads and writes their own row and cannot
-- see that anyone else has one: `user_id = auth.uid()` on both sides.
create policy user_tours_self_select on public.user_tours
  for select to authenticated using (user_id = auth.uid());

create policy user_tours_self_insert on public.user_tours
  for insert to authenticated with check (user_id = auth.uid());

-- `anon` IS TAKEN OFF THE TABLE OUTRIGHT, not left to the absence of a policy.
-- Supabase grants both roles full privileges on everything in `public` by
-- default, and `20260907003000_column_revokes_actually_apply.sql` is this
-- repo's account of what that default costs when somebody later writes a
-- policy without checking what grant it inherits.
revoke all on public.user_tours from anon;
