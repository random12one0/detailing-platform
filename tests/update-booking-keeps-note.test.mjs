// ROADMAP 97.70 — MARKING A JOB PAID BY HAND KEEPS ITS WRONG-FIGURE NOTE.
//
// Andrew, 2026-10-17: a job the detailer marks paid after a wrong-figure card
// payment shows that payment as a POSSIBLE refund. The job record draws that
// line from the row (`BookingDetail.jsx`, `maybeOwed`), so the line only exists
// if the mark-paid write leaves `payment_problem` exactly as it was. This RUNS
// the production `update-booking` handler — type-stripped into `.tmp-97.70/`,
// its `_shared` imports swapped for an in-memory database and no-op senders,
// `Deno.serve`'s handler called with a real Request — with the three payloads
// the screens send when they mark a job paid:
//
//   job record   `BookingDetail.jsx` correctPayment: { payment_status, payment_notes }
//   Money        `Money.jsx` markPaid: { payment_status, final_amount, finalized_at }
//   finalize     `FinalizeModal.jsx`: { status: "completed", final_amount, payment_status, payment_notes, miles }
//
// and asks: the row is now paid, and its note is byte-for-byte the note it had.
// REFUSED: a payload that tries to clear the note (`payment_problem: null`) is
// ignored by the field allowlist. `BulkJobModal.jsx` is not here: it INSERTS a
// new fleet job, which can never have had a card payment.
//
// No network, no credentials, no database.
//
// SABOTAGE — an env var, never a flag (`docs/gotchas.md` 104), made to a COPY,
// and the run prints that it landed (`docs/gotchas.md` 102):
//   BREAK=clear-note   the write clears `payment_problem` (the line has nothing to draw from)
//   BREAK=allow-note   `payment_problem` joins the allowlist, so the refused payload clears it
//
//   node tests/update-booking-keeps-note.test.mjs        (or node --test …)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { writeReceipt } from "../scripts/receipt.mjs";

const path = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const TMP = path(".tmp-97.70/");
mkdirSync(TMP, { recursive: true });
const BREAK = process.env.BREAK || "";
const started_at = new Date().toISOString();

let assertions = 0;
const failures = [];
const lines = [];
const check = (name, cond, detail = "") => {
  assertions++;
  lines.push(`${cond ? "ok  " : "FAIL"}  ${name}${cond || !detail ? "" : ` — ${detail}`}`);
  if (cond) console.log(`  ok    ${name}`);
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.error(`  FAIL  ${name}\n        ${detail}`); }
};

let src = readFileSync(path("supabase/functions/update-booking/index.ts"), "utf8").replace(/\r\n/g, "\n");
const SABOTAGE = {
  "clear-note": ["const updateData: Record<string, unknown> = {};", "const updateData: Record<string, unknown> = { payment_problem: null };"],
  "allow-note": ['  "payment_status",\n', '  "payment_status",\n  "payment_problem",\n'],
};
if (BREAK) {
  const s = SABOTAGE[BREAK];
  if (!s) { console.error(`unknown BREAK=${BREAK}`); process.exit(2); }
  if (src.split(s[0]).length !== 2) { console.error(`BREAK=${BREAK} did not land — the edit must match exactly once`); process.exit(2); }
  src = src.replace(s[0], s[1]);
  console.log(`BREAK=${BREAK} landed: ${s[1].length - s[0].length} characters added`);
}

// ── An in-memory database with the query shapes update-booking uses ───────
const db = { bookings: [] };
const supabase = {
  from(t) {
    const q = { t, op: "select", filters: [], patch: null };
    const b = {
      select() { return b; },
      update(p) { q.op = "update"; q.patch = p; return b; },
      insert() { q.op = "insert"; return b; },
      delete() { q.op = "delete"; return b; },
      eq(c, v) { q.filters.push((r) => r[c] === v); return b; },
      maybeSingle() { return b; },
      single() { return b; },
      then(ok, bad) { return Promise.resolve(run(q)).then(ok, bad); },
    };
    return b;
  },
};
function run(q) {
  const rows = db[q.t] ?? [];
  const hit = rows.filter((r) => q.filters.every((f) => f(r)));
  if (q.op === "update") for (const r of hit) Object.assign(r, structuredClone(q.patch));
  if (q.op !== "select" && q.op !== "update") return { error: null };
  return { data: hit[0] ? structuredClone(hit[0]) : null, error: null };
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
globalThis.__fakes97_70 = {
  db: { supabase },
  http: { json, preflight: () => new Response(null, { status: 204 }) },
  pricing: { servicesForBooking: async () => [] },
  tenant: {
    requireMember: async () => ({ businessId: "biz_1", userId: "user_1", role: "owner" }),
    businessById: async (id) => ({ id, name: "Ridgeline Auto Detail", timezone: "America/Los_Angeles" }),
    getSettings: async () => ({}),
  },
  slotValidation: { validateSlot: async () => ({ ok: true }) },
  ownerPush: { sendOwnerPush: async () => {} },
  actionLog: { recordActions: async () => true },
  email: { buildBrand: async () => ({}), extraVehiclesFor: async () => [], sendTenantEmail: async () => {} },
  emailTemplates: { cancellationEmail: () => ({}), rescheduleEmail: () => ({}) },
  connect: await import("../supabase/functions/_shared/connect.ts"),
  config: { receiptUrl: () => "" },
  tenantSite: { siteFor: async () => ({}) },
  tz: await import("../supabase/functions/_shared/tz.ts"),
};
let served = null;
globalThis.Deno = { env: { get: () => undefined }, serve: (h) => { served = h; } };
const unknown = [];
let js = stripTypeScriptTypes(src).replace(/^import "jsr:[^"]+";\s*$/m, "");
js = js.replace(/^import \{([^}]*)\} from "\.\.\/_shared\/(\w+)\.ts";\s*$/gm, (_m, names, mod) => {
  if (!globalThis.__fakes97_70[mod]) unknown.push(mod);
  const list = names.split(",").map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/\s+as\s+/, ": ")).join(", ");
  return `const { ${list} } = globalThis.__fakes97_70[${JSON.stringify(mod)}];`;
});
if (/^import /m.test(js)) unknown.push("an import was not replaced");
writeFileSync(`${TMP}update-booking.mjs`, js);
await import(pathToFileURL(`${TMP}update-booking.mjs`).href + `?${Date.now()}`);
check("the production update-booking handler loaded with every import replaced", typeof served === "function" && unknown.length === 0, unknown.join(" | "));

// ── The rows: a $100 card payment (pi_1) on a $150 job, left unpaid by 97.10 ──
const AT = "2026-10-16T15:00:00.000Z";
const WRONG = { kind: "amount", paid_cents: 10000, owed_cents: 15000, currency: "usd", at: AT, intent: "pi_1" };
const WRONG_EUR = { kind: "currency", paid_cents: 15000, owed_cents: 15000, currency: "eur", at: AT, intent: "pi_1" };
const KEPT = { kind: "extra", paid_cents: 5000, owed_cents: 0, currency: "usd", at: AT, payments: [{ intent: "pi_9", paid_cents: 5000, currency: "usd", at: AT }], earlier: [{ ...WRONG }] };
const row = (problem) => ({
  id: "bk_1", business_id: "biz_1", status: "confirmed", payment_status: "pending", payment_notes: null,
  total_price: 150, final_amount: null, finalized_at: null, start_at: "2026-10-20T16:00:00.000Z", end_at: "2026-10-20T18:00:00.000Z",
  customer_name: "Maya Ortiz", customer_email: null, service_type: "mobile", payment_problem: problem,
});
const PAYLOADS = [
  ["job record", { payment_status: "paid", payment_notes: "Cash" }],
  ["Money", { payment_status: "paid", final_amount: 150, finalized_at: AT }],
  ["finalize", { status: "completed", final_amount: 150, payment_status: "paid", payment_notes: "Cash", miles: 12 }],
];
const NOTES = [["amount", WRONG], ["currency", WRONG_EUR], ["kept under a later extra payment", KEPT]];
const call = async (body) => {
  const res = await served(new Request("https://fn.test/update-booking", { method: "POST", body: JSON.stringify({ booking_id: "bk_1", ...body }) }));
  return { status: res.status, body: await res.json() };
};

const SCENARIOS = PAYLOADS.length * NOTES.length + 1;
let reached = 0;
console.log("\n§ 1 — every screen's mark-paid payload leaves the note exactly as it was");
for (const [screen, payload] of PAYLOADS) {
  for (const [label, note] of NOTES) {
    db.bookings = [row(structuredClone(note))];
    const r = await call(payload);
    reached++;
    const stored = db.bookings[0];
    check(`${screen} · ${label} · the write succeeded`, r.status === 200 && r.body.success === true, JSON.stringify(r.body).slice(0, 200));
    check(`${screen} · ${label} · the row is now paid`, stored.payment_status === "paid", stored.payment_status);
    check(`${screen} · ${label} · its note is untouched`, isDeepStrictEqual(stored.payment_problem, note), JSON.stringify(stored.payment_problem));
    check(`${screen} · ${label} · the response carries the note to the screen`, isDeepStrictEqual(r.body.booking?.payment_problem, note), JSON.stringify(r.body.booking?.payment_problem));
  }
}

console.log("\n§ 2 — refused: a payload that tries to clear the note");
db.bookings = [row(structuredClone(WRONG))];
const r = await call({ payment_status: "paid", payment_problem: null });
reached++;
check("the write succeeded and the job is paid", r.status === 200 && db.bookings[0].payment_status === "paid", JSON.stringify(r.body).slice(0, 200));
check("payment_problem in the payload was ignored (not on the allowlist)", isDeepStrictEqual(db.bookings[0].payment_problem, WRONG), JSON.stringify(db.bookings[0].payment_problem));

const failed = failures.length;
console.log(`\n${assertions - failed} passed, ${failed} failed, ${reached} of ${SCENARIOS} scenarios.`);
const logName = `receipts/update-booking-keeps-note${BREAK ? `-${BREAK}.sabotage` : ""}.txt`;
writeFileSync(path(logName), [`update-booking-keeps-note${BREAK ? ` BREAK=${BREAK}` : ""} — ${new Date().toISOString()}`, ...lines,
  `${assertions - failed} passed, ${failed} failed, ${reached} of ${SCENARIOS} scenarios.`].join("\n") + "\n");
const { path: receipt } = writeReceipt({
  check_id: BREAK ? `update-booking-keeps-note-${BREAK}` : "update-booking-keeps-note",
  started_at,
  status: failed || reached !== SCENARIOS ? "fail" : "pass",
  expected_targets: SCENARIOS,
  discovered_targets: reached,
  attempted_targets: reached,
  completed_targets: reached,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 38,
  failures,
  dimensions: { handler: "supabase/functions/update-booking/index.ts", payloads: PAYLOADS.map(([s]) => s), notes: NOTES.map(([n]) => n), ...(BREAK ? { break: BREAK } : {}) },
  artifacts: [logName],
  // The canary: the refused payload is measured by the same deep-equal, so a
  // check that compared nothing could not pass it AND the sabotages.
  canary: BREAK ? { id: `break-${BREAK}`, observed_failure: failed > 0 } : { id: "clear-attempt-refused", observed_failure: isDeepStrictEqual(db.bookings[0].payment_problem, WRONG) },
});
console.log(`receipt: ${receipt}`);
process.exitCode = failed || reached !== SCENARIOS ? 1 : 0;
