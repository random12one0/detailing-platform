-- ROADMAP 97.18 (C-M9) — TWO BOOKINGS SENT AT ONCE MUST NOT BOTH BEAT THE DAILY CAP OR THE BUFFER.
--
-- `validateSlot` (supabase/functions/_shared/slotValidation.ts) reads the day and then the caller
-- writes, in two separate requests. Two bookings arriving together both read a day with room in it and
-- both save. `bookings_no_overlap` only refuses a TRUE overlap, so a sixth job on a five-job day, or a
-- job 20 minutes after another on a 45-minute buffer, gets in.
--
-- The fix: the three callers that run validateSlot (create-booking, reschedule-booking, update-booking)
-- write through the two functions below, which take a lock on that business's LOCAL DAY, re-run the same
-- two rules, and write, all in one transaction. The second of two racing writes waits for the first to
-- commit, then sees it.
--
-- NOT A TRIGGER, ON PURPOSE: dozens of scripts and test suites write bookings straight into the seeded
-- demo business, and the dashboard's bulk jobs and imports bypass validateSlot by design. A trigger would
-- start refusing all of them; this only holds the writes that already promise the rule.
--
-- THE RULE IS validateSlot's, LINE FOR LINE: the same local day by the business's timezone; not cancelled,
-- not soft-deleted, not a bulk job; the booking being moved excluded; refused at `count >= cap`; buffer
-- bounds closed (touching counts). Settings default as getSettings does (buffer 60, no cap).

create or replace function public.booking_day_rules_check(
  p_business uuid, p_start timestamptz, p_end timestamptz, p_exclude uuid default null)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_tz text;
  v_cap integer;
  v_buf integer;
  v_day date;
  v_n integer;
begin
  select b.timezone, s.max_bookings_per_day, coalesce(s.buffer_minutes, 60)
    into v_tz, v_cap, v_buf
    from public.businesses b
    left join public.business_settings s on s.business_id = b.id
   where b.id = p_business;
  v_day := (p_start at time zone v_tz)::date;

  -- One lock per business per local day, held until this transaction ends, so it spans the write.
  perform pg_advisory_xact_lock(hashtextextended('booking-day:' || p_business || ':' || v_day, 0));

  select count(*) into v_n
    from public.bookings b
   where b.business_id = p_business
     and b.status <> 'cancelled'
     and b.bulk_vehicle_count is null
     and b.deleted_at is null
     and (p_exclude is null or b.id <> p_exclude)
     and (b.start_at at time zone v_tz)::date = v_day;
  if v_cap is not null and v_n >= v_cap then
    raise exception 'booking_day_full' using errcode = 'BK001';
  end if;

  if exists (
    select 1 from public.bookings b
     where b.business_id = p_business
       and b.status <> 'cancelled'
       and b.bulk_vehicle_count is null
       and b.deleted_at is null
       and (p_exclude is null or b.id <> p_exclude)
       and (b.start_at at time zone v_tz)::date = v_day
       and p_start <= b.end_at + make_interval(mins => v_buf)
       and b.start_at - make_interval(mins => v_buf) <= p_end
  ) then
    raise exception 'booking_too_close' using errcode = 'BK002';
  end if;
end;
$$;

-- create-booking's insert. Only the keys the caller sent are written, so every column it leaves out still
-- takes its default — the same thing PostgREST's own insert does.
create or replace function public.insert_booking_checked(p_row jsonb)
returns public.bookings
language plpgsql
set search_path = public
as $$
declare
  v public.bookings;
  v_cols text;
begin
  v := jsonb_populate_record(null::public.bookings, p_row);
  perform public.booking_day_rules_check(v.business_id, v.start_at, v.end_at, null);
  select string_agg(quote_ident(k), ', ') into v_cols from jsonb_object_keys(p_row) k;
  execute format('insert into public.bookings (%1$s) select %1$s from jsonb_populate_record(null::public.bookings, $1) returning *', v_cols)
    using p_row into v;
  return v;
end;
$$;

-- reschedule-booking's and update-booking's move. The two fences they already use (move only from the
-- start it was read at; change the status only from the status it was read in) come along, so a lost
-- race still returns no row and the caller's existing "just changed on another device" path runs.
create or replace function public.move_booking_checked(
  p_id uuid, p_business uuid, p_patch jsonb,
  p_from_start timestamptz default null, p_from_status text default null)
returns setof public.bookings
language plpgsql
set search_path = public
as $$
declare
  v public.bookings;
  v_set text;
begin
  v := jsonb_populate_record(null::public.bookings, p_patch);
  perform public.booking_day_rules_check(p_business, v.start_at, v.end_at, p_id);
  select string_agg(format('%1$I = r.%1$I', k), ', ') into v_set from jsonb_object_keys(p_patch) k;
  return query execute format(
    'update public.bookings b set %s from jsonb_populate_record(null::public.bookings, $1) r
      where b.id = $2 and b.business_id = $3
        and ($4::timestamptz is null or b.start_at = $4)
        and ($5::text is null or b.status = $5)
      returning b.*', v_set)
    using p_patch, p_id, p_business, p_from_start, p_from_status;
end;
$$;

revoke execute on function public.booking_day_rules_check(uuid, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke execute on function public.insert_booking_checked(jsonb) from public, anon, authenticated;
revoke execute on function public.move_booking_checked(uuid, uuid, jsonb, timestamptz, text) from public, anon, authenticated;
grant execute on function public.booking_day_rules_check(uuid, timestamptz, timestamptz, uuid) to service_role;
grant execute on function public.insert_booking_checked(jsonb) to service_role;
grant execute on function public.move_booking_checked(uuid, uuid, jsonb, timestamptz, text) to service_role;
