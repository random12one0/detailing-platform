-- TRANSLATE WHEN THE DETAILER SAVES — roadmap item 3, 2026-09-13.
--
-- A Spanish-speaking customer can read our product in Spanish and then meets
-- the detailer's own words in English: every service name, every description,
-- every FAQ answer. `appEs.js` and `es.js` are OUR copy and can never hold his.
--
-- ── WHY THE KEY IS THE TEXT AND NOT THE COLUMN ──────────────────────────────
-- The obvious build is `services.description_es`, and it cannot work: a third
-- of the prose a customer reads lives INSIDE jsonb — `business_settings.faqs`,
-- `vehicle_sizes`, `travel_zones`, `services.features`, `branding.credentials`
-- — where a parallel column cannot reach. Keying on the source string covers
-- every one of them with this one table, needs no migration when a new
-- publishable field appears, and two services that share a sentence cost one
-- API call between them.
--
-- AND IT MAKES "DO NOT CALL THE API IF THE TEXT HAS NOT CHANGED" THE PRIMARY
-- KEY RATHER THAN A CHECK SOMEBODY REMEMBERS. Same bytes, same hash, row
-- already present, nothing sent. It cannot be forgotten because it is not a
-- step.
--
-- ── WHY business_id IS IN THE KEY ───────────────────────────────────────────
-- A global cache would save characters, and it would let one detailer's
-- correction become another detailer's words. Never.
--
-- ── THE HUMAN EDIT, AND WHY IT IS SAFE STRUCTURALLY ─────────────────────────
-- Andrew's requirement: a human-edited Spanish string must NEVER be
-- overwritten by a later automatic pass, as a property of the schema rather
-- than a check someone remembers. Three things, none of them a convention:
--
--   1. machine_text and human_text ARE DIFFERENT COLUMNS and the reader
--      prefers the human one. Nothing that writes a machine translation is
--      even addressing the column a person wrote.
--   2. translation_put IS THE ONLY WRITE PATH for machine text, and its
--      `on conflict do update` does not name human_text. There is no second
--      statement to get wrong.
--   3. COLUMN PRIVILEGES. `authenticated` is granted update on human_text and
--      nothing else, so a detailer cannot touch the machine column either.
--      The protection runs in both directions.
--
-- AND A HUMAN EDIT CAN NEVER BE STALE-BUT-LIVE. Change the English and the
-- hash changes, so the correction stays attached to the exact bytes it was
-- written for and a fresh machine row is made for the new text. There is no
-- invalidation logic here because none is needed.

create table if not exists public.translations (
  business_id  uuid not null references public.businesses(id) on delete cascade,
  -- One language today. The column exists so a third is not a migration.
  lang         text not null check (lang in ('es')),
  -- sha256 of the source bytes, lowercase hex. translation_put VERIFIES this
  -- against the text on every write: a hash that disagrees with its source is
  -- a row nothing can ever look up, which would read as a cache miss for ever
  -- and bill us on every save.
  source_hash  text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  source_text  text not null,
  machine_text text,
  machine_by   text check (machine_by in ('deepl', 'google')),
  human_text   text,
  updated_at   timestamptz not null default now(),
  primary key (business_id, lang, source_hash),
  -- A BLANK IS NEVER A TRANSLATION. The customer must see the detailer's
  -- English when we have nothing, never an empty field, and the way that is
  -- guaranteed is that a row holding nothing cannot exist: absent means
  -- "falls back to English" and present means "has words in it".
  constraint translations_not_blank check (
    (machine_text is null or length(btrim(machine_text)) > 0)
    and (human_text is null or length(btrim(human_text)) > 0)
    and coalesce(machine_text, human_text) is not null
  )
);

comment on table public.translations is
  'Roadmap item 3, 2026-09-13. The detailer''s own words in Spanish, keyed on '
  'the source TEXT rather than on a column so it reaches prose inside jsonb. '
  'Absent row = the customer reads the English, by design. human_text always '
  'beats machine_text and no automatic pass addresses that column.';

alter table public.translations enable row level security;

-- The detailer reads their own rows (the review screen) and may correct the
-- Spanish. Public reads do NOT come through this table — they come through
-- get_business_translations below, which is the same
-- one-security-definer-read posture as get_public_business_profile.
revoke all on public.translations from anon, authenticated;
grant select on public.translations to authenticated;
grant update (human_text) on public.translations to authenticated;

create policy translations_permission_select on public.translations
  for select to authenticated
  using (public.has_business_permission(business_id, 'settings'));

create policy translations_permission_update on public.translations
  for update to authenticated
  using (public.has_business_permission(business_id, 'settings'))
  with check (public.has_business_permission(business_id, 'settings'));

-- NO INSERT POLICY, AND IT IS A DECISION RATHER THAN AN OVERSIGHT. A human
-- edit is a correction of a row an automatic pass created; typing Spanish for
-- a string that was never attempted would mean the browser computing a sha256
-- the database then has to trust. When both providers are exhausted the answer
-- is the English fallback, which is what Andrew specified.

-- ---------------------------------------------------------------------------
-- The only way machine text gets written.
-- ---------------------------------------------------------------------------
-- security definer, with execute revoked from everyone: the edge function's
-- service role is the only caller.
create or replace function public.translation_put(
  p_business uuid,
  p_lang     text,
  p_hash     text,
  p_source   text,
  p_machine  text,
  p_by       text
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- THE INSTRUMENT CHECKS ITSELF. The hash is the whole cache key, so a writer
  -- whose hashing disagrees with the reader's does not fail — it silently
  -- misses every lookup and re-bills every save, for ever, while looking
  -- exactly like a working system. The database refuses rather than finding
  -- out later. Andrew's 2026-09-13 condition, applied to the key itself.
  if p_hash <> encode(sha256(convert_to(p_source, 'UTF8')), 'hex') then
    raise exception
      'translation_put: hash % does not match its source text — refusing to write a row nothing could ever look up',
      p_hash;
  end if;

  insert into public.translations
    (business_id, lang, source_hash, source_text, machine_text, machine_by)
  values
    (p_business, p_lang, p_hash, p_source, p_machine, p_by)
  on conflict (business_id, lang, source_hash) do update
    -- human_text IS NOT NAMED HERE AND MUST NEVER BE. This clause is the
    -- structural half of Andrew's requirement.
    set machine_text = excluded.machine_text,
        machine_by   = excluded.machine_by,
        updated_at   = now();
end;
$fn$;

revoke all on function public.translation_put(uuid, text, text, text, text, text)
  from anon, authenticated;

comment on function public.translation_put(uuid, text, text, text, text, text) is
  'The ONE write path for machine translations. Verifies the hash against the '
  'source and never addresses human_text.';

-- ---------------------------------------------------------------------------
-- What a public page asks for.
-- ---------------------------------------------------------------------------
-- A SECOND function rather than an argument on get_public_business_profile.
-- Adding a defaulted argument to that one would make a one-argument call
-- ambiguous, so it would have to be DROPPED and its ninety security-definer
-- lines retyped — the single read every public page depends on — to save one
-- round trip that only Spanish visitors ever make.
--
-- The shape is { english: spanish } because that is EXACTLY the shape
-- localeStore.js's t() already looks things up in: `table[english] ||
-- english`. The English fallback the customer gets when we have no
-- translation is therefore not an error path anybody wrote; it is what the
-- existing lookup does with a missing key.
create or replace function public.get_business_translations(p_slug text, p_lang text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(jsonb_object_agg(t.source_text, coalesce(t.human_text, t.machine_text)), '{}'::jsonb)
  from public.translations t
  join public.businesses b on b.id = t.business_id
  where b.slug = p_slug
    and t.lang = p_lang;
$fn$;

grant execute on function public.get_business_translations(text, text) to anon, authenticated;

comment on function public.get_business_translations(text, text) is
  'The public read. { english: spanish } — the shape localeStore.js t() '
  'already uses, so a missing key IS the English fallback.';

-- ---------------------------------------------------------------------------
-- The gauge, and it is ADVISORY ON PURPOSE.
-- ---------------------------------------------------------------------------
-- EXHAUSTION IS DECIDED BY THE PROVIDER'S OWN ERROR, NEVER BY THIS TABLE. That
-- is deliberate after this week: seven instruments in this repo reported
-- success regardless of reality (FOUND.md). A counter on the critical path is
-- an eighth — wrong by a thousand characters and it either stops translating
-- or keeps calling a dead API. Wrong here, it mis-draws a bar and nothing else.
-- For DeepL the dashboard reconciles against DeepL's own free /v2/usage and
-- SAYS which number it is showing.
create table if not exists public.translation_usage (
  provider    text primary key check (provider in ('deepl', 'google')),
  -- 'lifetime' for DeepL's one-off million; 'YYYY-MM' (UTC) for Google's
  -- recurring half-million.
  period      text not null,
  chars_used  bigint not null default 0 check (chars_used >= 0),
  chars_limit bigint not null check (chars_limit > 0),
  rolls       boolean not null,
  updated_at  timestamptz not null default now()
);

alter table public.translation_usage enable row level security;
alter table public.translation_usage force row level security;
revoke all on public.translation_usage from anon, authenticated;

-- The limits Andrew was given when he created the keys. DeepL's million is a
-- lifetime allowance that EXPIRES rather than renewing, which is why it does
-- not roll and why its own error is the only thing trusted to mean "gone".
insert into public.translation_usage (provider, period, chars_used, chars_limit, rolls)
values
  ('deepl',  'lifetime',                                   0, 1000000, false),
  ('google', to_char(now() at time zone 'utc', 'YYYY-MM'), 0,  500000, true)
on conflict (provider) do nothing;

-- Rolling the month happens INSIDE the increment, so nothing can add to a
-- stale period: there is no separate "reset" anybody has to remember to call.
-- Called with 0 characters it is the gauge read, and it rolls then too — so
-- the bar cannot show last month's total either.
create or replace function public.translation_spend(p_provider text, p_chars bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r public.translation_usage;
  this_period text := to_char(now() at time zone 'utc', 'YYYY-MM');
begin
  update public.translation_usage u
     set chars_used = case
           when u.rolls and u.period <> this_period then p_chars
           else u.chars_used + p_chars
         end,
         period = case when u.rolls then this_period else u.period end,
         updated_at = now()
   where u.provider = p_provider
  returning u.* into r;

  -- A provider nobody seeded is not a quiet zero. A typo in a provider name
  -- would otherwise report a full allowance for ever.
  if r.provider is null then
    raise exception 'translation_spend: unknown provider %', p_provider;
  end if;

  return jsonb_build_object(
    'provider',  r.provider,
    'period',    r.period,
    'used',      r.chars_used,
    'limit',     r.chars_limit,
    'remaining', greatest(0, r.chars_limit - r.chars_used)
  );
end;
$fn$;

revoke all on function public.translation_spend(text, bigint) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- The first-run review — Andrew's condition, 2026-09-13.
-- ---------------------------------------------------------------------------
-- "The human-edit column is only a remedy if somebody knows it exists." A
-- detailer who never opens the Spanish version of their own page will never
-- discover that their brand name came out as something absurd — and a mangled
-- brand name is on every price they quote, where a mangled description is
-- merely embarrassing. So the first time their words are translated they are
-- told, in plain language, and it PERSISTS until they have looked once.
--
-- NULL means never reviewed. The card's CONTENTS — which service names became
-- what — are computed from translations on demand and deliberately not stored:
-- a stored list is the exact instrument this week kept finding green. After
-- the stamp it goes quiet and translates silently for ever, which is also his
-- instruction: the one moment of friction belongs at the start.
alter table public.business_settings
  add column if not exists translation_reviewed_at timestamptz;

comment on column public.business_settings.translation_reviewed_at is
  'Andrew 2026-09-13. When the detailer looked at their first Spanish '
  'translation. NULL plus any machine row = show the first-run review. The '
  'existing settings-permission update policy is what lets them stamp it; no '
  'new grant.';

-- ---------------------------------------------------------------------------
-- WE TRANSLATE WHAT A BUSINESS SAYS, NEVER WHAT IT IS CALLED.
-- Andrew's correction, 2026-09-13, and it overrules the earlier "names too".
-- ---------------------------------------------------------------------------
-- *"'Coastline Auto Detailing' is that person's name, it is on their van and
-- their invoices, and a Spanish version of it is simply wrong rather than
-- imperfect. Treat it as a proper noun in the same class as a person's name."*
--
-- SCOPE, PRECISELY, BECAUSE IT IS NARROWER THAN IT SOUNDS. Service names and
-- descriptions are still translated and still go through the first-run review.
-- What is forbidden is the BUSINESS NAME and anything derived from it — a page
-- title, an email subject, a masthead, a browser tab title, the from-name on an
-- email — plus the other things that are names rather than descriptions: a
-- slug, a custom domain, a promo code.
--
-- WHY A TRIGGER AND NOT A LINE IN THE SWEEPER'S SKIP LIST. The skip list is in
-- the edge function and it is the right place for the decision; it is also a
-- list somebody maintains, and Andrew's point about the joining pattern is
-- exactly that the dangerous instance is the one nobody listed. A row that does
-- not exist cannot be read by a masthead, a title or a sentence built by
-- joining. So the sweeper refuses to PROPOSE one and the database refuses to
-- HOLD one, and the second guard does not depend on anybody remembering the
-- first.
--
-- MEASURED BEFORE WRITING THIS, rather than assumed: the business name reaches
-- translated sentences today only as a `{business}` / `{name}` PLACEHOLDER,
-- which `localeStore.js` interpolates AFTER the catalogue lookup — so the name
-- itself never passes through a translation table. There is no `t(business.name)`
-- anywhere in `app/src` or `supabase/functions`. The exposure is entirely in the
-- NEW tenant-prose lookup, which is what this guards.
create or replace function public.translations_never_a_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  subject text := btrim(lower(new.source_text));
  what text;
begin
  select x.kind into what
  from (
    select 'the business name' as kind from public.businesses b
      where b.id = new.business_id and btrim(lower(b.name)) = subject
    union all
    select 'the booking-page slug' from public.businesses b
      where b.id = new.business_id and btrim(lower(b.slug)) = subject
    union all
    select 'a custom domain' from public.business_domains d
      where d.business_id = new.business_id and btrim(lower(d.domain)) = subject
    union all
    select 'a promo code' from public.promo_codes p
      where p.business_id = new.business_id and btrim(lower(p.code)) = subject
  ) x
  limit 1;

  if what is not null then
    raise exception
      'translations: % is a NAME, not something the business says — refusing to store a translation of it (%)',
      what, new.source_text;
  end if;

  return new;
end;
$fn$;

create trigger translations_never_a_name
  before insert or update on public.translations
  for each row execute function public.translations_never_a_name();

comment on function public.translations_never_a_name() is
  'Andrew 2026-09-13: we translate what a business SAYS, never what it is '
  'CALLED. Refuses any row whose source is the business name, its slug, a '
  'custom domain or a promo code — so no masthead, title, subject line or '
  'joined sentence can pick up a translated name, whatever a later sweeper '
  'forgets.';
