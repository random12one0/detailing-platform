// ROADMAP 97.53 - the private per-business calendar feed, RUN rather than read.
//
//   node --test tests/calendar-feed.test.mjs            (credential-free)
//
// THE HANDLER ITSELF IS EXECUTED. `calendar-feed/index.ts` is stripped of its
// types, its imports are swapped for the real pure helpers (`buildCalendar`
// from _shared/ics.ts, `json`/`preflight`
// from _shared/http.ts) plus an in-memory stand-in for the database, and the
// function `Deno.serve` was handed is called with real `Request` objects.
// Two businesses, a frozen clock, and the stand-in honours every filter, order
// and range the handler sends - so dropping a filter from the handler lets the
// other business's row through here exactly as it would against PostgREST.
//
// Every protection is then REMOVED from the real source, one at a time, and
// the same scenario must go red (section 3). Nothing here touches a network,
// a browser or a file outside this copy.
//
// What it does NOT prove: the stand-in is not PostgREST (a real request is the
// LIVE RUN line in the ROADMAP entry), and who may READ or RESET the token is
// the database's row-level policy, executed in
// tests/calendar-feed-token-sql.test.mjs.

import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const ICS = read("supabase/functions/_shared/ics.ts");
const FEED = read("supabase/functions/calendar-feed/index.ts");
const HTTP = read("supabase/functions/_shared/http.ts");

const grab = (src, re, name) => {
  const m = re.exec(src);
  assert.ok(m, `${name} not found - the extractor, not the product, is stale`);
  return m[0].replace(/^export /m, "");
};
const strip = (ts) => stripTypeScriptTypes(ts);

// ---------------------------------------------------------------------------
// The real pure helpers.
// ---------------------------------------------------------------------------

const loadIcs = (src) => {
  const parts = [
    grab(src, /const escapeICS = [\s\S]*?;\n/, "escapeICS"),
    grab(src, /function localStamp[\s\S]*?\n}\n/, "localStamp"),
    grab(src, /function utcOffset[\s\S]*?\n}\n/, "utcOffset"),
    grab(src, /function zoneAbbrev[\s\S]*?\n}\n/, "zoneAbbrev"),
    grab(src, /export function vtimezoneLines[\s\S]*?\n}\n/, "vtimezoneLines"),
    grab(src, /export function veventLines[\s\S]*?\n}\n/, "veventLines"),
    grab(src, /export function buildCalendar[\s\S]*?\n}\n/, "buildCalendar"),
    grab(src, /export function buildIcs[\s\S]*?\n}\n/, "buildIcs"),
  ];
  const js = strip("const PLATFORM_DOMAIN = \"detailingplatform.com\";\n" + parts.join("\n"));
  return new Function(`${js}; return { buildCalendar, buildIcs };`)();
};
const { buildCalendar, buildIcs } = loadIcs(ICS);
const http = new Function(`${strip(HTTP.replace(/^export /gm, ""))}; return { CORS_HEADERS, json, preflight };`)();

// ---------------------------------------------------------------------------
// The in-memory database: the subset of the supabase-js builder the handler
// uses, applied for real. A 1000-row cap per response, like PostgREST.
// ---------------------------------------------------------------------------

function fakeDb(tables, fail = {}) {
  const reads = [];
  const from = (table) => {
    const filters = [], orders = [];
    let range = null;
    const run = async (single) => {
      reads.push(table);
      if (fail[table]) return { data: null, error: { message: `${table} is down` } };
      let rows = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
      rows.sort((a, b) => {
        for (const [c, asc] of orders) if (a[c] !== b[c]) return (a[c] < b[c] ? -1 : 1) * (asc ? 1 : -1);
        return 0;
      });
      rows = range ? rows.slice(range[0], range[1] + 1) : rows;
      rows = rows.slice(0, 1000);
      if (single) {
        if (rows.length > 1) return { data: null, error: { message: "more than one row" } };
        return { data: rows[0] ? structuredClone(rows[0]) : null, error: null };
      }
      return { data: structuredClone(rows), error: null };
    };
    const b = {
      select: () => b,
      eq: (c, v) => (filters.push((r) => r[c] === v), b),
      in: (c, vs) => (filters.push((r) => vs.includes(r[c])), b),
      neq: (c, v) => (filters.push((r) => r[c] !== v), b),
      is: (c, v) => (filters.push((r) => (r[c] ?? null) === v), b),
      gte: (c, v) => (filters.push((r) => r[c] >= v), b),
      order: (c, o) => (orders.push([c, o?.ascending !== false]), b),
      range: (a, z) => ((range = [a, z]), b),
      limit: (n) => ((range = [0, n - 1]), b),
      maybeSingle: () => run(true),
      then: (ok, bad) => run(false).then(ok, bad),
    };
    return b;
  };
  return { from, reads };
}

// ---------------------------------------------------------------------------
// The handler, from its real source.
// ---------------------------------------------------------------------------

const NOW = new Date("2026-11-01T12:00:00.000Z");
class FrozenDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(NOW.getTime()); }
  static now() { return NOW.getTime(); }
}

const IMPORTS = [
  'import "jsr:@supabase/functions-js/edge-runtime.d.ts";',
  'import { supabase } from "../_shared/db.ts";',
  'import { CORS_HEADERS, json, preflight } from "../_shared/http.ts";',
  'import { businessBySlug } from "../_shared/tenant.ts";',
  'import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";',
  'import { buildCalendar } from "../_shared/ics.ts";',
];

function loadHandler(src, db, cal = buildCalendar) {
  const found = src.split("\n").filter((l) => l.startsWith("import "));
  assert.deepEqual(found, IMPORTS, "the handler's imports changed - give the new one a stand-in here");
  let body = src.split("\n").filter((l) => !l.startsWith("import ")).join("\n");
  assert.ok(body.includes("Deno.serve("), "the handler no longer calls Deno.serve");
  body = strip(body).replace("Deno.serve(", "__serve(");
  let handler = null;
  const businessBySlug = async (slug) =>
    db.tables.businesses.find((b) => b.slug === String(slug).trim().toLowerCase() && b.status === "active") ?? null;
  new Function(
    "supabase", "CORS_HEADERS", "json", "preflight", "businessBySlug",
    "ipOf", "LIMITS", "withinLimits", "buildCalendar", "Date", "__serve", body,
  )(
    db, http.CORS_HEADERS, http.json, http.preflight, businessBySlug,
    () => "203.0.113.9", { publicCeiling: { limit: 1000, windowSec: 60 } }, async () => true,
    cal, FrozenDate, (h) => { handler = h; },
  );
  assert.ok(handler, "Deno.serve was never handed a function");
  return handler;
}

// ---------------------------------------------------------------------------
// Two businesses. A's jobs span a daylight-saving change.
// ---------------------------------------------------------------------------

const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const B = "bbbbbbbb-0000-4000-8000-00000000000b";
const TOKEN_A = "a1".repeat(32);
const TOKEN_B = "b2".repeat(32);
const iso = (s) => new Date(s).toISOString();

const job = (id, business_id, start, end, over = {}) => ({
  id, business_id, start_at: iso(start), end_at: iso(end), status: "confirmed", deleted_at: null,
  customer_name: `Customer ${id}`, customer_phone: "562-555-0447", customer_notes: null,
  vehicle_model: null, service_type: "shop", customer_address: null,
  ...over,
});
// The booking_services rows: one "Full Detail" per job unless a job names its own.
const linesOf = (bookings, extra = []) => [
  ...bookings.filter((b) => !extra.some((l) => l.booking_id === b.id))
    .map((b) => ({ booking_id: b.id, business_id: b.business_id, name_at_booking: "Full Detail" })),
  ...extra,
];

function world() {
  const t = {
    businesses: [
      { id: A, slug: "alpha", status: "active", name: "Alpha", timezone: "America/Los_Angeles", contact_email: "a@example.com", contact_phone: null, dropoff_address: "1 A St" },
      { id: B, slug: "bravo", status: "active", name: "Bravo", timezone: "America/New_York", contact_email: "b@example.com", contact_phone: null, dropoff_address: "2 B St" },
    ],
    business_settings: [
      { business_id: A, calendar_feed_token: TOKEN_A },
      { business_id: B, calendar_feed_token: TOKEN_B },
    ],
    bookings: [
      // 10:00 AM in Los Angeles in winter (PST, -8) and in summer (PDT, -7).
      job("a-winter", A, "2026-12-01T18:00:00Z", "2026-12-01T20:00:00Z"),
      job("a-summer", A, "2027-07-01T17:00:00Z", "2027-07-01T19:00:00Z"),
      job("a-ongoing", A, "2026-11-01T11:00:00Z", "2026-11-01T13:00:00Z"),
      job("a-mixed", A, "2026-11-20T18:00:00Z", "2026-11-20T19:00:00Z"),
      job("a-past", A, "2026-10-01T18:00:00Z", "2026-10-01T19:00:00Z"),
      job("a-cancelled", A, "2026-11-10T18:00:00Z", "2026-11-10T19:00:00Z", { status: "cancelled" }),
      job("a-deleted", A, "2026-11-11T18:00:00Z", "2026-11-11T19:00:00Z", { deleted_at: iso("2026-10-20T00:00:00Z") }),
      job("b-upcoming", B, "2026-11-15T15:00:00Z", "2026-11-15T16:00:00Z", { customer_name: "Bravo Customer" }),
    ],
  };
  // a-mixed carries a line another business smuggled onto it.
  t.booking_services = linesOf(t.bookings, [
    { booking_id: "a-mixed", business_id: A, name_at_booking: "Wash" },
    { booking_id: "a-mixed", business_id: B, name_at_booking: "SMUGGLED" },
  ]);
  return t;
}

const A_EXPECTED = ["a-ongoing", "a-mixed", "a-winter", "a-summer"];

async function call(src, tables, qs, { fail = {}, cal } = {}) {
  const db = fakeDb(tables, fail);
  db.tables = tables;
  const res = await loadHandler(src, db, cal)(new Request(`https://x.test/calendar-feed?${qs}`));
  return { res, body: await res.text(), reads: db.reads };
}
const uids = (body) => [...body.matchAll(/UID:booking-(.+?)-owner@/g)].map((m) => m[1]);
const lineOf = (body, uid, key) => {
  const ev = body.split("BEGIN:VEVENT").find((e) => e.includes(`UID:booking-${uid}-owner@`)) ?? "";
  return ev.split("\r\n").find((l) => l.startsWith(key)) ?? "";
};
// What a calendar client does with `DTSTART:...Z`: an instant, shown in the
// business's own zone.
const shownAt = (line, tz) => {
  const m = /:(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/.exec(line);
  if (!m) return `not a UTC instant: ${line}`;
  const at = new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, dateStyle: "short", timeStyle: "short" }).format(at);
};

// ---------------------------------------------------------------------------
// The scenarios. Each returns its problems, so section 3 can re-run the same
// question against a sabotaged handler and require it to go red.
// ---------------------------------------------------------------------------

const SCENARIOS = {
  async "the right token gets this business's upcoming jobs and nothing else"(src, o) {
    const p = [];
    const { res, body } = await call(src, world(), `business=alpha&token=${TOKEN_A}`, o);
    if (res.status !== 200) return [`status ${res.status}`];
    if (!/^text\/calendar/.test(res.headers.get("content-type") ?? "")) p.push("not served as text/calendar");
    if (!body.startsWith("BEGIN:VCALENDAR") || !body.endsWith("END:VCALENDAR")) p.push("not one whole calendar");
    if (/[^\r]\n/.test(body)) p.push("bare LF line endings");
    const got = uids(body);
    if (JSON.stringify(got) !== JSON.stringify(A_EXPECTED)) p.push(`jobs ${JSON.stringify(got)}, expected ${JSON.stringify(A_EXPECTED)}`);
    if (body.includes("Bravo Customer")) p.push("business B's job is in A's feed");
    if (body.includes("SMUGGLED")) p.push("a line from another business reached the feed");
    if (!lineOf(body, "a-mixed", "SUMMARY").includes("Wash")) p.push("a job lost its own service line");
    if (!body.includes("562-555-0447")) p.push("the owner's copy lost the customer phone");
    return p;
  },
  async "winter and summer jobs are read at 10:00 AM in the business's zone"(src, o) {
    const { res, body } = await call(src, world(), `business=alpha&token=${TOKEN_A}`, o);
    if (res.status !== 200) return [`status ${res.status}`];
    const p = [];
    const w = shownAt(lineOf(body, "a-winter", "DTSTART"), "America/Los_Angeles");
    const s = shownAt(lineOf(body, "a-summer", "DTSTART"), "America/Los_Angeles");
    if (w !== "12/1/26, 10:00 AM") p.push(`winter job shown at ${w}`);
    if (s !== "7/1/27, 10:00 AM") p.push(`summer job shown at ${s}`);
    if (body.includes("BEGIN:VTIMEZONE")) p.push("the feed still carries a zone definition");
    return p;
  },
  async "business B's token opens B's feed and only B's"(src, o) {
    const { res, body } = await call(src, world(), `business=bravo&token=${TOKEN_B}`, o);
    if (res.status !== 200) return [`status ${res.status}`];
    const got = uids(body);
    return JSON.stringify(got) === '["b-upcoming"]' ? [] : [`B's feed holds ${JSON.stringify(got)}`];
  },
  async "a wrong, missing, borrowed or reset token is refused before any booking is read"(src, o) {
    const p = [];
    const cases = {
      "wrong token": `business=alpha&token=${"f".repeat(64)}`,
      "missing token": "business=alpha",
      "A's token on B": `business=bravo&token=${TOKEN_A}`,
      "unknown business": `business=nobody&token=${TOKEN_A}`,
    };
    const bodies = new Set();
    for (const [name, qs] of Object.entries(cases)) {
      const { res, body, reads } = await call(src, world(), qs, o);
      if (res.status !== 404) p.push(`${name}: status ${res.status}`);
      if (reads.includes("bookings")) p.push(`${name}: bookings were read`);
      bodies.add(body);
    }
    if (bodies.size !== 1) p.push(`refusals differ: ${[...bodies].join(" | ")}`);
    // A reset: the stored token moves on; the old link dies, the new one works.
    const t = world();
    t.business_settings[0].calendar_feed_token = "c3".repeat(32);
    const old = await call(src, t, `business=alpha&token=${TOKEN_A}`, o);
    if (old.res.status !== 404) p.push(`reset: the old token got status ${old.res.status}`);
    const fresh = await call(src, t, `business=alpha&token=${"c3".repeat(32)}`, o);
    if (fresh.res.status !== 200) p.push(`reset: the new token got status ${fresh.res.status}`);
    return p;
  },
  async "a failed read is a retryable 503, never an empty calendar"(src, o) {
    const p = [];
    for (const table of ["bookings", "business_settings", "booking_services"]) {
      const { res, body } = await call(src, world(), `business=alpha&token=${TOKEN_A}`, { ...o, fail: { [table]: true } });
      if (res.status !== 503) p.push(`${table} down: status ${res.status}`);
      if (!res.headers.get("retry-after")) p.push(`${table} down: no Retry-After`);
      if (body.includes("BEGIN:VCALENDAR")) p.push(`${table} down: answered with a calendar`);
    }
    return p;
  },
  async "every upcoming job is in the feed, past the first page"(src, o) {
    const t = world();
    t.bookings = Array.from({ length: 1005 }, (_, i) => {
      const at = Date.UTC(2026, 10, 2) + i * 3_600_000;
      return job(`n${String(i).padStart(4, "0")}`, A, at, at + 1_800_000);
    });
    t.booking_services = linesOf(t.bookings);
    const { res, body } = await call(src, t, `business=alpha&token=${TOKEN_A}`, o);
    if (res.status !== 200) return [`status ${res.status}`];
    const got = uids(body);
    const p = [];
    if (got.length !== 1005) p.push(`${got.length} of 1005 jobs`);
    if (!got.includes("n1004")) p.push("the 1005th job is missing");
    if (new Set(got).size !== got.length) p.push("a job appears twice");
    if (!lineOf(body, "n1004", "SUMMARY").includes("Full Detail")) p.push("the last job lost its service line");
    return p;
  },
};

for (const [name, run] of Object.entries(SCENARIOS)) {
  test(name, async () => assert.deepEqual(await run(FEED), []));
}

// ---------------------------------------------------------------------------
// 3. Remove each protection from the REAL source; the scenario must go red.
// ---------------------------------------------------------------------------

const SABOTAGE = [
  ["no business scope on the bookings read", "the right token gets this business's upcoming jobs and nothing else",
    (s) => s.replace('.from("bookings")\n        .select("*")\n        .eq("business_id", business.id)',
      '.from("bookings")\n        .select("*")')],
  ["no business scope on the service-line read", "the right token gets this business's upcoming jobs and nothing else",
    (s) => s.replace('.select("booking_id, name_at_booking")\n        .eq("business_id", business.id)',
      '.select("booking_id, name_at_booking")')],
  ["service-line error ignored", "a failed read is a retryable 503, never an empty calendar",
    (s) => s.replace("if (error || !lines) return retryLater();", "if (!lines) continue;")],
  ["service lines for the first slice only", "every upcoming job is in the feed, past the first page",
    (s) => s.replace("i += LINES_SLICE)", "i += rows.length)")],
  ["no upcoming-only filter", "the right token gets this business's upcoming jobs and nothing else",
    (s) => s.replace('.gte("end_at", now)', "")],
  ["cancelled kept", "the right token gets this business's upcoming jobs and nothing else",
    (s) => s.replace('.neq("status", "cancelled")', "")],
  ["deleted kept", "the right token gets this business's upcoming jobs and nothing else",
    (s) => s.replace('.is("deleted_at", null)', "")],
  ["no token comparison", "a wrong, missing, borrowed or reset token is refused before any booking is read",
    (s) => s.replace("settings.calendar_feed_token !== token", "false")],
  ["bookings error ignored", "a failed read is a retryable 503, never an empty calendar",
    (s) => s.replace("if (error || !page) return retryLater();", "if (!page) break;")],
  ["settings error ignored", "a failed read is a retryable 503, never an empty calendar",
    (s) => s.replace("if (settingsError) return retryLater();", "")],
  ["one page only", "every upcoming job is in the feed, past the first page",
    (s) => s.replace("if (page.length < FEED_PAGE) break;", "break;")],
];

for (const [what, scenario, edit] of SABOTAGE) {
  test(`canary: ${what} is caught by "${scenario}"`, async () => {
    const bad = edit(FEED);
    assert.notEqual(bad, FEED, `the sabotage "${what}" did not apply - its target text moved`);
    assert.notDeepEqual(await SCENARIOS[scenario](bad), [], `the handler with "${what}" still passed`);
  });
}

test("canary: zone-local times in the feed are caught by the winter/summer reading", async () => {
  const cut = "lines.push(...veventLines(ev, dtStamp, true));";
  assert.ok(ICS.includes(cut), "the canary did not apply - the feed loop moved");
  const local = loadIcs(ICS.replace(cut, "lines.push(...veventLines(ev, dtStamp));")).buildCalendar;
  assert.notDeepEqual(await SCENARIOS["winter and summer jobs are read at 10:00 AM in the business's zone"](FEED, { cal: local }), []);
});

// ---------------------------------------------------------------------------
// 4. The bytes on their own, and the per-booking file left as it was.
// ---------------------------------------------------------------------------

const ev = (over = {}) => ({
  uid: "booking-aaa-owner", timezone: "America/Los_Angeles",
  start: new Date("2026-11-04T17:00:00Z"), end: new Date("2026-11-04T19:00:00Z"),
  summary: "Chris Vogel - Full Detail", ...over,
});

test("commas, semicolons and newlines in a name cannot break the calendar", () => {
  const out = buildCalendar([ev({ summary: "Doe, John; Jr\nSr" })]);
  assert.ok(out.includes("SUMMARY:Doe\\, John\\; Jr\\nSr"));
});

test("a quiet week is an empty calendar, not an error", () => {
  const out = buildCalendar([]);
  assert.ok(out.startsWith("BEGIN:VCALENDAR") && out.endsWith("END:VCALENDAR"));
  assert.equal(out.split("BEGIN:VEVENT").length - 1, 0);
});

test("the single-booking file still makes one zone-stamped event", () => {
  const out = buildIcs(ev());
  assert.equal(out.split("BEGIN:VEVENT").length - 1, 1);
  assert.equal(out.split("BEGIN:VTIMEZONE").length - 1, 1);
  assert.ok(out.includes("DTSTART;TZID=America/Los_Angeles:20261104T090000"));
});

// ---------------------------------------------------------------------------
// 5. The save rule: the screen reports "New link ready" only when a changed
// row comes back. Zero rows - what PostgREST answers when the permission is
// gone - is a failure.
// ---------------------------------------------------------------------------
import { feedTokenSaved } from "../app/src/lib/calendarFeed.js";

test("the save reports the token only when a row actually changed", () => {
  const good = "ab".repeat(32);
  assert.equal(feedTokenSaved([{ calendar_feed_token: good }], null), good, "a saved row");
  assert.equal(feedTokenSaved([], null), null, "zero rows is not success");
  assert.equal(feedTokenSaved(null, null), null, "no data is not success");
  assert.equal(feedTokenSaved([{ calendar_feed_token: good }], new Error("denied")), null, "an error is not success");
  assert.equal(feedTokenSaved([{ other: 1 }], null), null, "a row without the token is not success");
});
