// WHO CAN EXECUTE A `security definer` FUNCTION — ASKED OF THE LIVE DATABASE.
//
// Lane C. The eighth costume's wider sweep, which `FOUND.md` parked on
// 2026-09-13: *"every `security definer` function in this repo deserves the same
// three-line probe."* This is that probe, turned into a standing check.
//
// ── WHY A GREP OF THE MIGRATIONS CANNOT DO THIS JOB ─────────────────────────
// The translation migration carried `revoke all on function … from anon,
// authenticated` and it took NOTHING away, because `create function` grants
// EXECUTE to PUBLIC and revoking from `anon` does not remove a grant made to
// PUBLIC. **A suite that grepped for the word `revoke` would have passed on
// it.** So this file never reads a `.sql` file. It asks `pg_proc.proacl`.
//
// ── AND THE ROOT CAUSE IS A DEFAULT PRIVILEGE, WHICH IS WHY IT RECURS ───────
// Measured 2026-09-13 in `pg_default_acl`: this project carries
// `alter default privileges in schema public grant execute on functions to
// anon, authenticated` (from BOTH `postgres` and `supabase_admin`). So a new
// function is born with THREE grants — PUBLIC by `create function`, plus `anon`
// and `authenticated` by default privilege — and a migration that revokes one
// or two of the three leaves the door open while reading as if it closed it.
//
// **That is why this is a check and not a one-off fix.** The next function
// added to this schema is anon-reachable the moment it is created, and nothing
// except this file will say so.
//
// ── A SECURITY DEFINER FUNCTION OWNED BY `postgres` HAS NO RLS AT ALL ───────
// Measured, not assumed: `postgres` carries `rolbypassrls = true`. So
// `force row level security` on `bookings` — which IS set — does not apply
// inside such a function. `select b.*` in a definer function is therefore a
// read of EVERY TENANT'S ROWS, and whoever holds EXECUTE holds that read.
// The anon key ships in the browser bundle.
//
// ── THE ALLOWLIST IS THE WHOLE DESIGN ──────────────────────────────────────
// Every reachable definer function is listed below WITH A REASON. A new one
// fails this suite until somebody writes its reason down, which is the only
// point at which anybody asks the question.
//
//   node tests/definer-grants.test.mjs     (needs SUPABASE_ACCESS_TOKEN + REF)

import "./_env.mjs";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;

let passed = 0, failed = 0, skipped = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};
// A SKIPPED CHECK MUST NOT READ LIKE A PASSING ONE.
const skip = (name, why) => { skipped++; console.log(`  SKIP  ${name} — ${why}`); };

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return { ok: r.status < 300, status: r.status, body: await r.json().catch(() => null) };
};

// ───────────────────────────────────────────────────────────────────────────
// THE ALLOWLIST — reachable ON PURPOSE, one reason each.
//
// `anon` means the whole internet: the anon key is in the browser bundle.
// `authenticated` means any detailer on the platform, including one who is not
// a member of the business whose id they pass in.
// ───────────────────────────────────────────────────────────────────────────
const ALLOWED = {
  // --- the customer's page. These ARE the public read surface (contract §3).
  get_public_business_profile:
    "anon+auth: THE public read. One security-definer RPC is the whole tenant read surface.",
  get_public_business_profile_by_host:
    "anon+auth: the same read, reached by custom hostname (roadmap 3.3).",
  get_business_translations:
    "anon+auth: the customer's Spanish lookup. Returns {english: spanish} for one slug.",
  business_canonical_host:
    "anon+auth: returns a PUBLIC hostname for a business. Nothing private in it.",
  platform_prices:
    "anon+auth: the platform price table the marketing pages print. Public by design.",
  founding_offer:
    "anon+auth: how many founding spots are left. Printed on the pricing page.",

  // --- RLS helpers. A policy is evaluated AS THE CALLING ROLE, so the calling
  // role must hold EXECUTE or every policy using it fails. Each returns
  // nothing for a caller with no membership.
  current_business_ids:
    "anon+auth: RLS helper, used inside policies. A policy is evaluated with the "
    + "QUERYING role's privileges, so every role a policy can run for needs EXECUTE. "
    + "Returns this caller's own businesses only.",
  has_business_permission:
    "auth: RLS helper, used inside policies. Answers about the CALLER, not about a row.",
  business_ids_with_permission:
    "auth: RLS helper, used inside policies.",
  is_business_owner:
    "anon+auth: RLS helper, used inside policies. Returns false for a non-owner.",

  // --- deliberate, with the grant written in its own migration.
  accrue_plan_visits:
    "auth: GRANTED EXPLICITLY in 20260904002000_plans.sql. Idempotent (on conflict do "
    + "nothing) and bounded by current_date, so firing it early only grants what was "
    + "already due. FOUND.md asks whether authenticated needs it at all.",

  // --- the dashboard's own read, narrowed to authenticated on 2026-09-13.
  job_photo_budget:
    "auth ONLY: app/src/lib/photos.js calls it with the detailer's session. It takes a "
    + "business id and does NOT check membership, so a detailer can read another "
    + "business's storage numbers — logged in FOUND.md. anon and PUBLIC are revoked.",
  photo_total_bytes:
    "auth ONLY: granted to authenticated in 20260906011100. No client caller today; "
    + "anon and PUBLIC are revoked.",
};

console.log("\n§ 1 · every `security definer` function in `public`, by who can execute it");

if (!TOKEN || !REF) {
  skip("1a · the live ACL of every definer function", "no SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF — this check proved NOTHING");
} else {
  const r = await sql(`
    select p.proname as name,
           pg_get_function_identity_arguments(p.oid) as args,
           pg_get_function_result(p.oid) as result,
           case when p.proacl is null then '{=X/owner}' else p.proacl::text end as acl
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
    order by p.proname;`);

  if (!r.ok || !Array.isArray(r.body)) {
    // NOT a pass. The question was not asked.
    skip("1a · the live ACL of every definer function",
      `the management query returned ${r.status} — this check proved NOTHING`);
  } else {
    const rows = r.body;
    ok("1a · the database answered with definer functions", rows.length > 10, String(rows.length));

    // `{=X/postgres,anon=X/postgres,…}` — an entry with an EMPTY grantee is
    // PUBLIC, which is what `create function` hands out and what the first
    // version of the translation revoke failed to take back.
    const who = (acl) => {
      const entries = String(acl).replace(/^\{|\}$/g, "").split(",").filter(Boolean);
      const has = (role) => entries.some((e) => {
        const [grantee, privs] = e.split("=");
        return grantee.trim() === role && /X/.test(privs || "");
      });
      return { pub: has(""), anon: has("anon"), auth: has("authenticated") };
    };

    const reachable = [];
    for (const fn of rows) {
      const w = who(fn.acl);
      if (w.pub || w.anon || w.auth) reachable.push({ ...fn, ...w });
    }

    // 1b · NOTHING IS REACHABLE WITHOUT A WRITTEN REASON. This is the check.
    const unlisted = reachable.filter((f) => !(f.name in ALLOWED));
    ok("1b · no definer function is reachable by anon/authenticated/PUBLIC without a reason in ALLOWED",
      unlisted.length === 0,
      unlisted.map((f) => `${f.name}(${f.args}) -> ${f.result} [pub=${+f.pub} anon=${+f.anon} auth=${+f.auth}]`).join("; "));

    // 1c · PUBLIC IS NEVER THE MECHANISM, even for something meant to be public.
    // A PUBLIC grant reaches roles nobody has thought about, and it is the grant
    // every `revoke … from anon` silently fails to remove — the bug that started
    // this. Anything reachable on purpose names `anon` / `authenticated`
    // explicitly, so the ACL itself says who was intended.
    //
    // This is deliberately MECHANICAL rather than reading ALLOWED's prose: a
    // check that parses its own author's sentences is a check that agrees with
    // whatever was written, which is the ninth costume.
    const viaPublic = rows.filter((f) => who(f.acl).pub);
    ok("1c · no definer function carries a PUBLIC grant — reach is named, never inherited",
      viaPublic.length === 0,
      viaPublic.map((f) => f.name).join(", "));

    // 1d · THE ALLOWLIST ITSELF CANNOT ROT. An entry for a function that is no
    // longer reachable is a reason nobody has re-read; an entry for a function
    // that no longer exists is worse, because it reads as coverage.
    const names = new Set(rows.map((f) => f.name));
    const ghosts = Object.keys(ALLOWED).filter((n) => !names.has(n));
    ok("1d · every ALLOWED entry names a definer function that still exists",
      ghosts.length === 0, ghosts.join(", "));

    const stale = Object.keys(ALLOWED).filter((n) => names.has(n) && !reachable.some((f) => f.name === n));
    ok("1d-ii · and one that is still reachable, so no reason is left standing over a locked function",
      stale.length === 0, stale.join(", "));

    // 1e · THE FIVE CLOSED ON 2026-09-13, BY NAME. A count would pass while any
    // one of them reopened; trap (k) says assert the behaviour, and the
    // behaviour here is "anon cannot execute this".
    const acl = Object.fromEntries(rows.map((f) => [f.name, who(f.acl)]));
    const closed = {
      get_bookings_due_for_second_reminder:
        "returns `setof bookings` with no tenant filter — every customer's name, email, phone and address",
      note_heartbeat: "writes the dead man's switch's own heartbeat, so a detailer could forge it",
      link_booking_to_plan: "a trigger function; nobody calls it by hand",
    };
    for (const [name, why] of Object.entries(closed)) {
      const w = acl[name];
      if (!w) { ok(`1e · ${name} exists`, false, "not found in pg_proc"); continue; }
      ok(`1e · ${name} is service_role only — ${why}`,
        !w.pub && !w.anon && !w.auth, JSON.stringify(w));
    }
    for (const name of ["job_photo_budget", "photo_total_bytes"]) {
      const w = acl[name];
      ok(`1e-ii · ${name} is authenticated only, never anon or PUBLIC`,
        !!w && !w.pub && !w.anon && w.auth, JSON.stringify(w));
    }

    console.log(`\n  ${reachable.length} of ${rows.length} definer functions are reachable, all with a written reason.`);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// § 2 · THE DEFAULT PRIVILEGE IS STILL THERE, AND THAT IS RECORDED RATHER
// THAN QUIETLY FIXED.
//
// Removing it would change how every FUTURE function is born, across a schema
// Supabase's own tooling also writes into. It is left in place on purpose; what
// must not happen is a session discovering § 1 failing and not knowing why.
// This check fails if the default privilege DISAPPEARS, because then § 1's
// reasoning — and the three-role revoke every migration here writes — is about
// a database that no longer exists.
// ───────────────────────────────────────────────────────────────────────────
console.log("\n§ 2 · the default privilege that makes every new function reachable");

if (!TOKEN || !REF) {
  skip("2a · pg_default_acl still grants EXECUTE to anon/authenticated", "no credentials — this check proved NOTHING");
} else {
  const r = await sql(`
    select coalesce(string_agg(d.defaclacl::text, ' '), '') as acls
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    where n.nspname = 'public' and d.defaclobjtype = 'f';`);
  const acls = Array.isArray(r.body) ? String(r.body[0]?.acls ?? "") : null;
  if (acls === null) {
    skip("2a · pg_default_acl still grants EXECUTE to anon/authenticated",
      `the management query returned ${r.status} — this check proved NOTHING`);
  } else {
    ok("2a · a new function in `public` is still born anon-reachable, so a migration must revoke THREE roles",
      /anon=X/.test(acls) && /authenticated=X/.test(acls), acls || "(no default ACL for functions)");
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);

// A SUITE THAT RAN NOTHING MUST NOT EXIT 0 - 2026-09-13.
//
// Every SKIP above prints "this check proved NOTHING", which is honest to a
// person reading the output. It was not honest to anything reading the EXIT
// CODE: with no `SUPABASE_ACCESS_TOKEN` this file asserted zero things about
// who can execute a `security definer` function and exited 0, which is
// indistinguishable from a clean bill. That is this repo's oldest recorded
// failure - a skipped check reading exactly like a passing one - in the one
// suite whose subject is who can reach a detailer's data.
//
// Deliberately narrower than "exit 1 on any skip": a partial run still proved
// something. Only a run that measured NOTHING is a failure.
if (!failed && passed === 0) {
  console.error("");
  console.error("FAIL  this run measured NOTHING - every check was skipped for want of credentials.");
  console.error("      Run: set -a; . ./.env; set +a   -- then run this again.");
  console.error("      Exiting 1 so a green exit code cannot be mistaken for a clean bill.");
  process.exit(1);
}
process.exit(failed ? 1 : 0);
