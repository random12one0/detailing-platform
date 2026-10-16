// ROADMAP 6.4 (b) AND (c) — A RETRY LEAVES ONE CHANGE, NOT TWO.
//
// Detailers work in driveways. A press whose ANSWER is lost on a bad
// connection gets pressed again — and two presses can also land at the same
// moment. Every request here is fired twice, in sequence AND concurrently, and
// the verdict is read off the ROWS, counted before and after: `bookings`,
// `booking_line_items`, and `email_sends` (one row per email the relay
// handled, which is how a second "your booking was cancelled" shows up as a
// row rather than as an inbox nobody is watching).
//
//   node tests/retry-safety.test.mjs                     this checkout's functions, run locally
//   RETRY_TARGET=deployed node tests/retry-safety.test.mjs   what is live today
//   node tests/retry-safety.test.mjs --break=no-client-id    sabotage: must go red
//
// LOCAL is the default because deploying is Andrew's: `scripts/lib/edgeLocal.mjs`
// runs `supabase/functions/<name>/index.ts` from THIS checkout in Node, against
// the real database. DEPLOYED is the before-picture, and doubles as the
// negative control for § 2: the old code has no fence, so a duplicate there is
// the counter proving it can see one.
//
// WHAT IT TOUCHES: its own `retry-<tag>` business (`is_demo`), never
// demo-detail, deleted at the end. Email to the `fixture.test` sink only — the
// relay drops it above the daily claim and records a row, so it costs nothing.
// `create-booking` is the only rate-limited call (5 a run); every other
// booking is written directly so the shared per-address allowance is not spent.

import "./_env.mjs";
import { sink } from "./_mail.mjs";
import { startEdge } from "../scripts/lib/edgeLocal.mjs";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const TARGET = process.env.RETRY_TARGET === "deployed" ? "deployed" : "local";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8) || null;

if (!URL_ || !SERVICE || !ANON) {
  console.log("NOT RUN — needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (.env).");
  process.exit(1);
}
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) {
  console.log("NOT RUN — this writes fixture rows and only ever writes to kguqylyzgyzfktkfnhjb.");
  process.exit(1);
}

let passed = 0, failed = 0;
const check = (name, ok, detail = "") => {
  if (ok) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};

const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const rest = async (p, init = {}, headers = H) => {
  const r = await fetch(`${URL_}/rest/v1/${p}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};
const count = async (table, filter) => {
  const r = await fetch(`${URL_}/rest/v1/${table}?${filter}&select=id`, { headers: { ...H, Prefer: "count=exact", Range: "0-0" } });
  return Number((r.headers.get("content-range") || "*/NaN").split("/")[1]);
};
const mails = (to) => count("email_sends", `to_email=eq.${encodeURIComponent(to)}`);

const edge = TARGET === "local"
  ? await startEdge(["create-booking", "update-booking", "cancel-booking", "reschedule-booking", "respond-to-booking", "accept-quote"])
  : null;
const BASE = edge ? edge.url : URL_;
const fn = async (name, body, jwt = ANON) => {
  const r = await fetch(`${BASE}/functions/v1/${name}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  let b = null; try { b = JSON.parse(t); } catch { b = t; }
  return { status: r.status, body: b };
};
const twice = (f) => Promise.all([f(), f()]);

const tag = Math.random().toString(36).slice(2, 8);
const SLUG = `retry-${tag}`;
// FRESH PHONES EVERY RUN. `create-booking` counts bookings per phone (10 an
// hour), refusals included, so fixed numbers ran this suite into its own 429
// on the fourth run in an hour — measured, rows in `rate_hits`.
const P = String(Math.floor(Math.random() * 9e5) + 1e5);
const PA = `555${P}1`, PB = `555${P}2`;
const day = (n) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);
const at = (d, hhmm) => new Date(`${d}T${hhmm}:00-07:00`).toISOString();   // LA, DST-agnostic enough: one hour either side is still inside 08–18
const laTime = (iso) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit" });
const OWNER = { email: sink(`retry-owner-${tag}`), password: `Aa1!${crypto.randomUUID()}` };
let biz = null, userId = null, jwt = null, service = null;

// A booking written directly, so the shared booking allowance is not spent on setup.
let n = 0;
async function booking(status, extra = {}) {
  n++;
  const d = day(40 + n);
  const row = (await rest("bookings", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify([{
      business_id: biz.id, customer_name: `Retry ${n}`, customer_phone: `555-01${String(n).padStart(2, "0")}`,
      customer_email: sink(`retry-${tag}-${n}`), service_type: "dropoff", vehicle_size: "small",
      start_at: at(d, "10:00"), end_at: at(d, "12:00"), status, subtotal: 200, total_price: 200, ...extra,
    }]),
  })).body?.[0];
  if (row?.id) {
    await rest("booking_services", { method: "POST", body: JSON.stringify([{
      business_id: biz.id, booking_id: row.id, service_id: service.id, name_at_booking: "Retry Detail",
      price_at_booking: 200, duration_at_booking: 120,
    }]) });
  }
  return { ...row, day: d };
}

try {
  console.log(`retry-safety · target ${TARGET === "local" ? "LOCAL (this checkout, run in Node)" : "DEPLOYED (live functions)"}${BREAK ? ` · --break=${BREAK}` : ""}\n`);

  // ── setup ──────────────────────────────────────────────────────────────
  biz = (await rest("businesses", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify([{
    is_demo: true, slug: SLUG, name: `Retry ${tag} Detailing`, timezone: "America/Los_Angeles",
    contact_email: sink(`retry-biz-${tag}`), contact_phone: "555-0100", dropoff_address: "1 Retry Rd, Los Angeles, CA",
  }]) })).body?.[0];
  await rest("business_settings", { method: "POST", body: JSON.stringify([{
    business_id: biz.id, slot_interval_minutes: 60, buffer_minutes: 0, price_rounding_nearest: 1,
    booking_mode: "reserve", mobile_enabled: true, dropoff_enabled: true, cancellation_window_hours: 24,
  }]) });
  await rest("business_hours", { method: "POST", body: JSON.stringify([0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    business_id: biz.id, weekday, open_time: "08:00", close_time: "18:00",
  }))) });
  service = (await rest("services", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify([{
    business_id: biz.id, name: "Retry Detail", price: 200, duration_minutes: 120,
  }]) })).body?.[0];
  await fetch(`${URL_}/auth/v1/admin/users`, { method: "POST", headers: H, body: JSON.stringify({ ...OWNER, email_confirm: true }) });
  const users = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H })).json();
  userId = (users.users ?? []).find((u) => u.email === OWNER.email)?.id ?? null;
  await rest("business_users", { method: "POST", body: JSON.stringify([{ business_id: biz.id, user_id: userId, role: "owner" }]) });
  jwt = (await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify(OWNER),
  })).json()).access_token;
  check("setup · own fixture business, service, hours and a signed-in owner", !!biz?.id && !!service?.id && !!jwt);

  // ── 1. (c) A BOOKING SUBMITTED TWICE LEAVES ONE BOOKING ────────────────
  console.log("\n1. (c) the same booking submitted twice");
  // 97.64: a retry carries the first press's booking_ref, or it is answered
  // without the id. One ref per booking, the same on every press of it.
  const refs = {};
  const submit = (d, phone, i) => () => fn("create-booking", {
    booking_ref: (refs[i] ??= crypto.randomUUID()),
    business_slug: SLUG, customer_name: "Driveway Customer", customer_phone: phone,
    customer_email: sink(`retry-${tag}-c${i}`), service_type: "dropoff", vehicle_size: "small",
    service_ids: [service.id], add_ons: [], booking_date: d, start_time: "10:00",
  });
  const byPhone = (p) => count("bookings", `business_id=eq.${biz.id}&customer_phone=eq.${p}`);

  const dSeq = day(20), dCon = day(21);
  const s1 = await submit(dSeq, PA, 1)();
  const s2 = await submit(dSeq, PA, 1)();
  check("1a · in sequence: both presses answer as a success", s1.status === 200 && s2.status === 200, `${s1.status} ${s2.status} ${JSON.stringify(s2.body).slice(0, 120)}`);
  check("1b · ROWS: one booking, not two", (await byPhone(PA)) === 1, `count ${await byPhone(PA)}`);
  check("1c · and the retry is handed the SAME booking", s1.body?.booking?.id && s1.body?.booking?.id === s2.body?.booking?.id);

  const before1 = await mails(sink(`retry-${tag}-c2`));
  const [c1, c2] = await twice(submit(dCon, PB, 2));
  check("1d · concurrently: both presses answer as a success", c1.status === 200 && c2.status === 200, `${c1.status} ${c2.status} ${JSON.stringify(c2.body).slice(0, 120)}`);
  check("1e · ROWS: one booking, not two", (await byPhone(PB)) === 1, `count ${await byPhone(PB)}`);
  check("1f · ROWS: one confirmation email, not two", (await mails(sink(`retry-${tag}-c2`))) - before1 === 1,
    `${(await mails(sink(`retry-${tag}-c2`))) - before1} sent`);

  // THE COUNTER CAN SEE TWO. Same customer, a different time, is two real bookings.
  await submit(day(22), PA, 1)();
  check("1g · CONTROL: a genuinely second booking IS counted as two", (await byPhone(PA)) === 2);

  // ── 2. (b) AN UPDATE PRESSED TWICE LEAVES ONE CHANGE ───────────────────
  console.log("\n2. (b) the same change pressed twice, concurrently, then once more");
  const fence = async (label, makeBooking, press, settle) => {
    const b = await makeBooking();
    const before = await mails(b.customer_email);
    const both = await twice(() => press(b));
    const again = await press(b);
    const sent = (await mails(b.customer_email)) - before;
    check(`${label} · every press answers as a success`, [...both, again].every((r) => r.status === 200),
      [...both, again].map((r) => `${r.status} ${JSON.stringify(r.body).slice(0, 90)}`).join(" | "));
    check(`${label} · ROWS: exactly one email to the customer`, sent === 1, `${sent} sent`);
    if (settle) await settle(b);
  };
  const rowOf = async (id) => (await rest(`bookings?id=eq.${id}&select=*`)).body?.[0];

  await fence("2a customer cancels", () => booking("confirmed"),
    (b) => fn("cancel-booking", { booking_id: b.id }),
    async (b) => check("2a · ROWS: cancelled", (await rowOf(b.id))?.status === "cancelled"));
  await fence("2b detailer cancels", () => booking("confirmed"),
    (b) => fn("update-booking", { business_id: biz.id, booking_id: b.id, status: "cancelled" }, jwt));
  await fence("2c detailer moves it", () => booking("confirmed"),
    (b) => fn("update-booking", { business_id: biz.id, booking_id: b.id, booking_date: b.day, start_time: "14:00" }, jwt),
    async (b) => check("2c · ROWS: it is at 14:00 in the business's time zone", laTime((await rowOf(b.id))?.start_at) === "14:00", laTime((await rowOf(b.id))?.start_at)));
  await fence("2d customer reschedules", () => booking("confirmed"),
    (b) => fn("reschedule-booking", { booking_id: b.id, booking_date: b.day, start_time: "13:00" }));
  await fence("2e detailer accepts a request", () => booking("pending"),
    (b) => fn("respond-to-booking", { business_id: biz.id, booking_id: b.id, action: "accept" }, jwt),
    async (b) => check("2e · ROWS: confirmed", (await rowOf(b.id))?.status === "confirmed"));
  await fence("2f customer accepts a quote", async () => {
    const b = await booking("pending");
    await rest(`bookings?id=eq.${b.id}`, { method: "PATCH", body: JSON.stringify({ quoted_amount: 260, quoted_at: new Date().toISOString() }) });
    return b;
  }, (b) => fn("accept-quote", { booking_id: b.id }),
  async (b) => {
    const r = await rowOf(b.id);
    check("2f · ROWS: confirmed at the quoted price, with ONE adjustment line",
      r?.status === "confirmed" && Number(r?.total_price) === 260 && (r?.price_adjustments ?? []).length === 1,
      `${r?.status} ${r?.total_price} ${JSON.stringify(r?.price_adjustments)}`);
  });

  // ── 3. FINALIZE: THE LINES ARE WRITTEN FROM THE BROWSER ────────────────
  // `FinalizeModal` inserts the extra lines (a tip, a custom charge) straight
  // into `booking_line_items` and only then calls `update-booking`. A lost
  // answer and a second press added every line twice — a $20 tip on the
  // invoice twice. THE MECHANISM FOR LANE A, PROVEN HERE AS THE OWNER WOULD
  // RUN IT: each line carries an id made when it was added to the sheet, and
  // the insert ignores an id it already has. No migration — `id` is already
  // the primary key.
  console.log("\n3. finalize — the extra lines, pressed twice");
  const owner = { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" };
  const job = await booking("confirmed");
  const lines = [
    { category: "tip", label: "Tip", amount: 20 },
    { category: "custom", label: "Pet hair", amount: 35 },
  ].map((l) => ({ ...l, business_id: biz.id, booking_id: job.id, ...(BREAK === "no-client-id" ? {} : { id: crypto.randomUUID() }) }));
  const writeLines = () => BREAK === "no-client-id"
    ? rest("booking_line_items", { method: "POST", body: JSON.stringify(lines) }, owner)
    : rest("booking_line_items?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify(lines) }, owner);
  const lw = [...await twice(writeLines), await writeLines()];
  check("3a · every write is accepted as the owner", lw.every((r) => r.status < 300), lw.map((r) => `${r.status} ${JSON.stringify(r.body).slice(0, 80)}`).join(" | "));
  const lineCount = await count("booking_line_items", `booking_id=eq.${job.id}`);
  check("3b · ROWS: two lines, not six", lineCount === 2, `${lineCount} lines`);
  const fin = { business_id: biz.id, booking_id: job.id, status: "completed", final_amount: 255, payment_status: "paid", payment_notes: "Card" };
  const fr = [...await twice(() => fn("update-booking", { ...fin, finalized_at: new Date().toISOString() }, jwt)),
    await fn("update-booking", { ...fin, finalized_at: new Date().toISOString() }, jwt)];
  const done = await rowOf(job.id);
  check("3c · finalize pressed three times: every press a success, the job completed once at $255",
    fr.every((r) => r.status === 200) && done?.status === "completed" && Number(done?.final_amount) === 255,
    fr.map((r) => r.status).join(","));
  check("3d · ROWS: still one booking for that customer", (await count("bookings", `business_id=eq.${biz.id}&customer_phone=eq.${job.customer_phone}`)) === 1);

  // The bulk-job sheet (`BulkJobModal`) inserts a whole booking from the
  // browser. Same mechanism, same proof.
  const bulkId = crypto.randomUUID();
  const bulk = () => rest("bookings?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify([{
    id: bulkId, business_id: biz.id, customer_name: "Dealer Lot", customer_phone: "555-0300", service_type: "dropoff",
    start_at: at(day(-3), "09:00"), end_at: at(day(-3), "15:00"), status: "completed", bulk_vehicle_count: 10, total_price: 900,
  }]) }, owner);
  const bw = [...await twice(bulk), await bulk()];
  check("3e · a logged bulk job pressed three times: accepted, ONE row", bw.every((r) => r.status < 300)
    && (await count("bookings", `id=eq.${bulkId}`)) === 1, bw.map((r) => `${r.status} ${JSON.stringify(r.body).slice(0, 80)}`).join(" | "));
} catch (err) {
  failed++;
  console.log(`\nCRASHED: ${err.stack || err.message}`);
} finally {
  if (biz?.id) await rest(`businesses?id=eq.${biz.id}`, { method: "DELETE" });
  if (userId) await fetch(`${URL_}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: H });
  await edge?.close();
  const left = await count("businesses", `slug=eq.${SLUG}`);
  check("teardown · the fixture business is gone", left === 0, `${left} left`);
}

console.log(`\n${passed} passed, ${failed} failed  (target ${TARGET}${BREAK ? `, --break=${BREAK}` : ""})`);
process.exit(failed ? 1 : 0);
