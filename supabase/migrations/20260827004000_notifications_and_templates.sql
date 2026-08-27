-- Notifications settings (including MULTIPLE owner alert recipients) and
-- editable message templates.

-- Which emails send, and where owner alerts go. notification_emails is a
-- list: an owner can copy a partner or an office address. Empty list = fall
-- back to businesses.contact_email so nothing silently stops sending.
alter table public.business_settings
  add column if not exists notification_emails      text[] not null default '{}',
  add column if not exists email_customer_confirmation boolean not null default true,
  add column if not exists email_customer_reminder     boolean not null default true,
  add column if not exists email_customer_followup     boolean not null default true,
  add column if not exists email_owner_new_booking     boolean not null default true,
  add column if not exists email_owner_reminder        boolean not null default true,
  add column if not exists push_enabled                boolean not null default true;

-- Prefilled texts the owner sends customers from the job screen. Seeded per
-- business on first open; fully editable; {{placeholders}} are substituted
-- client-side from the booking.
create table public.message_templates (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  key         text not null,
  label       text not null,
  body        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (business_id, key)
);

create index message_templates_business_idx on public.message_templates (business_id);

create trigger message_templates_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

alter table public.message_templates enable row level security;
alter table public.message_templates force row level security;

-- Staff SEND these texts from the job screen, so staff may read them;
-- only owners may edit.
create policy message_templates_member_select on public.message_templates
  for select to authenticated
  using (business_id in (select public.current_business_ids()));
create policy message_templates_owner_write on public.message_templates
  for all to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));
