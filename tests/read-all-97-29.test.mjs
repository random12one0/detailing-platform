// ROADMAP 97.29 — MONEY COUNTS EVERY ROW PAST 1,000, AND PAGING NEVER SKIPS OR
// DOUBLE-COUNTS ROWS THAT TIE ON THE SORT KEY.
//
//   node --test tests/read-all-97-29.test.mjs
//
// Credential-free, no network. The REAL supabase-js client talks to a stand-in
// PostgREST (`global.fetch`) that behaves like the live one where it matters:
// an answer stops at 1,000 rows whatever was asked for, and rows that tie on
// every ORDER BY column come back in a different order on every request (Postgres
// is free to do that; alternating makes it certain). A scratch business has
// 1,250 finished jobs, three to a start time, plus 1,600 invoice lines and 1,100
// expenses; a second business's rows sit beside them. Reads go through the
// production `readAll`, the totals through the production `advancedMoney`
// (the arithmetic behind Money), and each must equal a direct sum.
//
// Section 1 holds the screens to it: every read named there must go through
// `readAll` (or Clients'/Gallery's throwing `every` wrapper of it) and end its
// order in `id`. On the unfixed code it fails (no readAll, single requests).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { readAll } from "../app/src/lib/readAll.js";
import { advancedMoney } from "../app/src/lib/moneyAdvanced.js";

const { createClient } = createRequire(import.meta.url)("../app/node_modules/@supabase/supabase-js");

// ── 1. the screens read in pages, ordered down to id ─────────────────────────
const PAGED = [
  // [file under app/src, table, how many paged reads of it]
  ["hooks/useBookings.js", "bookings", 1],          // the date-range read Money, Today and Calendar share
  ["screens/Money.jsx", "expenses", 1],
  ["screens/Money.jsx", "booking_line_items", 1],
  ["screens/Money.jsx", "bookings", 1],             // who owes me
  ["screens/Money.jsx", "campaign_visits", 1],
  ["components/AdvancedMoney.jsx", "bookings", 1],  // history before the period (new vs returning)
  ["screens/Business.jsx", "campaign_visits", 1],
  ["screens/more/Campaigns.jsx", "campaign_visits", 1],
  ["screens/more/Campaigns.jsx", "bookings", 1],
  ["screens/Clients.jsx", "bookings", 2],           // lifetime totals + the export
  ["screens/Clients.jsx", "customers", 1],          // the export
  ["screens/Today.jsx", "bookings", 1],
  ["screens/Today.jsx", "customers", 1],
  ["screens/more/Plans.jsx", "bookings", 1],
  ["screens/more/Plans.jsx", "plan_visits", 1],
  ["screens/more/Plans.jsx", "customers", 1],
  ["screens/more/Gallery.jsx", "job_photos", 1],
  ["screens/more/Gallery.jsx", "gallery_images", 1],
];
// The text of every `readAll(` / `every(` call, by balanced parentheses.
const pagedCalls = (src) => {
  const out = [];
  for (const m of src.matchAll(/\b(?:readAll|every)\(\(\) =>/g)) {
    let depth = 0, i = m.index + m[0].indexOf("(");
    for (; i < src.length; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")" && --depth === 0) break;
    }
    out.push(src.slice(m.index, i + 1));
  }
  return out;
};
for (const [file, table, want] of PAGED) {
  test(`paged: ${file} reads ${table} through readAll, ordered down to id`, () => {
    const calls = pagedCalls(readFileSync(new URL(`../app/src/${file}`, import.meta.url), "utf8"))
      .filter((c) => c.includes(`.from("${table}")`));
    assert.equal(calls.length, want, `${calls.length} of ${want} reads of ${table} are paged`);
    for (const c of calls) assert.match(c, /\.order\("id", \{ ascending: true \}\)/, `no id tie-break in:\n${c}`);
  });
}

// ── the stand-in PostgREST ───────────────────────────────────────────────────
const MAX_ROWS = 1000;
const BIZ = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const at = (i) => new Date(Date.UTC(2023, 0, 1) + Math.floor(i / 3) * 86400_000);  // three jobs per start time
const DB = { bookings: [], booking_line_items: [], expenses: [] };
for (let i = 0; i < 1250; i++) {
  // ids run against the date order, so id order and start order disagree
  DB.bookings.push({ id: uid(5000 - i), business_id: BIZ, status: "completed", payment_status: "paid",
    start_at: at(i).toISOString(), final_amount: 80 + (i % 7) * 15.25, total_price: 80, deleted_at: null });
}
for (let i = 0; i < 300; i++) {
  DB.bookings.push({ id: uid(9000 + i), business_id: OTHER, status: "completed", payment_status: "paid",
    start_at: at(i).toISOString(), final_amount: 999, total_price: 999, deleted_at: null });
}
for (let i = 0; i < 1600; i++) {
  DB.booking_line_items.push({ id: uid(20000 + i), business_id: BIZ, booking_id: DB.bookings[i % 1250].id,
    category: i % 2 ? "tip" : "add_on", amount: 5 + (i % 4), quantity: 1 });
}
for (let i = 0; i < 1100; i++) {
  DB.expenses.push({ id: uid(40000 + i), business_id: BIZ, date: at(i).toISOString().slice(0, 10),
    amount: 12.5 + (i % 3), category: "Supplies" });
}

let calls = 0;
let failFromOffset = Infinity;
async function standIn(input) {
  const url = new URL(typeof input === "string" ? input : input.url);
  const table = url.pathname.split("/").pop();
  const offset = Number(url.searchParams.get("offset") || 0);
  if (offset >= failFromOffset) {
    return new Response(JSON.stringify({ message: "page failed" }), { status: 500, headers: { "content-type": "application/json" } });
  }
  const flip = ++calls % 2 === 0;
  let rows = DB[table].filter((r) => [...url.searchParams].every(([k, v]) =>
    v.startsWith("eq.") ? String(r[k]) === v.slice(3) : v === "is.null" ? r[k] == null : true));
  const keys = (url.searchParams.get("order") || "").split(",").filter(Boolean)
    .map((s) => { const [col, dir] = s.split("."); return { col, desc: dir === "desc" }; });
  rows = rows.map((r, i) => ({ r, k: flip ? -i : i })).sort((a, b) => {
    for (const { col, desc } of keys) {
      if (a.r[col] !== b.r[col]) return (a.r[col] < b.r[col]) === desc ? 1 : -1;
    }
    return a.k - b.k;   // a tie the ORDER BY did not break: order differs per request
  }).map((x) => x.r);
  const limit = Math.min(Number(url.searchParams.get("limit") || MAX_ROWS), MAX_ROWS);
  const page = rows.slice(offset, offset + limit);
  return new Response(JSON.stringify(page), { status: 200, headers: {
    "content-type": "application/json", "content-range": `${offset}-${offset + page.length - 1}/*` } });
}
const db = createClient("http://stand-in.invalid", "not-a-key",
  { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: standIn } });

const mine = (t) => DB[t].filter((r) => r.business_id === BIZ);
const cents = (x) => Math.round(x * 100);
const withDate = (b) => ({ ...b, booking_date: b.start_at.slice(0, 10) });
const period = { start: "2020-01-01", end: "2030-12-31" };
const bookingsQ = (tieBreak = true) => () => {
  const q = db.from("bookings").select("*").eq("business_id", BIZ).is("deleted_at", null)
    .order("start_at", { ascending: true });
  return tieBreak ? q.order("id", { ascending: true }) : q;
};

// ── 2. paged: every row once, and Money's totals equal the direct sums ──────
test("over 1,000 rows: Money totals equal a direct sum", async () => {
  const [b, li, ex] = await Promise.all([
    readAll(bookingsQ()),
    readAll(() => db.from("booking_line_items").select("*").eq("business_id", BIZ).order("id", { ascending: true })),
    readAll(() => db.from("expenses").select("*").eq("business_id", BIZ)
      .order("date", { ascending: false }).order("id", { ascending: true })),
  ]);
  assert.equal(b.error, null);
  const ids = new Set(b.data.map((r) => r.id));
  assert.equal(b.data.length, 1250, "bookings read");
  assert.equal(ids.size, 1250, "no booking read twice");
  assert.ok(b.data.every((r) => r.business_id === BIZ), "only the signed-in business");
  assert.ok(ids.has(mine("bookings").at(-1).id), "the newest job is there");
  assert.equal(li.data.length, 1600);
  assert.equal(new Set(ex.data.map((r) => r.id)).size, 1100);

  const m = advancedMoney({ bookings: b.data.map(withDate), expenses: ex.data, lineItems: li.data, period });
  const direct = {
    jobs: 1250,
    earned: mine("bookings").reduce((s, r) => s + r.final_amount, 0),
    spent: mine("expenses").reduce((s, r) => s + r.amount, 0),
    tipTotal: mine("booking_line_items").filter((l) => l.category === "tip").reduce((s, l) => s + l.amount, 0),
  };
  assert.equal(m.jobs, direct.jobs, "jobs");
  for (const k of ["earned", "spent", "tipTotal"]) assert.equal(cents(m[k]), cents(direct[k]), k);
  assert.equal(cents(m.net), cents(direct.earned - direct.spent), "net");
});

// ── 3. the tie-break is load-bearing ─────────────────────────────────────────
test("without the id tie-break, tied rows are skipped and doubled (the stand-in can show it)", async () => {
  const { data } = await readAll(bookingsQ(false));
  const distinct = new Set(data.map((r) => r.id)).size;
  assert.equal(data.length, 1250, "the row COUNT still looks right…");
  assert.ok(distinct < 1250, `…but only ${distinct} distinct jobs came back, so a figure is wrong`);
});

// ── 4. the old way: one request stops at 1,000, newest jobs missing ─────────
test("one unpaged request (the old code) is short", async () => {
  const { data } = await bookingsQ()();
  assert.equal(data.length, MAX_ROWS);
  assert.ok(!data.some((r) => r.id === mine("bookings").at(-1).id), "newest job cut");
});

// ── 5. a later page that fails returns no rows, never half a list ───────────
test("a failed second page answers an error and no data", async () => {
  failFromOffset = MAX_ROWS;
  try {
    const r = await readAll(bookingsQ());
    assert.equal(r.data, null);
    assert.ok(r.error);
  } finally { failFromOffset = Infinity; }
});
