// ROADMAP 97.24 — "UN-CANCEL" TELLS THE CUSTOMER, AND A DECLINED REQUEST IS
// TAKEN BACK BY ACCEPTING IT.
//
// RUNS the production `update-booking` and `respond-to-booking` handlers —
// type-stripped into `.tmp-97.24/`, their `_shared` imports swapped for an
// in-memory database and recording senders (the same harness as
// `update-booking-keeps-note.test.mjs`) — and asks:
//
//   update-booking   cancelled → confirmed sends ONE "back on" email to the
//                    customer, filed against the booking (`bookingId` is what
//                    puts it in the mail log); a second press sends none; no
//                    address, no email; a declined request is REFUSED with a
//                    reason (409, code `declined_request`) and left untouched;
//                    a cancellation still sends the cancellation email.
//   respond-to-booking  accept on a declined request confirms it, clears
//                    `declined_at` and sends the "accepted" email; a quote on
//                    one is still refused; a pending accept still works; a slot
//                    taken meanwhile answers 409 rather than a raw error.
//
// The emails' words (English and Spanish) are `render-emails.mjs`'s job, not
// this file's. No network, no credentials, no database.
//
// SABOTAGE — an env var, never a flag (`docs/gotchas.md` 104), made to a COPY,
// and the run prints that it landed (`docs/gotchas.md` 102):
//   BREAK=no-refusal       update-booking un-cancels a declined request again
//   BREAK=silent-restore   update-booking un-cancels without an email again
//
//   node tests/uncancel-tells-customer.test.mjs        (or node --test …)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeReceipt } from "../scripts/receipt.mjs";

const path = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const TMP = path(".tmp-97.24/");
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

const read = (p) => readFileSync(path(p), "utf8").replace(/\r\n/g, "\n");
let ub = read("supabase/functions/update-booking/index.ts");
const rb = read("supabase/functions/respond-to-booking/index.ts");
const SABOTAGE = {
  "no-refusal": ['&& current.status === "cancelled" && current.declined_at) {', '&& current.status === "cancelled" && current.declined_at && false) {'],
  "silent-restore": ['&& String(data.status) === "confirmed";', '&& String(data.status) === "confirmed" && false;'],
};
if (BREAK) {
  const s = SABOTAGE[BREAK];
  if (!s) { console.error(`unknown BREAK=${BREAK}`); process.exit(2); }
  if (ub.split(s[0]).length !== 2) { console.error(`BREAK=${BREAK} did not land — the edit must match exactly once`); process.exit(2); }
  ub = ub.replace(s[0], s[1]);
  console.log(`BREAK=${BREAK} landed: ${s[1].length - s[0].length} characters added`);
}

// ── An in-memory database with the query shapes both handlers use ─────────
const db = { bookings: [] };
let overlap = false; // the next booking write fails as the exclusion constraint would
const supabase = {
  from(t) {
    const q = { t, op: "select", filters: [], patch: null };
    const b = {
      select() { return b; },
      update(p) { q.op = "update"; q.patch = p; return b; },
      insert() { q.op = "insert"; return b; },
      delete() { q.op = "delete"; return b; },
      eq(c, v) { q.filters.push((r) => r[c] === v); return b; },
      is(c, v) { q.filters.push((r) => (r[c] ?? null) === v); return b; },
      filter(c, op, v) { q.filters.push((r) => op === "is" ? (r[c] ?? null) === v : r[c] === v); return b; },
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
  if (q.op === "update" && q.t === "bookings" && overlap) { overlap = false; return { data: null, error: { code: "23P01", message: "conflicting key value violates exclusion constraint" } }; }
  if (q.op === "update") for (const r of hit) Object.assign(r, structuredClone(q.patch));
  if (q.op !== "select" && q.op !== "update") return { error: null };
  return { data: hit[0] ? structuredClone(hit[0]) : null, error: null };
}

const sent = [];
const tag = (kind) => (_brand, b) => ({ subject: kind, html: `<p>${kind}</p>`, text: kind, lang: b?.lang });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
globalThis.__fakes97_24 = {
  db: { supabase },
  http: { json, preflight: () => new Response(null, { status: 204 }) },
  pricing: { servicesForBooking: async () => [] },
  tenant: {
    requireMember: async () => ({ businessId: "biz_1", userId: "user_1", role: "owner" }),
    businessById: async (id) => ({ id, name: "Ridgeline Auto Detail", timezone: "America/Los_Angeles" }),
    getSettings: async () => ({}),
    can: () => true,
    ownLines: (b) => b,
  },
  slotValidation: { validateSlot: async () => ({ ok: true }) },
  ownerPush: { sendOwnerPush: async () => {} },
  actionLog: { recordActions: async () => true },
  email: { buildBrand: async () => ({}), extraVehiclesFor: async () => [], sendTenantEmail: async (o) => { sent.push(o); return true; } },
  emailTemplates: {
    cancellationEmail: tag("cancelled"),
    rescheduleEmail: tag("moved"),
    restoredEmail: tag("back-on"),
    requestDecisionEmail: (_brand, _b, kind) => ({ subject: kind, html: kind, text: kind }),
  },
  connect: await import("../supabase/functions/_shared/connect.ts"),
  config: { receiptUrl: () => "https://example.test/booking/bk_1" },
  tenantSite: { siteFor: async () => ({}) },
  tz: await import("../supabase/functions/_shared/tz.ts"),
};
const unknown = [];
async function load(name, src) {
  let served = null;
  globalThis.Deno = { env: { get: () => undefined }, serve: (h) => { served = h; } };
  let js = stripTypeScriptTypes(src).replace(/^import "jsr:[^"]+";\s*$/m, "");
  js = js.replace(/^import \{([^}]*)\} from "\.\.\/_shared\/(\w+)\.ts";\s*$/gm, (_m, names, mod) => {
    if (!globalThis.__fakes97_24[mod]) unknown.push(`${name}: ${mod}`);
    const list = names.split(",").map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/\s+as\s+/, ": ")).join(", ");
    return `const { ${list} } = globalThis.__fakes97_24[${JSON.stringify(mod)}];`;
  });
  if (/^import /m.test(js)) unknown.push(`${name}: an import was not replaced`);
  writeFileSync(`${TMP}${name}.mjs`, js);
  await import(pathToFileURL(`${TMP}${name}.mjs`).href + `?${Date.now()}`);
  return served;
}
const updateBooking = await load("update-booking", ub);
const respondToBooking = await load("respond-to-booking", rb);
// THE CANARY, IN EVERY RUN (97.24 review). The refusal predicate below is also
// put to a copy of update-booking with the refusal taken out — the original
// defect — and must call that copy's answer NOT refused. A predicate that
// passed anything would pass this too, and the run would fail on it.
const refusedRight = (r) => r.status === 409 && r.body?.code === "declined_request";
const canaryHandler = BREAK ? null : await load("update-booking-canary", ub.replace(SABOTAGE["no-refusal"][0], SABOTAGE["no-refusal"][1]));
check("both production handlers loaded with every import replaced",
  typeof updateBooking === "function" && typeof respondToBooking === "function" && unknown.length === 0, unknown.join(" | "));

const row = (over) => ({
  id: "bk_1", business_id: "biz_1", status: "cancelled", declined_at: null, deleted_at: null, lang: "es",
  quoted_amount: null, quoted_note: null, quoted_at: null, payment_status: "pending",
  total_price: 150, subtotal: 150, start_at: "2026-10-20T16:00:00.000Z", end_at: "2026-10-20T18:00:00.000Z",
  customer_name: "Maya Ortiz", customer_email: "maya@example.test", service_type: "mobile", ...over,
});
const call = async (fn, body) => {
  const res = await fn(new Request("https://fn.test/x", { method: "POST", body: JSON.stringify({ booking_id: "bk_1", ...body }) }));
  return { status: res.status, body: await res.json() };
};
const fresh = (over) => { db.bookings = [row(over)]; sent.length = 0; };

const SCENARIOS = 10;
let reached = 0;

console.log("\n§ 1 — update-booking: un-cancel tells the customer");
fresh({});
let r = await call(updateBooking, { status: "confirmed" });
reached++;
check("un-cancel · the write succeeded and the job is confirmed", r.status === 200 && db.bookings[0].status === "confirmed", JSON.stringify(r.body).slice(0, 200));
check("un-cancel · exactly one email went", sent.length === 1, `${sent.length} sent`);
check("un-cancel · it is the back-on email", sent[0]?.subject === "back-on", sent[0]?.subject);
check("un-cancel · to the customer, filed against the booking (the mail log row)",
  sent[0]?.to === "maya@example.test" && sent[0]?.bookingId === "bk_1", JSON.stringify({ to: sent[0]?.to, bookingId: sent[0]?.bookingId }));
sent.length = 0;
r = await call(updateBooking, { status: "confirmed" });
reached++;
check("pressed again · succeeds and sends nothing more", r.status === 200 && sent.length === 0, `${r.status}, ${sent.length} sent`);

fresh({ customer_email: null });
r = await call(updateBooking, { status: "confirmed" });
reached++;
check("no address · confirmed, nothing sent", r.status === 200 && db.bookings[0].status === "confirmed" && sent.length === 0, `${r.status}, ${sent.length} sent`);

fresh({ status: "confirmed" });
r = await call(updateBooking, { status: "cancelled" });
reached++;
check("cancel still sends the cancellation email", r.status === 200 && sent.length === 1 && sent[0].subject === "cancelled", sent.map((s) => s.subject).join(","));

console.log("\n§ 2 — update-booking: a declined request is refused, with a reason");
for (const to of ["confirmed", "completed"]) {
  fresh({ declined_at: "2026-10-16T15:00:00.000Z" });
  r = await call(updateBooking, { status: to });
  reached++;
  check(`declined → ${to} · refused 409 with code declined_request`, refusedRight(r), JSON.stringify(r.body).slice(0, 200));
  check(`declined → ${to} · the reason names the right path`, /Accept it after all/.test(String(r.body.error)), String(r.body.error));
  check(`declined → ${to} · the row is untouched and nothing was sent`,
    db.bookings[0].status === "cancelled" && db.bookings[0].declined_at !== null && sent.length === 0,
    `${db.bookings[0].status}, declined_at ${db.bookings[0].declined_at}, ${sent.length} sent`);
}

console.log("\n§ 3 — respond-to-booking: accepting a declined request");
fresh({ declined_at: "2026-10-16T15:00:00.000Z" });
r = await call(respondToBooking, { action: "accept" });
reached++;
check("accept after decline · confirmed", r.status === 200 && db.bookings[0].status === "confirmed", JSON.stringify(r.body).slice(0, 200));
check("accept after decline · declined_at cleared", db.bookings[0].declined_at === null, String(db.bookings[0].declined_at));
check("accept after decline · one 'accepted' email to the customer, filed against the booking",
  sent.length === 1 && sent[0].subject === "accepted" && sent[0].to === "maya@example.test" && sent[0].bookingId === "bk_1",
  JSON.stringify(sent.map((s) => [s.subject, s.to, s.bookingId])));

fresh({ declined_at: "2026-10-16T15:00:00.000Z" });
r = await call(respondToBooking, { action: "quote", amount: 200 });
reached++;
check("quote on a declined request · still refused, nothing sent", r.status === 409 && sent.length === 0 && db.bookings[0].quoted_amount === null, `${r.status}, ${sent.length} sent`);

fresh({ status: "pending" });
r = await call(respondToBooking, { action: "accept" });
reached++;
check("pending accept · unchanged: confirmed and one 'accepted' email", r.status === 200 && db.bookings[0].status === "confirmed" && sent.length === 1 && sent[0].subject === "accepted", `${r.status}, ${sent.map((s) => s.subject)}`);

fresh({ declined_at: "2026-10-16T15:00:00.000Z" });
overlap = true;
r = await call(respondToBooking, { action: "accept" });
reached++;
check("slot taken since the decline · 409 'overlaps', row untouched, nothing sent",
  r.status === 409 && /overlaps/.test(String(r.body.error)) && db.bookings[0].status === "cancelled" && sent.length === 0,
  `${r.status} ${JSON.stringify(r.body)}`);

let canaryCaught = false;
if (canaryHandler) {
  fresh({ declined_at: "2026-10-16T15:00:00.000Z" });
  const c = await call(canaryHandler, { status: "confirmed" });
  canaryCaught = !refusedRight(c) && db.bookings[0].status === "confirmed" && db.bookings[0].declined_at !== null;
  console.log(`
canary  a handler without the refusal re-confirmed a declined request (${c.status}, declined_at still set): ${canaryCaught ? "caught" : "NOT CAUGHT"}`);
  if (!canaryCaught) failures.push("canary not caught: the refusal predicate accepted a handler with no refusal");
}
const failed = failures.length;
console.log(`\n${assertions - failed} passed, ${failed} failed, ${reached} of ${SCENARIOS} scenarios.`);
const logName = `receipts/uncancel-tells-customer${BREAK ? `-${BREAK}.sabotage` : ""}.txt`;
writeFileSync(path(logName), [`uncancel-tells-customer${BREAK ? ` BREAK=${BREAK}` : ""} — ${new Date().toISOString()}`, ...lines,
  `${assertions - failed} passed, ${failed} failed, ${reached} of ${SCENARIOS} scenarios.`].join("\n") + "\n");
const { path: receipt } = writeReceipt({
  check_id: BREAK ? `uncancel-tells-customer-${BREAK}` : "uncancel-tells-customer",
  started_at,
  status: failed || reached !== SCENARIOS || (!BREAK && !canaryCaught) ? "fail" : "pass",
  expected_targets: SCENARIOS,
  discovered_targets: reached,
  attempted_targets: reached,
  completed_targets: reached,
  skipped_targets: 0,
  assertions_executed: assertions,
  // Genuinely below the 20 a clean run executes (receipt.mjs refuses an equal floor);
  // the 10-of-10 scenario count is what binds a run that quietly did less.
  min_assertions: 18,
  failures,
  dimensions: { handlers: ["supabase/functions/update-booking/index.ts", "supabase/functions/respond-to-booking/index.ts"], ...(BREAK ? { break: BREAK } : {}) },
  artifacts: [logName],
  // The canary: the refusal and the back-on email are measured by the same
  // checks the two sabotages switch off, so a check that compared nothing
  // could not pass this run AND go red under them.
  canary: BREAK
    ? { id: `break-${BREAK}`, observed_failure: failed > 0 }
    : { id: "declined-request-reconfirmed-by-a-handler-without-the-refusal", observed_failure: canaryCaught,
      sabotage_receipts: Object.keys(SABOTAGE).map((b) => `receipts/uncancel-tells-customer-${b}.sabotage.json`) },
});
console.log(`receipt: ${receipt}`);
process.exitCode = failed || reached !== SCENARIOS || (!BREAK && !canaryCaught) ? 1 : 0;
