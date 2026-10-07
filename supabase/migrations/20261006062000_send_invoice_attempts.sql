-- ROADMAP 6.4 — A REPEATED "SEND INVOICE" LEAVES ONE EMAIL. The table behind the client key.
--
-- `send-invoice` writes no row, so a retry cannot be told from a deliberate second send by anything the
-- server holds. The client makes a UUID per intent to send and repeats it on a retry; this table remembers
-- which (booking, key) pairs have been claimed, what became of each, and what the first one answered
-- (`_shared/sendInvoiceClaim.ts` is the state machine: sending -> sent | failed).
--
-- WHAT IS STORED IS THE KEY, THE STATE AND ONE BOOLEAN. No customer name, address or email: the booking's id
-- is the only handle, so a row can be read by nobody and still mean nothing.
--
-- LOCKED THE WAY `action_log` AND `job_heartbeats` ARE: row-level security enabled and forced with no policy,
-- plus a revoke from the two browser roles, so a detailer's browser never reaches it. The function writes it
-- with the service role.
--
-- ON DELETE CASCADE from the booking, deliberately: `delete-customer` removes a forgotten customer's bookings
-- and a row that outlived its booking would be a key for nothing. It is the one cascade here because the table
-- carries nothing worth keeping once the booking is gone.
--
-- APPLYING IT IS NOT REQUIRED FOR THE FUNCTION TO KEEP WORKING: with the table absent the function sends as it
-- always has and answers `idempotent: false`. Apply it and the repeat press is refused.
create table if not exists public.send_invoice_attempts (
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  idempotency_key uuid not null,
  business_id     uuid not null,
  state           text not null check (state in ('sending', 'sent', 'failed')),
  response        jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (booking_id, idempotency_key)
);

alter table public.send_invoice_attempts enable row level security;
alter table public.send_invoice_attempts force row level security;
revoke all on public.send_invoice_attempts from anon, authenticated;

comment on table public.send_invoice_attempts is
  'Roadmap 6.4. One row per (booking, client key) for send-invoice: sending, sent or failed, and what the first '
  'send answered. Service-role only. Holds no customer data.';
