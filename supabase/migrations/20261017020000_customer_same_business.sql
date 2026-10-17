-- ROADMAP 97.72 — A BOOKING, A PLAN MEMBERSHIP AND A MAINTENANCE DEADLINE NAME A CUSTOMER OF THEIR OWN BUSINESS.
--
-- `bookings.customer_id`, `plan_members.customer_id` and `maintenance_deadlines.customer_id` pointed at
-- `customers(id)` alone, and each table's write policy checks only the row's own `business_id`. So a detailer in
-- business A who knew a customer id of business B could write a row carrying A's business_id and B's customer: the
-- policy passed and the foreign key passed. The server then reads that customer by id alone —
-- `send-owner-reminders` emailed B's customer A's "coating due" message under A's name, and `plan-link` handed B's
-- customer's name and email to whoever held A's plan link. The same gap 20260907000600, 20261017000000 and
-- 20261017010000 closed for a booking's children, closed here the same way: a composite foreign key on
-- `(customer_id, business_id)` against a new `customers unique (id, business_id)`.
--
-- WHICH TABLES, AND WHY ONLY THESE THREE. These are every table with both columns that a signed-in detailer can
-- write: `bookings` by INSERT (the fleet job in BulkJobModal.jsx; UPDATE was revoked by 20261006040000),
-- `plan_members` under `plan_members_money_write`, `maintenance_deadlines` under its member insert/update policies.
-- `email_sends` also carries both columns, but the browser cannot write it at all (20260916010000 revokes insert,
-- update and delete and gives it no write policy); its `customer_id` is filled by `send-email` from a lookup
-- already scoped to the business. It gets no key here.
--
-- THE DELETE RULES ARE COPIES OF EACH TABLE'S EXISTING ONE. `plan_members` and `maintenance_deadlines` cascade
-- from the customer today, so their pair keys cascade. `bookings.customer_id` is `no action` today (deleting a
-- customer with bookings goes through `forget_customer`, which clears the column first), so its pair key is
-- `no action` too. `no action` rather than `restrict` because deleting a BUSINESS cascades to `customers` and
-- `bookings` in one statement, in an order Postgres does not promise; `no action` is checked at the end of it.
-- A booking with no customer is not checked, which is right: a fleet job may name none.
--
-- The old single-column foreign keys stay; they are redundant, not wrong.
--
-- `tests/customer-same-business-sql.test.mjs` applies this file to a throwaway in-process Postgres. Applying it
-- to the live database is Andrew's.

-- 1 · Existing rows are checked BEFORE any constraint is added, and a mismatch is refused with its count rather
-- than repaired.
do $$
declare
  n_bookings bigint;
  n_members bigint;
  n_deadlines bigint;
begin
  select count(*) into n_bookings from public.bookings c
    join public.customers p on p.id = c.customer_id where p.business_id <> c.business_id;
  select count(*) into n_members from public.plan_members c
    join public.customers p on p.id = c.customer_id where p.business_id <> c.business_id;
  select count(*) into n_deadlines from public.maintenance_deadlines c
    join public.customers p on p.id = c.customer_id where p.business_id <> c.business_id;
  if n_bookings + n_members + n_deadlines > 0 then
    raise exception 'rows whose business is not their customer''s: bookings %, plan_members %, maintenance_deadlines % — resolve these before applying',
      n_bookings, n_members, n_deadlines;
  end if;
end
$$;

-- 2 · The target. `id` is already unique, so no existing row can break this.
alter table public.customers
  add constraint customers_id_business_key unique (id, business_id);

-- 3 · An index behind each composite foreign key.
create index bookings_customer_business_idx
  on public.bookings (customer_id, business_id);
create index plan_members_customer_business_idx
  on public.plan_members (customer_id, business_id);
create index maintenance_deadlines_customer_business_idx
  on public.maintenance_deadlines (customer_id, business_id);

-- 4 · The rule itself.
alter table public.bookings
  add constraint bookings_customer_same_business
  foreign key (customer_id, business_id) references public.customers (id, business_id);
alter table public.plan_members
  add constraint plan_members_customer_same_business
  foreign key (customer_id, business_id) references public.customers (id, business_id) on delete cascade;
alter table public.maintenance_deadlines
  add constraint maintenance_deadlines_customer_same_business
  foreign key (customer_id, business_id) references public.customers (id, business_id) on delete cascade;
