-- Support the ported booking engine:
--   * business contact/identity fields the emails and receipts need
--   * the site-wide sale (was business_info.site_discount_* in the old app)
--   * promo once_per_customer parity with the old schema
--   * a per-business promo usage counter RPC
--   * multi-tenant reminder due-ness functions (per-business settings AND
--     per-business timezone — the old ones hardcoded America/Los_Angeles)

alter table public.businesses add column if not exists contact_email  text;
alter table public.businesses add column if not exists contact_phone  text;
alter table public.businesses add column if not exists dropoff_address text;
alter table public.businesses add column if not exists service_area   text;

alter table public.business_settings add column if not exists site_discount_active  boolean not null default false;
alter table public.business_settings add column if not exists site_discount_percent numeric not null default 0 check (site_discount_percent >= 0 and site_discount_percent <= 100);
alter table public.business_settings add column if not exists site_discount_label   text;

alter table public.promo_codes add column if not exists once_per_customer boolean not null default false;

-- Best-effort usage counter bumped by create-booking after a successful
-- insert. Service-role only — not a client-callable surface.
create or replace function public.increment_promo_usage(p_business_id uuid, p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.promo_codes
  set times_used = times_used + 1, updated_at = now()
  where business_id = p_business_id and code = p_code;
$$;

revoke execute on function public.increment_promo_usage(uuid, text) from public, anon, authenticated;
grant execute on function public.increment_promo_usage(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Reminder sweep due-ness. All timing values come from business_settings and
-- all local-time math uses the business's own timezone. Each returns booking
-- rows joined with what the sweep needs to address the message.
-- ---------------------------------------------------------------------------

-- A booking is due for its reminder when:
--   * evening-before rule (if enabled): the job starts at or before
--     evening_before_latest_start local time, and it is now past
--     evening_before_send_time on the previous local day; otherwise
--   * it is now within customer_reminder_lead_minutes of the start.
-- Guarded per-target by the sent-marker so each reminder goes out once.
create or replace function public.get_bookings_due_for_reminder(target text)
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $$
  select b.*
  from public.bookings b
  join public.businesses biz on biz.id = b.business_id
  join public.business_settings s on s.business_id = b.business_id
  where b.status <> 'cancelled'
    and b.deleted_at is null
    and b.start_at > now()
    and case
      when target = 'owner' then b.owner_reminder_sent_at is null
      else b.customer_reminder_sent_at is null and b.customer_email is not null
    end
    and now() >= case
      when s.evening_before_enabled
           and (b.start_at at time zone biz.timezone)::time <= s.evening_before_latest_start
      then (((b.start_at at time zone biz.timezone)::date - 1) + s.evening_before_send_time) at time zone biz.timezone
      else b.start_at - make_interval(mins => s.customer_reminder_lead_minutes)
    end;
$$;

create or replace function public.get_bookings_due_for_nudge()
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $$
  select b.*
  from public.bookings b
  join public.business_settings s on s.business_id = b.business_id
  where b.status <> 'cancelled'
    and b.deleted_at is null
    and b.owner_nudge_sent_at is null
    and b.start_at > now()
    and b.start_at <= now() + make_interval(mins => s.owner_nudge_lead_minutes);
$$;

create or replace function public.get_bookings_due_for_wrapup_nudge()
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $$
  select b.*
  from public.bookings b
  join public.business_settings s on s.business_id = b.business_id
  where b.status <> 'cancelled'
    and b.deleted_at is null
    and b.finalized_at is null
    and b.owner_wrapup_nudge_sent_at is null
    and b.end_at > now()
    and b.end_at <= now() + make_interval(mins => s.wrapup_nudge_lead_minutes);
$$;

create or replace function public.get_bookings_due_for_finalize_nudge()
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $$
  select b.*
  from public.bookings b
  join public.business_settings s on s.business_id = b.business_id
  where b.status <> 'cancelled'
    and b.deleted_at is null
    and b.finalized_at is null
    and b.owner_finalize_nudge_sent_at is null
    and b.end_at + make_interval(mins => s.finalize_nudge_delay_minutes) <= now()
    and b.end_at > now() - interval '2 days';  -- don't nag about ancient history
$$;

-- The sweep runs with the service role; these are not client surfaces.
revoke execute on function public.get_bookings_due_for_reminder(text) from public, anon, authenticated;
revoke execute on function public.get_bookings_due_for_nudge() from public, anon, authenticated;
revoke execute on function public.get_bookings_due_for_wrapup_nudge() from public, anon, authenticated;
revoke execute on function public.get_bookings_due_for_finalize_nudge() from public, anon, authenticated;
grant execute on function public.get_bookings_due_for_reminder(text) to service_role;
grant execute on function public.get_bookings_due_for_nudge() to service_role;
grant execute on function public.get_bookings_due_for_wrapup_nudge() to service_role;
grant execute on function public.get_bookings_due_for_finalize_nudge() to service_role;
