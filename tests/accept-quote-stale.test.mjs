// ROADMAP 97.16 — A CUSTOMER CANNOT ACCEPT A QUOTE THEY NEVER SAW, OR ONE
// WHOSE APPOINTMENT HAS PASSED. RUN, NOT READ.
//
// The page showed $200, the detailer re-quoted $300 while the booking was
// pending (`respond-to-booking` allows it), the customer pressed Accept and
// $300 was accepted, because `accept-quote` guarded only on the quote it read
// itself. The page now sends the `quoted_at` it showed and the function refuses
// when that is not the quote on the booking.
//
// THIS LOADS THE REAL `accept-quote/index.ts` (`loadEdge` in
// `scripts/lib/edgeLocal.mjs`) AND CALLS ITS HANDLER AS A FUNCTION against a
// fake Supabase held in this file — the `cron-secret.test.mjs` pattern. No
// socket, no secret, no database row. Every write the function makes is logged,
// so "refused, and nothing was written" is a measurement.
//
//   node tests/accept-quote-stale.test.mjs
//   QUOTE_BREAK=stale node tests/accept-quote-stale.test.mjs   # quoted_at guard cut: MUST be red
//   QUOTE_BREAK=past  node tests/accept-quote-stale.test.mjs   # start_at guard cut: MUST be red
//   QUOTE_BREAK=race  node tests/accept-quote-stale.test.mjs   # a write that matched nothing answers success again: MUST be red
//
// An env var, not a flag: `node --test` swallows extra arguments (gotchas 104).
// The sabotage rewrites the PRODUCTION file as it loads, and refuses to run if
// the rewrite did not land (gotchas 102).

import { registerHooks } from "node:module";
import net from "node:net";
import { writeFileSync } from "node:fs";
import { receiptFile, writeReceipt } from "../scripts/receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = process.env.QUOTE_BREAK || "";
const CUTS = {
  stale: `if (typeof shown !== "string" || Date.parse(shown) !== Date.parse(booking.quoted_at)) return changed();`,
  past: `if (new Date(booking.start_at).getTime() <= Date.now()) {`,
  race: `if (now?.status === "confirmed" && now.quoted_at === null) {`,
};
// What each cut leaves: the guard gone, or (past, race) its branch forced the pre-fix way.
const LEAVES = { stale: "", past: "if (false) {", race: "if (true) {" };
if (BREAK && !CUTS[BREAK]) { console.error(`Unknown QUOTE_BREAK=${BREAK}. Known: ${Object.keys(CUTS).join(", ")}.`); process.exit(2); }
let landed = false;
if (BREAK) {
  registerHooks({
    load(url, ctx, next) {
      const r = next(url, ctx);
      if (!url.endsWith("/accept-quote/index.ts")) return r;
      const src = String(r.source);
      const cut = src.replace(CUTS[BREAK], LEAVES[BREAK]);
      landed = cut !== src;
      return { ...r, source: cut };
    },
  });
}

let sockets = 0;
net.Socket.prototype.connect = function () { sockets++; throw new Error("accept-quote-stale.test opens no network connection"); };

let passed = 0, assertions = 0;
const failures = [];
const check = (name, ok, got = "") => {
  assertions++;
  if (ok) { passed++; console.log(`  ok    ${name}`); return true; }
  failures.push(got ? `${name} - got ${got}` : name);
  console.log(`  FAIL  ${name}${got ? ` - got ${got}` : ""}`);
  return false;
};

// ── THE FAKE SUPABASE ───────────────────────────────────────────────────────
const FAKE = "https://fake-supabase.invalid";
const BIZ = "11111111-1111-4111-8111-111111111111";
const T1 = "2026-10-17T10:00:00.123456+00:00";   // the quote the page showed ($200)
const T2 = "2026-10-17T10:05:00.654321+00:00";   // the detailer's re-quote ($300)
const ahead = new Date(Date.now() + 5 * 86400_000).toISOString();
const behind = new Date(Date.now() - 3600_000).toISOString();
const BUSINESSES = [{ id: BIZ, slug: "fx", name: "Fixture Detail", status: "active", timezone: "America/Los_Angeles", contact_email: "owner@fixture.test" }];
let bookings = [];
const booking = (id, extra) => ({
  id, business_id: BIZ, status: "pending", deleted_at: null, customer_name: "Pat Fixture", customer_email: "pat@fixture.test",
  start_at: ahead, end_at: ahead, service_type: "mobile", vehicle_size: "medium", subtotal: 150, total_price: 150,
  price_adjustments: null, quoted_amount: 200, quoted_note: null, quoted_at: T1, lang: "en", services: [], add_ons: [], ...extra,
});
const writes = [];
let beforeWrite = null;   // the race: something changes the row between the read and the write
const outside = [];

const send = (status, body, headers = {}) =>
  new Response(body === undefined ? "" : JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

globalThis.fetch = async (input, init) => {
  const req = new Request(input, init);
  const u = new URL(req.url);
  const text = ["GET", "HEAD"].includes(req.method) ? "" : await req.text();
  if (u.origin !== FAKE) { outside.push(`${req.method} ${u.origin}${u.pathname}`); return send(502, { message: "outside" }); }
  if (u.pathname === "/functions/v1/send-email") return send(200, { ok: true });
  if (u.pathname.startsWith("/rest/v1/rpc/")) return send(200, u.pathname.endsWith("/rate_take") ? true : []);
  const tbl = (u.pathname.match(/^\/rest\/v1\/([a-z_]+)$/) || [])[1];
  if (!tbl) return send(404, { message: "no fake for " + u.pathname });
  if (tbl === "bookings" && req.method === "PATCH" && beforeWrite) { beforeWrite(); beforeWrite = null; }
  let rows = tbl === "bookings" ? bookings : tbl === "businesses" ? BUSINESSES : [];
  for (const [k, v] of u.searchParams) {
    const m = String(v).match(/^eq\.(.*)$/);
    if (m) rows = rows.filter((r) => String(r[k]) === m[1]);
    if (v === "is.null") rows = rows.filter((r) => r[k] == null);
  }
  if (req.method === "PATCH") {
    writes.push({ table: tbl, body: JSON.parse(text || "{}"), matched: rows.length });
    for (const r of rows) Object.assign(r, JSON.parse(text || "{}"));
  }
  if (String(req.headers.get("accept") || "").includes("vnd.pgrst.object")) {
    // maybeSingle(): zero rows is an empty 200 body in PostgREST's eyes here.
    return rows.length === 1 ? send(200, rows[0]) : rows.length === 0 ? send(406, { code: "PGRST116", message: "0 rows" }) : send(406, {});
  }
  return send(200, rows, { "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
};

const ENV = { SUPABASE_URL: FAKE, SUPABASE_SERVICE_ROLE_KEY: "placeholder" };
const { loadEdge } = await import("../scripts/lib/edgeLocal.mjs");
const handlers = await loadEdge(["accept-quote"], ENV);
if (BREAK && !landed) { console.log(`NOT RUN — QUOTE_BREAK=${BREAK} did not land in accept-quote/index.ts.`); process.exit(1); }

const press = async (body) => {
  writes.length = 0;
  const r = await handlers.get("accept-quote")(new Request("http://local/functions/v1/accept-quote", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
  const t = await r.text();
  let data = null; try { data = JSON.parse(t); } catch { data = t; }
  return { status: r.status, data, wrote: writes.filter((w) => w.table === "bookings" && w.matched > 0).length };
};
const row = (id) => bookings.find((b) => b.id === id);
const transcript = [];
const note = (s) => transcript.push(s);
let completed = 0;
const SCENARIOS = 6;

// ── 1 . THE NORMAL ACCEPT: the page names the quote it showed ──────────────
console.log("\n1. the quote on screen is the quote on the booking");
bookings = [booking("b-ok")];
{
  const r = await press({ booking_id: "b-ok", quoted_at: T1 });
  note(`1 normal: ${r.status} ${JSON.stringify(r.data)} | row ${row("b-ok").status} ${row("b-ok").total_price}`);
  const a = check("1a . accepted (200)", r.status === 200 && r.data?.success === true, `${r.status} ${JSON.stringify(r.data)}`);
  const b = check("1b . the booking is confirmed at the quoted $200", row("b-ok").status === "confirmed" && Number(row("b-ok").total_price) === 200,
    `${row("b-ok").status} ${row("b-ok").total_price}`);
  if (a && b) completed++;
}

// ── 2 . THE DEFECT: the detailer re-quoted after the page loaded ───────────
console.log("\n2. the page showed $200, the detailer re-quoted $300, the customer pressed Accept");
bookings = [booking("b-stale", { quoted_amount: 300, quoted_at: T2 })];
{
  const r = await press({ booking_id: "b-stale", quoted_at: T1 });
  note(`2 stale: ${r.status} ${JSON.stringify(r.data)} | wrote ${r.wrote} | row ${row("b-stale").status} ${row("b-stale").total_price}`);
  const a = check("2a . refused (409)", r.status === 409, `${r.status} ${JSON.stringify(r.data)}`);
  const b = check("2b . with a plain reason naming the new price", /price changed to \$300/.test(r.data?.error ?? ""), JSON.stringify(r.data?.error));
  const c = check("2c . and nothing was written: still pending at $150", r.wrote === 0 && row("b-stale").status === "pending" && Number(row("b-stale").total_price) === 150,
    `wrote ${r.wrote}, ${row("b-stale").status} ${row("b-stale").total_price}`);
  if (a && b && c) completed++;
}

// ── 3 . A PRESS THAT NAMES NO QUOTE (a page from before this fix) ──────────
console.log("\n3. a press that names no quote at all");
bookings = [booking("b-none")];
{
  const r = await press({ booking_id: "b-none" });
  note(`3 none: ${r.status} ${JSON.stringify(r.data)} | wrote ${r.wrote}`);
  const a = check("3a . refused (409) with a plain reason", r.status === 409 && /price changed/.test(r.data?.error ?? ""), `${r.status} ${JSON.stringify(r.data)}`);
  const b = check("3b . and nothing was written", r.wrote === 0 && row("b-none").status === "pending", `wrote ${r.wrote}`);
  if (a && b) completed++;
}

// ── 4 . THE APPOINTMENT HAS PASSED (C-L6) ──────────────────────────────────
console.log("\n4. the right quote, but the appointment's time has passed");
bookings = [booking("b-past", { start_at: behind, end_at: behind })];
{
  const r = await press({ booking_id: "b-past", quoted_at: T1 });
  note(`4 past: ${r.status} ${JSON.stringify(r.data)} | wrote ${r.wrote}`);
  const a = check("4a . refused (409) with a plain reason", r.status === 409 && /time has passed/.test(r.data?.error ?? ""), `${r.status} ${JSON.stringify(r.data)}`);
  const b = check("4b . and nothing was written", r.wrote === 0 && row("b-past").status === "pending", `wrote ${r.wrote}, ${row("b-past").status}`);
  if (a && b) completed++;
}

// ── 5 . THE RACE: re-quoted between the function's read and its write ──────
console.log("\n5. the detailer re-quotes in the instant between the read and the write");
bookings = [booking("b-race")];
beforeWrite = () => Object.assign(row("b-race"), { quoted_amount: 300, quoted_at: T2 });
{
  const r = await press({ booking_id: "b-race", quoted_at: T1 });
  note(`5 race: ${r.status} ${JSON.stringify(r.data)} | row ${row("b-race").status} ${row("b-race").quoted_amount}`);
  const a = check("5a . NOT answered as a success", r.status === 409 && r.data?.success !== true, `${r.status} ${JSON.stringify(r.data)}`);
  const b = check("5b . and the booking is still pending on the new quote", row("b-race").status === "pending" && Number(row("b-race").quoted_amount) === 300,
    `${row("b-race").status} ${row("b-race").quoted_amount}`);
  if (a && b) completed++;
}

// ── 6 . A RETRY AFTER IT LANDED is still answered as done (ROADMAP 6.4) ────
console.log("\n6. pressing Accept again after it landed");
bookings = [booking("b-again")];
{
  await press({ booking_id: "b-again", quoted_at: T1 });
  const r = await press({ booking_id: "b-again", quoted_at: T1 });
  note(`6 again: ${r.status} ${JSON.stringify(r.data)} | wrote ${r.wrote}`);
  const a = check("6a . answered as done (200, duplicate)", r.status === 200 && r.data?.duplicate === true, `${r.status} ${JSON.stringify(r.data)}`);
  const b = check("6b . and no second write", r.wrote === 0, String(r.wrote));
  if (a && b) completed++;
}

console.log("\n0. the run itself");
check("0a . no socket was opened", sockets === 0, String(sockets));
check("0b . no request went anywhere but the in-memory fake", outside.length === 0, outside.join(", "));

const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions, ${completed} of ${SCENARIOS} scenarios complete.`);
if (BREAK) console.log(`  note  QUOTE_BREAK=${BREAK} was set: this run is a sabotage and MUST be red.`);

const txt = BREAK ? receiptFile(`accept-quote-stale.sabotage-${BREAK}.txt`) : receiptFile("accept-quote-stale.txt");
writeFileSync(txt, [`accept-quote-stale ${new Date().toISOString()} break=${BREAK || "none"}`, ...transcript,
  `${passed} passed, ${failed} failed`, ...failures.map((f) => "FAIL " + f)].join("\n") + "\n");
writeReceipt({
  check_id: BREAK ? `accept-quote-stale-${BREAK}` : "accept-quote-stale",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: SCENARIOS,
  discovered_targets: SCENARIOS,
  attempted_targets: SCENARIOS,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 15,
  assertion_floor: "2+3+2+2+2+2 scenario checks + 2 run checks = 15, every check() unconditional (docs/gotchas.md 98).",
  canary: { id: "pre-fix-stale-accept", observed_failure: BREAK ? failed > 0 : null, what: "QUOTE_BREAK=stale|past|race cut the production guard as it loads" },
  failures,
  artifacts: [txt],
  dimensions: { roadmap: "97.16", break: BREAK || null },
  warnings: ["The handler runs in-process against a fake Supabase in this file, not the live database; it proves the function's own decisions."],
});
process.exit(failed ? 1 : 0);
