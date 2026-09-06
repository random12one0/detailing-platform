-- Every business that existed before `hours` and `contact` stopped being
-- derived keeps the answer it had.
--
-- ROADMAP: `docs/final-pass.md` finding 5, which the owner overruled on
-- 2026-09-06 — "2 of 7 done" on a business ten seconds old reads like a head
-- start nobody earned. `app/src/lib/setup.js` now derives five of the seven
-- instead of seven, because `newBusiness.ts` SEEDS weekday hours and the
-- invite supplies `contact_email`: reading the database said yes about a
-- question nobody had been asked.
--
-- WITHOUT THIS FILE THE FIX IS A NEW LIE IN THE OTHER DIRECTION. A business
-- with a year of real hours on it would open Business and read "0 of 7 done",
-- and `setup.js`'s own header already refuses exactly that about a purely
-- stored count: "both false and insulting". A rule change is the same problem
-- arriving a second time.
--
-- WHO IS BACKFILLED, and it is deliberately not everybody: only businesses
-- that (a) already carry at least one setup mark, or (b) have a contact phone,
-- or (c) have an hours row that is NOT the seeded weekday default. Each of
-- those is evidence a person has been here. A business created minutes ago and
-- abandoned gets nothing, which is the outcome the owner asked for.
--
-- `hours` and `contact` are appended INDEPENDENTLY — a business can have
-- evidence of one and not the other, and marking both off one signal would be
-- the same over-claim in miniature.
--
-- Idempotent: `setup.done` is a jsonb array and the append is skipped when the
-- key is already in it, so re-running this changes nothing.

do $$
declare
  b record;
  marks jsonb;
  add_hours boolean;
  add_contact boolean;
begin
  for b in select id from public.businesses loop
    select coalesce(bs.setup, '{}'::jsonb) into marks
      from public.business_settings bs where bs.business_id = b.id;
    if marks is null then marks := '{}'::jsonb; end if;
    if marks->'done' is null then marks := jsonb_set(marks, '{done}', '[]'::jsonb); end if;

    -- Evidence a person set the hours: any open day that is not exactly the
    -- birth default (weekdays 09:00-17:00, weekends closed).
    select exists (
      select 1 from public.business_hours h
      where h.business_id = b.id
        and h.open_time is not null
        and (h.weekday in (0, 6)
             or h.open_time <> time '09:00'
             or h.close_time <> time '17:00')
    ) into add_hours;

    -- A phone is never seeded; the invite supplies only an email.
    select (bz.contact_phone is not null and bz.contact_phone <> '') into add_contact
      from public.businesses bz where bz.id = b.id;

    -- An existing mark of any kind is itself evidence somebody worked here.
    if jsonb_array_length(marks->'done') > 0 then
      add_hours := true;
      add_contact := true;
    end if;

    if add_hours and not (marks->'done' @> '["hours"]'::jsonb) then
      marks := jsonb_set(marks, '{done}', (marks->'done') || '["hours"]'::jsonb);
    end if;
    if add_contact and not (marks->'done' @> '["contact"]'::jsonb) then
      marks := jsonb_set(marks, '{done}', (marks->'done') || '["contact"]'::jsonb);
    end if;

    update public.business_settings set setup = marks where business_id = b.id;
  end loop;
end $$;
