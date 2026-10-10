// ROADMAP 9.14a — IS THE PLATFORM-COSTS TABLE REALLY IN THE LIVE DATABASE, AND
// REALLY SHUT TO EVERY BROWSER?
//
//   node scripts/platform-costs-live.mjs                     (dev server on :5173)
//   node scripts/platform-costs-live.mjs --break=not-applied # sabotage: a table that was never created, as before 2026-10-10
//   node scripts/platform-costs-live.mjs --break=open-grant  # sabotage: aim the lock checks at `businesses`, which browsers CAN read
//   node scripts/receipt.mjs receipts/platform-costs-live.json
//
// WHAT IT TOUCHES, so a lane statement can name it (docs/shared-resources.md):
//   * The Management API, READ-ONLY (`read_only: true`), for the catalog.
//   * PostgREST as anon, as a signed-in platform admin, and as the service role.
//     **The only inserts are refused by construction**: the probe row breaks
//     the category, the amount and the month check at once, so even a table
//     with every lock missing could not store it.
//   * A throwaway platform admin (`scripts/admin-account.mjs`), deleted in `finally`.
//   * The deployed `platform-admin`'s `platform_net`, through the real /admin screen.
//   NEVER a structural change. The migration was applied 2026-10-10 by
//   `scripts/catch-up-steps-2-to-8.ps1` (commit 0087d1dd), with Andrew's go-ahead.
//
// WHY IT EXISTS. `migration-drift.mjs` sees the table, its grants and its index,
// and says in its own warning line that it cannot see constraints, triggers or
// RLS force — the three things this table's migration exists to set. And a
// revoke that never ran does not make a browser's read FAIL: with RLS forced and
// no policy it returns an empty list, which is exactly what a month with no
// costs looks like (ROADMAP 9.14, "THE THIRD SABOTAGE"). So the refusal is asked
// for by its error CODE, under the roles a browser really arrives as.

import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
const PLATFORM = "kguqylyzgyzfktkfnhjb";
if (!URL_ || !SERVICE || !ANON || !TOKEN || !REF) {
  console.error("Missing SUPABASE_URL / _SERVICE_ROLE_KEY / _ANON_KEY / _ACCESS_TOKEN / _PROJECT_REF. Nothing measured, no receipt written.");
  process.exit(1);
}
// CLAUDE.md, hard rules: this repo's database and no other.
if (REF !== PLATFORM || !URL_.includes(`${PLATFORM}.supabase.co`)) {
  console.error(`Refusing: project is ${REF}, not ${PLATFORM}. Nothing was touched.`);
  process.exit(1);
}

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const BASE = process.env.BASE || "http://localhost:5173";
const MIGRATION = "supabase/migrations/20261006020000_hand_entered_platform_costs.sql";
// The table every structural check reads, and the one every lock check reads.
const TABLE = BREAK === "not-applied" ? "platform_costs_never_applied" : "platform_costs";
const LOCKED = BREAK === "open-grant" ? "businesses" : TABLE;
// The canary's target: a table the public booking page reads, so a browser role
// MUST reach it. If the probe cannot say "reachable" here, its "refused" means nothing.
const OPEN = "businesses";
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }];
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/9.14a";
const ADMIN_EMAIL = "platform-costs-live-test@detailplatform.com"; // mail-sink: a login; autoconfirm is on, no mail
// Broken three ways (month, category, amount): no lock state can make it land.
const POISON = { period_month: "2026-10-15", category: "probe-refused-by-design", amount_cents: -1, note: "platform-costs-live probe" };

const started = new Date();
let assertions = 0;
const failures = [];
const check = (label, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail ? `\n          ${detail}` : ""}`);
  return ok;
};
const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: true }),
  });
  const j = await r.json().catch(() => null);
  // A failed read is not an empty one: throw, never return [].
  if (!r.ok) throw new Error(`catalog query failed: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
};
const rest = async (path, key, jwt, init = {}) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init, headers: { apikey: key, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json", Prefer: "return=minimal", ...(init.headers || {}) },
  });
  const t = await r.text();
  let body = null;
  try { body = t ? JSON.parse(t) : null; } catch { body = t; }
  return { status: r.status, code: body?.code ?? null, message: body?.message ?? null, rows: Array.isArray(body) ? body.length : null };
};
/** THE ONE CLASSIFIER, used by every probe and by the canary. */
const verdict = (r, table) =>
  r.code === "42501" && new RegExp(`permission denied for table ${table}\\b`).test(r.message ?? "") ? "refused"
    : r.status < 300 ? "reachable" : `other (${r.status} ${r.code} ${r.message})`;
/** Privileges a role holds on a table, PUBLIC folded in. */
const privs = (role, table) => `(select coalesce(array_agg(p order by p), '{}') from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
  where to_regclass('public.${table}') is not null and has_table_privilege('${role}', 'public.${table}', p))`;

const dims = { project: REF, table: TABLE, locked_target: LOCKED, break: BREAK || null };
const canary = { id: "the same probe and privilege query, aimed at a table the public page reads, must say reachable", observed_failure: false };
const expected = [...SIZES.map((s) => `browser ${s.w}`), "catalog", "rest"];
let completed = 0;
const consoleNoise = [];

console.log(`platform_costs in the live database — project ${REF}${BREAK ? `\n*** --break=${BREAK}: this run is a sabotage, not a result ***` : ""}\n`);

let acct = null, browser = null;
try {
  // ── 1. THE CATALOG, READ-ONLY ──────────────────────────────────────────────
  console.log("1. the table is there, shaped and locked the way its migration says");
  const file = readFileSync(MIGRATION, "utf8");
  const fileCats = (file.match(/check \(category in \(([^)]*)\)\)/)?.[1] ?? "").match(/'[^']*'/g)?.map((s) => s.slice(1, -1)) ?? [];
  // A count derived from its own parse cannot validate the parse (docs/gotchas.md 116): declared by hand.
  check("1 · the migration file's category list parses to the five 9.14 names", fileCats.length === 5, JSON.stringify(fileCats));
  const [c] = await sql(`
    select to_regclass('public.${TABLE}') is not null as exists,
      (select coalesce(json_agg(json_build_object('n', attname, 't', format_type(atttypid, atttypmod), 'nn', attnotnull) order by attnum), '[]')
         from pg_attribute where attrelid = to_regclass('public.${TABLE}') and attnum > 0 and not attisdropped) as cols,
      (select coalesce(json_object_agg(conname, pg_get_constraintdef(oid)), '{}') from pg_constraint where conrelid = to_regclass('public.${TABLE}')) as cons,
      coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.${LOCKED}')), false) as rls,
      coalesce((select relforcerowsecurity from pg_class where oid = to_regclass('public.${LOCKED}')), false) as forced,
      (select count(*)::int from pg_policies where schemaname = 'public' and tablename = '${LOCKED}') as policies,
      (select coalesce(json_agg(pg_get_triggerdef(oid)), '[]') from pg_trigger where tgrelid = to_regclass('public.${TABLE}') and not tgisinternal) as triggers,
      (select coalesce(json_agg(pg_get_indexdef(indexrelid)), '[]') from pg_index where indrelid = to_regclass('public.${TABLE}')) as indexes,
      obj_description(to_regclass('public.${TABLE}'), 'pg_class') as comment,
      ${privs("anon", LOCKED)} as anon, ${privs("authenticated", LOCKED)} as authenticated,
      ${privs("service_role", TABLE)} as service_role,
      ${privs("anon", OPEN)} as canary_anon`);
  dims.catalog = c;
  check("1a · the table exists in the live database", c.exists === true);
  const want = [["id", "uuid", true], ["period_month", "date", true], ["category", "text", true], ["amount_cents", "integer", true],
    ["note", "text", false], ["entered_by", "uuid", false], ["created_at", "timestamp with time zone", true], ["updated_at", "timestamp with time zone", true]];
  const got = (c.cols || []).map((x) => [x.n, x.t, x.nn]);
  check(`1b · exactly the ${want.length} columns the file declares, with their types and not-nulls`, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got));
  const defs = Object.values(c.cons || {}).join(" | ");
  check("1c · the month is pinned to the first by a check constraint", /^CHECK \(\(period_month = \(date_trunc\('month'/.test(c.cons?.platform_costs_period_is_first_of_month ?? ""), defs);
  const liveCats = (Object.values(c.cons || {}).find((d) => /category/.test(d)) ?? "").match(/'[^']*'/g)?.map((s) => s.slice(1, -1)) ?? [];
  check("1d · the category check takes exactly the file's five names", JSON.stringify([...liveCats].sort()) === JSON.stringify([...fileCats].sort()) && liveCats.length === 5, `live ${JSON.stringify(liveCats)}`);
  check("1e · a negative amount is refused by a check constraint", Object.values(c.cons || {}).some((d) => /amount_cents >= 0/.test(d)), defs);
  check("1f · a primary key on id", Object.values(c.cons || {}).some((d) => d === "PRIMARY KEY (id)"), defs);
  check("1g · row-level security is on AND forced", c.rls === true && c.forced === true, `rls ${c.rls}, forced ${c.forced}`);
  check("1h · with no policy at all", c.policies === 0, `${c.policies} policies`);
  check("1i · the updated_at trigger runs set_updated_at before each update", (c.triggers || []).some((t) => /BEFORE UPDATE .* EXECUTE FUNCTION set_updated_at\(\)/.test(t)), JSON.stringify(c.triggers));
  check("1j · the month index is on (period_month, category)", (c.indexes || []).some((d) => /platform_costs_period_idx .*\(period_month, category\)/.test(d)), JSON.stringify(c.indexes));
  check("1k · neither anon nor authenticated holds ANY privilege", c.anon?.length === 0 && c.authenticated?.length === 0, `anon ${JSON.stringify(c.anon)}, authenticated ${JSON.stringify(c.authenticated)}`);
  check("1l · the service role, which platform-admin uses, can still read and write", ["SELECT", "INSERT"].every((p) => (c.service_role || []).includes(p)), JSON.stringify(c.service_role));
  // The file's LAST statement. Present means every statement above it ran too
  // (apply-migrations sends the file as one request, so it is all or nothing).
  check("1m · the migration's last statement, the table comment, is in the database", /^ROADMAP 9\.14 - hand-entered platform costs/.test(c.comment ?? ""), String(c.comment).slice(0, 80));
  const canaryPriv = (c.canary_anon || []).includes("SELECT");
  completed++;

  // ── 2. THE BROWSER ROLES, AT THE DOOR THEY ACTUALLY USE ────────────────────
  console.log("\n2. PostgREST, as the roles a browser arrives as");
  const live = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json().catch(() => ({}));
  const left = (live.users ?? []).find((u) => u.email === ADMIN_EMAIL);
  if (left) { await dropAdmin(URL_, SERVICE, left.id); console.log("  (deleted a throwaway admin a killed run left)"); }
  acct = await makeAdmin(URL_, SERVICE, ADMIN_EMAIL);
  const jwt = acct && (await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: acct.email, password: acct.password }) })).json()).access_token;
  check("2 · a throwaway platform admin exists and is signed in", !!jwt);
  const probes = {
    anon_read: await rest(`${LOCKED}?select=id&limit=1`, ANON, ANON),
    anon_insert: await rest(LOCKED, ANON, ANON, { method: "POST", body: JSON.stringify([POISON]) }),
    admin_read: await rest(`${LOCKED}?select=id&limit=1`, ANON, jwt),
    admin_insert: await rest(LOCKED, ANON, jwt, { method: "POST", body: JSON.stringify([POISON]) }),
  };
  dims.rest = probes;
  for (const [k, r] of Object.entries(probes)) {
    check(`2 · ${k.replace("_", " ")}: refused by the missing GRANT (42501), not by a policy or a constraint`, verdict(r, LOCKED) === "refused", `${verdict(r, LOCKED)}`);
  }
  const svc = await rest(`${TABLE}?select=id,period_month,category,amount_cents`, SERVICE, SERVICE, { headers: { Prefer: "count=exact" } });
  dims.rest.service_read = svc;
  check("2 · the service role CAN read it — the case that should work", svc.status === 200 && svc.rows !== null, `${svc.status} ${svc.code} ${svc.message}`);
  dims.cost_rows_now = svc.rows;
  // THE CANARY: the same classifier and the same privilege query, on a table a
  // visitor's browser must reach. Both have to say "reachable".
  const open = await rest(`${OPEN}?select=id&limit=1`, ANON, ANON);
  canary.observed_failure = verdict(open, OPEN) === "reachable" && canaryPriv;
  canary.detail = `anon on ${OPEN}: probe ${verdict(open, OPEN)}, privilege ${JSON.stringify(c.canary_anon)}`;
  console.log(`  canary ${canary.observed_failure ? "CAUGHT" : "MISSED"}: ${canary.detail}`);
  completed++;

  // ── 3. A REAL BROWSER, AT 1440 AND 392 ─────────────────────────────────────
  console.log("\n3. a real browser: the admin screen reads the table; the app's own client is refused");
  mkdirSync(SHOTS, { recursive: true });
  browser = await chromium.launch();
  let signedIn = null;
  const inPage = (page, table, poison) => page.evaluate(async ({ table, poison }) => {
    const m = await import("/src/lib/supabase.js");
    const session = !!(await m.supabase.auth.getSession()).data.session;
    const r = await m.supabase.from(table).select("id").limit(1);
    const w = await m.supabase.from(table).insert([poison]);
    const pick = (x) => ({ status: x.status, code: x.error?.code ?? null, message: x.error?.message ?? null });
    return { url: m.supabaseUrl, session, read: pick(r), insert: pick(w) };
  }, { table, poison });
  for (const s of SIZES) {
    const where = `${s.w}`;
    console.log(` ${where}`);
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, storageState: signedIn || undefined });
    const page = await ctx.newPage();
    const noise = [];
    watchConsole(page, where, noise);
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email], .pa-top", { timeout: 40000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", acct.email);
      await page.fill("input[type=password]", acct.password);
      await page.click("form button.pa-btn");
      await page.waitForSelector(".pa-top", { timeout: 40000 });
      signedIn = await ctx.storageState();
    }
    await page.waitForSelector(".pa-body", { timeout: 40000 });
    await page.locator(".pa-tab").filter({ hasText: "Money" }).first().click();
    const sec = page.locator(".pa-sec").filter({ has: page.locator("h2", { hasText: "Did we make money?" }) });
    // state: "attached" — docs/gotchas.md 107.
    await sec.locator(".pa-net, .pa-err").first().waitFor({ state: "attached", timeout: 40000 });
    await settle(page, 1200);
    const seen = await sec.evaluate((el) => ({
      text: el.textContent.replace(/\s+/g, " ").trim().slice(0, 400),
      err: el.querySelector(".pa-err")?.textContent ?? null,
      unknown: !!el.querySelector(".pa-net.pa-unknown"),
      net: el.querySelector(".pa-net strong")?.textContent ?? null,
    }));
    dims[`screen_${where}`] = seen;
    check(`3 · ${where}: "Did we make money?" read the month — no error, no "not been set up"`, !seen.err && !/not been set up|Unknown action/i.test(seen.text) && !!seen.net, seen.err ?? seen.text.slice(0, 160));
    // With no bills in the table the month must read as NOT ENTERED, never as a profit (9.14's rule).
    if (svc.rows === 0) check(`3 · ${where}: an empty table reads "Costs not entered", not a profit`, seen.unknown && /^Costs not entered for /.test(seen.net ?? ""), seen.net);
    // From the top: a full-page shot taken scrolled paints the sticky header mid-page.
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page, 400);
    await page.screenshot({ path: `${SHOTS}/after-${s.w === 1440 ? "laptop" : "phone"}.png`, fullPage: true });
    const ownNoise = noise.length;
    // The refused case, from inside the signed-in page, through the app's own client.
    const asAdmin = await inPage(page, LOCKED, POISON);
    // And signed out: a fresh context with no session is the anon role.
    const anonCtx = await browser.newContext({ viewport: { width: s.w, height: s.h } });
    const anonPage = await anonCtx.newPage();
    const anonNoise = [];
    watchConsole(anonPage, `${where} signed-out`, anonNoise);
    await anonPage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await settle(anonPage, 1200);
    const anonOwnNoise = anonNoise.length;
    const asAnon = await inPage(anonPage, LOCKED, POISON);
    dims[`browser_${where}`] = { asAdmin, asAnon };
    check(`3 · ${where}: the page talks to ${PLATFORM}`, asAdmin.url.includes(PLATFORM) && asAnon.url.includes(PLATFORM), asAdmin.url);
    check(`3 · ${where}: one page is signed in, the other is not`, asAdmin.session === true && asAnon.session === false);
    for (const [who, r] of [["signed-in admin", asAdmin], ["signed-out visitor", asAnon]]) {
      check(`3 · ${where}: ${who}'s app client is refused a read (42501)`, verdict(r.read, LOCKED) === "refused", verdict(r.read, LOCKED));
      check(`3 · ${where}: ${who}'s app client is refused an insert (42501)`, verdict(r.insert, LOCKED) === "refused", verdict(r.insert, LOCKED));
    }
    // The console: the page's own noise must be nothing. After the probes, the
    // only lines allowed are the probes' own refusals — named, counted, expected.
    const probeLines = [...noise.slice(ownNoise), ...anonNoise.slice(anonOwnNoise)];
    const strays = probeLines.filter((l) => !(new RegExp(`/rest/v1/${LOCKED}$`).test(l) || /Failed to load resource: the server responded with a status of 40[13]/.test(l)));
    dims[`console_${where}`] = { page_own: noise.slice(0, ownNoise), signed_out_own: anonNoise.slice(0, anonOwnNoise), probe_lines: probeLines.length };
    check(`3 · ${where}: console clean on the admin page and the signed-out page`, ownNoise === 0 && anonOwnNoise === 0, [...noise.slice(0, ownNoise), ...anonNoise.slice(0, anonOwnNoise)].join(" | "));
    // 4 refusals, each printing a response line and a console line. An equality, not a floor (docs/gotchas.md 98).
    check(`3 · ${where}: the probes printed exactly their own 8 refusal lines and nothing else`, strays.length === 0 && probeLines.length === 8, `${probeLines.length} lines; strays: ${strays.join(" | ")}`);
    consoleNoise.push(...noise.slice(0, ownNoise), ...anonNoise.slice(0, anonOwnNoise));
    await anonCtx.close();
    await ctx.close();
    completed++;
  }
} catch (e) {
  const msg = acct ? String(e.stack || e).split(acct.password).join("[password]") : String(e.stack || e);
  check("the run completed without throwing", false, msg);
} finally {
  await browser?.close();
  if (acct) { await dropAdmin(URL_, SERVICE, acct.id); console.log("\nthrowaway admin deleted"); }
}

const ok = failures.length === 0 && canary.observed_failure && completed === expected.length;
writeReceipt({
  check_id: "platform-costs-live",
  started_at: started.toISOString(),
  status: ok ? "pass" : "fail",
  expected_targets: expected.length,
  discovered_targets: expected.length,
  attempted_targets: expected.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 37,
  failures,
  dimensions: dims,
  artifacts: ["scripts/platform-costs-live.mjs", MIGRATION],
  warnings: [
    "There is no applied-migrations ledger in this project (supabase_migrations.schema_migrations does not exist), so 'recorded as applied' is the live shape matching the file, including its last statement, plus commit 0087d1dd. Nothing here can show WHEN it ran.",
    "force row level security is read as a flag, not exercised: every role that could exercise it is either refused earlier by the missing grant (anon, authenticated) or bypasses RLS (service_role, the owner).",
    `The probes' own 4 refusals per width are expected in the console (a response line and a console line each, 8 per width) and are counted separately from the page's own noise, which must be zero. ${consoleNoise.length} page-own lines this run.`,
  ],
  canary,
});
console.log(`\n${ok ? "PASS" : "FAIL"} — ${assertions} assertions, ${failures.length} failed; ${completed} of ${expected.length} targets; canary ${canary.observed_failure ? "caught" : "MISSED"}.`);
process.exit(ok ? 0 : 1);
