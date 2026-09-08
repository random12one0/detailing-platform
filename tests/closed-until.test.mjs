// ROADMAP 8.13 — CLOSED UNTIL I SAY IT'S OPEN.
//
// *"A detailer-facing pause that keeps the site up and says when they are
// back."* Before this the only pause was the platform admin setting
// `businesses.status = 'paused'`, and the page then 404'd: a customer met
// "page not found" about a business that exists and is back in nine days.
//
// **THE ONE THING THIS FILE EXISTS TO PROTECT IS THAT IT IS NOT `status`.**
// The obvious build lets a detailer set that column themselves, and it
// collides head-on with billing: `stripe-webhook` uses `status` for
// SUSPENSION, so a detailer who closed for a fortnight would press Reopen and
// switch their own booking page back on with their subscription unpaid. § 4
// is that collision, asked of the live database.
//
// The rest is the clock. `closed_until` is a DATE in the tenant's own zone and
// three separate things compare it — `available-slots`, `core.js` and the
// booking page — so § 1 and § 2 assert they agree, which is the F-018 lesson
// (three copies of "which day is it" disagreeing) applied before it happens
// rather than after.
//
//   node tests/closed-until.test.mjs   (§ 3 and § 5 are credential-free)

import "./_env.mjs";           // root .env -> process.env, before anything reads it
import { readFileSync } from "node:fs";
import { closedUntil } from "../app/src/book/core.js";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
let ANON = process.env.SUPABASE_ANON_KEY;

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const strip = (t) => t
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/^\s*--.*$/gm, "");

// ─── 3. The comparison, which is the same one in three places ─────────────
// Run first because it needs nothing. `closedUntil` is what a tenant site
// gets; the numbers below are the whole of the timezone question.
console.log("3. the comparison a tenant site inherits");
{
  // A fixed instant where the two zones are on different DATES: 20:00 on the
  // 7th in Los Angeles is 03:00 on the 8th in UTC. Any implementation that
  // ignores the timezone gives the same answer for both.
  // **`new Date()`, NOT `Date.now()`.** `businessToday` builds its date with
  // `new Date()`, so stubbing only `Date.now` moves nothing — the first run of
  // this file did exactly that and reported the UTC and Los Angeles answers as
  // identical, which reads as the timezone being ignored when it is the STUB
  // that is. The whole constructor is replaced instead.
  const RealDate = Date;
  const FIXED = new Date("2026-09-08T03:00:00Z");
  globalThis.Date = class extends RealDate {
    constructor(...args) { return args.length ? new RealDate(...args) : new RealDate(FIXED); }
    static now() { return FIXED.getTime(); }
  };
  try {
    const biz = { closed_until: "2026-09-08" };
    check("3a · closed until the 8th is OPEN in a zone where it is the 8th",
      closedUntil(biz, "UTC") === null);
    check("3b · and still CLOSED where it is only the 7th",
      closedUntil(biz, "America/Los_Angeles") === "2026-09-08");
    check("3c · which means the two zones disagree, as they must",
      closedUntil(biz, "UTC") !== closedUntil(biz, "America/Los_Angeles"));
    check("3d · a date already past is not closed",
      closedUntil({ closed_until: "2026-09-01" }, "America/Los_Angeles") === null);
    check("3e · and null is every business that has never gone away",
      closedUntil({}, "America/Los_Angeles") === null
        && closedUntil({ closed_until: null }, "UTC") === null);
    // A timestamp rather than a date is what a careless caller sends.
    check("3f · a timestamp is read as its date and nothing else",
      closedUntil({ closed_until: "2026-09-09T00:00:00+00:00" }, "America/Los_Angeles") === "2026-09-09");
  } finally { globalThis.Date = RealDate; }
}

// ─── 5. What only reading the source can see ─────────────────────────────
console.log("\n5. what only reading the source can see");
{
  const mig = strip(read("supabase/migrations/20260907002000_closed_until.sql"));
  check("5a · the pause is its own column and not `status`",
    /add column if not exists closed_until date/.test(mig)
      && !/update .*businesses[\s\S]*set[\s\S]*status/i.test(mig));

  const slots = strip(read("supabase/functions/available-slots/index.ts"));
  check("5b · available-slots closes the days before the return date",
    /closedUntil && date < closedUntil/.test(slots));
  // A 400 at the top would give a tenant site nothing to render but a failure,
  // which is how "closed for two weeks" becomes "this business is broken".
  check("5c · and does it per DAY, so a calendar can still be drawn",
    /for \(const date of days\)[\s\S]*?closedUntil && date < closedUntil/.test(slots));

  const tenant = strip(read("supabase/functions/_shared/tenant.ts"));
  check("5d · both public business lookups carry the column",
    (tenant.match(/closed_until, closed_note/g) ?? []).length === 2);

  // The RPC publishes an explicit key list, so a column is invisible to every
  // booking form in the world until it is named there.
  const rpc = strip(read("supabase/migrations/20260907002100_profile_publishes_closed.sql"));
  check("5e · the public profile publishes both fields",
    /'closed_until', b\.closed_until/.test(rpc) && /'closed_note', b\.closed_note/.test(rpc));

  const page = strip(read("app/src/book/BookingPage.jsx"));
  check("5f · the booking page explains rather than 404s",
    /closed until/i.test(page) && /closedUntil\(business/.test(page));
  // A detailer who is away AND half set up should be told the more specific,
  // more useful thing — a return date — not "isn't taking bookings online
  // yet", which reads as never.
  const awayAt = page.indexOf("const away = closedUntil(");
  const bookableAt = page.indexOf("if (!bookable(settings))");
  check("5g · and says it BEFORE the still-setting-up screen",
    awayAt > 0 && bookableAt > 0 && awayAt < bookableAt, `${awayAt} / ${bookableAt}`);

  const rules = strip(read("app/src/screens/more/BookingRules.jsx"));
  check("5h · the detailer's control writes closed_until, never status",
    /closed_until: form\.closed_until \|\| null/.test(rules)
      && !/status:/.test(rules));
  check("5i · and an empty note is stored as null, not as an empty string",
    /closed_note: form\.closed_note\?\.trim\(\) \|\| null/.test(rules));
}

// ─── The live half ────────────────────────────────────────────────────────
if (!URL_ || !SERVICE) {
  console.log("\n1, 2 and 4 SKIPPED — no SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, "
    + "so nothing was measured against the deployed function.");
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
if (!ANON) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` } });
  const keys = await res.json();
  ANON = keys.find((k) => k.name === "anon")?.api_key ?? keys.find((k) => k.type === "publishable")?.api_key;
}

const rest = async (method, path, body) => {
  const r = await fetch(`${URL_}${path}`, {
    method,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json", Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await r.text();
  let d = null; try { d = t ? JSON.parse(t) : null; } catch { d = t; }
  return { status: r.status, data: d };
};
const fn = async (name, body) => {
  const r = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  let d = null; try { d = t ? JSON.parse(t) : null; } catch { d = t; }
  return { status: r.status, data: d };
};

const SLUG = "demo-detail";
const biz = (await rest("GET", `/rest/v1/businesses?slug=eq.${SLUG}&select=id,timezone,closed_until,closed_note,status`)).data[0];
const svc = (await rest("GET",
  `/rest/v1/services?business_id=eq.${biz.id}&is_active=eq.true&select=id,duration_minutes&limit=1`)).data[0];
const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const openDays = async () => {
  const r = await fn("available-slots", {
    business_slug: SLUG, start_date: day(1), end_date: day(20),
    duration_minutes: svc.duration_minutes, service_ids: [svc.id],
  });
  return Object.values(r.data?.days ?? {}).filter((d) => (d.slots ?? []).length).length;
};
const setClosed = (v, note = null) =>
  rest("PATCH", `/rest/v1/businesses?slug=eq.${SLUG}`, { closed_until: v, closed_note: note });

try {
  // ─── 1. It really closes the calendar ───────────────────────────────────
  console.log("\n1. it really closes the calendar");
  const base = await openDays();
  check("1a · the demo has open days to lose", base > 0, String(base));
  await setClosed(day(10));
  const closed = await openDays();
  check("1b · closing until +10 removes days from the next three weeks",
    closed < base, `${base} → ${closed}`);
  check("1c · and does NOT close the whole month — the days after are still open",
    closed > 0, String(closed));

  // THE DATE IS THE DAY THEY ARE BACK, NOT THE LAST DAY SHUT. A detailer
  // typing "back on the 14th" means the 14th is bookable.
  //
  // **THIS COMPARES THE SAME DAY WITH AND WITHOUT THE CLOSURE, and the first
  // version did not.** It asked whether the return day had slots and fell back
  // to `open === false` for a day the business does not trade — which passes
  // for a return day the closure itself has shut, i.e. for exactly the defect
  // it exists to catch. Baselining found it: flipping `<` to `<=` in
  // `available-slots` shut the return day and this check stayed green.
  const slotsOn = async (d) => {
    const r = await fn("available-slots", {
      business_slug: SLUG, start_date: d, end_date: d,
      duration_minutes: svc.duration_minutes, service_ids: [svc.id],
    });
    return (r.data?.days?.[d]?.slots ?? []).length;
  };
  const RETURN_DAY = day(10);
  await setClosed(null);
  const openNormally = await slotsOn(RETURN_DAY);
  await setClosed(RETURN_DAY);
  const openWhileClosed = await slotsOn(RETURN_DAY);
  if (openNormally === 0) {
    check("1d · NOT MEASURED — the return day is one the demo does not trade", false,
      `pick a different offset than +10 (${RETURN_DAY})`);
  } else {
    check("1d · the return day itself is untouched, because it is the day they are back",
      openWhileClosed === openNormally, `${openNormally} slots → ${openWhileClosed}`);
    // Unconditional: a day inside the closure offers nothing, whether or not
    // the business trades on it. On its own this could be green for a day the
    // demo is shut anyway — 1b is what rules that out, by counting the days
    // the closure actually removed.
    check("1d-ii · while the day before it offers nothing at all",
      (await slotsOn(day(9))) === 0, `${await slotsOn(day(9))} slots on ${day(9)}`);
  }

  // ─── 2. It reopens itself ───────────────────────────────────────────────
  // A flag is the state a detailer forgets to switch off; a date is not.
  console.log("\n2. it reopens itself");
  await setClosed(day(-1));
  check("2a · a return date already past is not closed at all",
    (await openDays()) === base, String(base));
  await setClosed(null);
  check("2b · and clearing it puts every day back", (await openDays()) === base);

  // ─── 4. It is not `status`, and the two stack ──────────────────────────
  console.log("\n4. it is not `status`, and the two stack");
  {
    // The public profile is the whole read surface a booking page has.
    await setClosed(day(5), "Back from the 5th — call for anything urgent");
    const prof = (await rest("POST", "/rest/v1/rpc/get_public_business_profile",
      { p_slug: SLUG })).data;
    check("4a · a closed business still RESOLVES — the page stays up",
      !!prof?.business, JSON.stringify(prof?.business?.slug));
    check("4b · and carries the date and the note, so it can explain",
      String(prof.business.closed_until).slice(0, 10) === day(5)
        && /call for anything urgent/.test(prof.business.closed_note ?? ""),
      JSON.stringify(prof.business.closed_until));
    check("4c · while `status` is untouched by closing",
      prof.business && (await rest("GET",
        `/rest/v1/businesses?slug=eq.${SLUG}&select=status`)).data[0].status === biz.status);

    // SUSPENSION IS A DIFFERENT THING AND IT WINS. A business the platform
    // darkened for non-payment must stay dark whatever its own pause says.
    await rest("PATCH", `/rest/v1/businesses?slug=eq.${SLUG}`, { status: "paused" });
    const suspended = (await rest("POST", "/rest/v1/rpc/get_public_business_profile",
      { p_slug: SLUG })).data;
    check("4d · but a SUSPENDED business does not resolve at all, closed or not",
      !suspended?.business, JSON.stringify(suspended?.business?.slug));
    await rest("PATCH", `/rest/v1/businesses?slug=eq.${SLUG}`, { status: biz.status });
  }
} finally {
  await setClosed(
    biz.closed_until ? String(biz.closed_until).slice(0, 10) : null,
    biz.closed_note ?? null,
  );
  await rest("PATCH", `/rest/v1/businesses?slug=eq.${SLUG}`, { status: biz.status });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
