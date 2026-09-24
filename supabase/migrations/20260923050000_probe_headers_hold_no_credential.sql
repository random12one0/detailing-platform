-- REMEDIATION — A SESSION PUT AN API KEY IN A TABLE. 2026-09-23.
--
-- ---------------------------------------------------------------------------
-- WHAT HAPPENED, PLAINLY, BECAUSE THE NEXT PERSON WILL OTHERWISE REPEAT IT
-- ---------------------------------------------------------------------------
-- `20260923040000_outside_checks.sql` created `site_probes.headers`, and the
-- session that built it then seeded three rows whose `headers` carried this
-- project's publishable API key as a literal value — 208 characters, in a
-- table, in plain text. The migration's own comment even said the column
-- "holds an API key", which is how the mistake got written down as though it
-- were a design.
--
-- **THE RULE IS ABSOLUTE AND A DATABASE COLUMN IS AN "ANYWHERE":** no session
-- creates, reads out, pastes or stores a key, token, secret or password
-- anywhere. It does not matter that this particular key is the publishable
-- one and is already inside the site's own JavaScript bundle. **A rule with a
-- judgement call in it is not a rule**, and the next value somebody decides is
-- "not really secret" will be the one that is.
--
-- The value is removed below. It was never committed to git — the seeding ran
-- from a scratch script, and the migration file never contained it — so the
-- only copy was this table, and after this file there is none.
--
-- ---------------------------------------------------------------------------
-- WHY A CONSTRAINT AND NOT A COMMENT
-- ---------------------------------------------------------------------------
-- **A column called `headers` is exactly the kind of thing somebody fills in
-- without thinking**, to make a probe work, at eleven at night. A comment
-- asking them not to is the weakest instrument this repo has. So the database
-- refuses it: `headers` may not carry an `apikey` or an `Authorization`
-- field at all, and an attempt to write one fails loudly at the moment it is
-- made rather than sitting there.
--
-- ---------------------------------------------------------------------------
-- WHERE THE REAL ONE LIVES INSTEAD, AND WHO PUTS IT THERE
-- ---------------------------------------------------------------------------
-- **In Supabase Vault, under a name, never in a probe row.** The row stores
-- `secret_name` — a NAME, which is not a credential — and the prober resolves
-- it at the moment it makes the request, holding it in a local variable that
-- is gone when the function returns. That is the same shape the edge functions
-- already use with `Deno.env.get(...)`, and the same shape
-- `docs/services-and-secrets.md` describes: say where a key lives, never what
-- it is.
--
-- **NOBODY HAS PUT ONE THERE, AND NO SESSION WILL.** `vault.secrets` is empty.
-- The two probes that need one are left enabled and will report themselves
-- SKIPPED — never failed, so they cannot raise a false alarm — until the
-- secret exists. **Provisioning it is Andrew's**, and it is one statement he
-- runs himself, with the value never passing through a session:
--
--     select vault.create_secret('<the publishable anon key>', 'site_probe_api_key');
--
-- After that the two probes start reporting on their own with no further
-- change. Until then the monitor covers two paths rather than four, and says
-- so on every ping.

-- ---------------------------------------------------------------------------
-- 1 · TAKE THE VALUE OUT. This runs before the constraint, because the
--     constraint cannot be added while the rows still violate it.
-- ---------------------------------------------------------------------------
update public.site_probes
   set headers = case
         when headers is null then null
         else (headers - 'apikey' - 'Authorization' - 'authorization')
       end
 where headers is not null;

-- ---------------------------------------------------------------------------
-- 2 · MAKE IT IMPOSSIBLE TO PUT ONE BACK.
-- ---------------------------------------------------------------------------
alter table public.site_probes
  drop constraint if exists site_probes_headers_hold_no_credential;
alter table public.site_probes
  add constraint site_probes_headers_hold_no_credential
  check (
    headers is null
    or not (headers ? 'apikey' or headers ? 'Authorization' or headers ? 'authorization')
  );

comment on column public.site_probes.headers is
  'Request headers WITHOUT any credential — a check constraint refuses apikey '
  'and Authorization. A credential goes in Vault and is named by secret_name.';

-- ---------------------------------------------------------------------------
-- 3 · THE REFERENCE. A NAME, NOT A VALUE.
-- ---------------------------------------------------------------------------
alter table public.site_probes
  add column if not exists secret_name text;

comment on column public.site_probes.secret_name is
  'Name of a Vault secret holding the API key this probe needs, or NULL when '
  'it needs none. Never the key itself. Resolved at request time and held only '
  'in a local variable.';

-- ---------------------------------------------------------------------------
-- 4 · THE PROBER RESOLVES IT, OR SKIPS — NEVER FAILS — WHEN IT IS ABSENT.
-- ---------------------------------------------------------------------------
-- **A MISSING CREDENTIAL IS NOT AN OUTAGE.** If this reported a probe with no
-- secret as "down", provisioning would become urgent by making the monitor
-- lie, which is the wolf this whole design exists to avoid. It is skipped:
-- not fired, not graded, and cleared of any stale request id so the next
-- cycle cannot grade last cycle's answer against it.
--
-- **AND A SKIP IS NOT SILENT.** `skipped` rides on every ping, so the state is
-- visible in the check's own event detail rather than only in a cron log
-- nobody opens. `docs/silences.md` is the standard: a guard that skips must
-- print that it skipped.
create or replace function public.probe_live_site()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r            record;
  resp         record;
  ok           boolean;
  failing      text[] := '{}';
  skipped      text[] := '{}';
  graded       int := 0;
  ping         text;
  sent         text := 'withheld';
  the_date     text := to_char((now() + interval '7 days')::date, 'YYYY-MM-DD');
  the_duration text;
  req          bigint;
  payload      jsonb;
  hdrs         jsonb;
  secret       text;
begin
  select coalesce(min(s.duration_minutes), 60)::text into the_duration
    from public.services s
    join public.businesses b on b.id = s.business_id
   where b.slug = 'demo-detail';

  -- PASS 1 — grade the PREVIOUS cycle.
  for r in select * from public.site_probes where enabled order by key loop
    if r.last_request_id is null then continue; end if;

    select status_code, content into resp
      from net._http_response where id = r.last_request_id;
    if not found then continue; end if;

    graded := graded + 1;
    ok := resp.status_code = r.expect_status
          and (r.expect_contains is null
               or position(r.expect_contains in coalesce(resp.content, '')) > 0);

    if ok then
      if r.consecutive_failures >= r.fail_after then
        insert into public.site_probe_events (probe_key, state, detail)
        values (r.key, 'up', format('recovered after %s consecutive failures', r.consecutive_failures));
      end if;
      update public.site_probes
         set consecutive_failures = 0, last_ok_at = now()
       where key = r.key;
    else
      if r.consecutive_failures + 1 = r.fail_after then
        insert into public.site_probe_events (probe_key, state, detail)
        values (r.key, 'down',
                format('status %s, expected %s%s',
                       coalesce(resp.status_code::text, 'none'), r.expect_status,
                       case when r.expect_contains is null then ''
                            else format(', body did not contain %L', r.expect_contains) end));
      end if;
      update public.site_probes
         set consecutive_failures = r.consecutive_failures + 1, last_fail_at = now()
       where key = r.key;
      if r.consecutive_failures + 1 >= r.fail_after then
        failing := failing || r.key;
      end if;
    end if;
  end loop;

  select site_probe_ping_url into ping from public.platform_settings limit 1;

  -- PASS 2 — fire this cycle's probes.
  for r in select * from public.site_probes where enabled order by key loop
    hdrs := coalesce(r.headers, '{}'::jsonb);
    secret := null;

    if r.secret_name is not null then
      select decrypted_secret into secret
        from vault.decrypted_secrets where name = r.secret_name;
      if secret is null then
        -- Not provisioned. Skip it, and make sure nothing stale is left for
        -- the next cycle to grade.
        skipped := skipped || r.key;
        update public.site_probes set last_request_id = null where key = r.key;
        continue;
      end if;
      hdrs := hdrs || jsonb_build_object('apikey', secret,
                                         'Authorization', 'Bearer ' || secret);
    end if;

    payload := case when r.body is null then null else
      replace(replace(r.body::text, '{{DATE_PLUS_7}}', the_date),
              '{{DURATION}}', the_duration)::jsonb end;

    if r.method = 'GET' then
      req := net.http_get(url => r.url, headers => hdrs, timeout_milliseconds => 8000);
    else
      req := net.http_post(url => r.url, headers => hdrs, body => payload,
                           timeout_milliseconds => 8000);
    end if;
    update public.site_probes set last_request_id = req where key = r.key;
  end loop;

  -- THE PING, after PASS 2 so `skipped` is known and can ride along.
  if ping is not null then
    if graded = 0 then
      sent := 'withheld — nothing could be graded this cycle';
    elsif array_length(failing, 1) is null then
      perform net.http_post(url => ping,
                            body => jsonb_build_object('ok', true, 'graded', graded,
                                                       'skipped', skipped),
                            timeout_milliseconds => 5000);
      sent := 'ok';
    else
      perform net.http_post(url => ping || '/fail',
                            body => jsonb_build_object('failing', failing, 'graded', graded,
                                                       'skipped', skipped),
                            timeout_milliseconds => 5000);
      sent := 'fail';
    end if;
  end if;

  delete from public.site_probe_events where at < now() - interval '90 days';

  return jsonb_build_object('graded', graded, 'failing', failing,
                            'skipped', skipped, 'ping', sent);
end;
$$;

revoke all on function public.probe_live_site() from public, anon, authenticated;
