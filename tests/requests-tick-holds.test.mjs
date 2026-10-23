// ROADMAP 99.13 — THE "ANSWER REQUESTS" TICK HOLDS ON `update-booking` TOO.
//
// Andrew, 2026-10-16: "the owners should be able to like set specific
// permissions for staff". They can (Team screen, roadmap 2.13), and
// `respond-to-booking` refuses a member without `requests`. But
// `update-booking` took `status` from ANY member, so a staff login whose owner
// had unticked "Answer requests" could still accept a request (pending →
// confirmed), decline it (pending → cancelled) or remove it (soft delete)
// through the ordinary edit endpoint.
//
// RUNS the production `update-booking` handler — type-stripped into
// `.tmp-99.13/`, its `_shared` imports swapped for an in-memory database (the
// same harness as `uncancel-tells-customer.test.mjs`) — and asks, as staff
// WITHOUT the tick, staff WITH it, and an owner:
//   refused (403, row untouched): pending → confirmed, pending → cancelled,
//     pending soft delete
//   still allowed: a note on a pending request, a pending request saved with
//     its own status sent back, a confirmed job marked completed; and every
//     answer by staff WITH the tick and by an owner.
// No network, no credentials, no database.
//
// CANARY, EVERY RUN: a copy of the handler with the gate taken out (the
// original defect) must let the tickless accept THROUGH, or the refusal below
// is not this gate's.
// SABOTAGE — an env var, never a flag (`docs/gotchas.md` 104), made to a COPY,
// and the run prints that it landed (`docs/gotchas.md` 102):
//   BREAK=no-gate      the gate is switched off
//   BREAK=status-only  the gate forgets soft delete
//
//   node tests/requests-tick-holds.test.mjs        (or node --test …)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { receiptFile, writeReceipt } from "../scripts/receipt.mjs";

const path = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const TMP = path(".tmp-99.13/");
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

let ub = readFileSync(path("supabase/functions/update-booking/index.ts"), "utf8").replace(/\r\n/g, "\n");
const SABOTAGE = {
  "no-gate": ["if (answering && !can(member, \"requests\")) {", "if (answering && false) {"],
  "status-only": ["&& (body.soft_delete === true || (body.status", "&& ((body.status"],
};
if (BREAK) {
  const s = SABOTAGE[BREAK];
  if (!s) { console.error(`unknown BREAK=${BREAK}`); process.exit(2); }
  if (ub.split(s[0]).length !== 2) { console.error(`BREAK=${BREAK} did not land — the edit must match exactly once`); process.exit(2); }
  ub = ub.replace(s[0], s[1]);
  console.log(`BREAK=${BREAK} landed: ${s[0].length - s[1].length} characters removed`);
}

// ── An in-memory database with the query shapes the handler uses ──────────
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
  if (q.op === "update") for (const r of hit) Object.assign(r, structuredClone(q.patch));
  if (q.op !== "select" && q.op !== "update") return { error: null };
  return { data: hit[0] ? structuredClone(hit[0]) : null, error: null };
}

// The REAL `can` — the rule under test is the handler calling it, and a fake
// `can` would be a second copy of the permission rule (`_shared/permissions.ts`).
const { can } = await import("../supabase/functions/_shared/permissions.ts");
const MEMBERS = {
  tickless: { businessId: "biz_1", userId: "staff_1", role: "staff", permissions: ["money", "settings", "marketing"] },
  ticked: { businessId: "biz_1", userId: "staff_2", role: "staff", permissions: ["requests"] },
  owner: { businessId: "biz_1", userId: "owner_1", role: "owner", permissions: [] },
};
let caller = MEMBERS.tickless;
const tag = (kind) => () => ({ subject: kind, html: kind, text: kind });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
globalThis.__fakes99_13 = {
  db: { supabase },
  http: { json, preflight: () => new Response(null, { status: 204 }) },
  pricing: { servicesForBooking: async () => [] },
  tenant: {
    requireMember: async () => caller,
    businessById: async (id) => ({ id, name: "Ridgeline Auto Detail", timezone: "America/Los_Angeles" }),
    getSettings: async () => ({}),
    can,
  },
  slotValidation: { validateSlot: async () => ({ ok: true }), dayRuleRefusal: () => null },
  ownerPush: { sendOwnerPush: async () => {} },
  actionLog: { recordActions: async () => true },
  email: { buildBrand: async () => ({}), extraVehiclesFor: async () => [], sendTenantEmail: async () => true },
  emailTemplates: { cancellationEmail: tag("cancelled"), rescheduleEmail: tag("moved"), restoredEmail: tag("back-on") },
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
    if (!globalThis.__fakes99_13[mod]) unknown.push(`${name}: ${mod}`);
    const list = names.split(",").map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/\s+as\s+/, ": ")).join(", ");
    return `const { ${list} } = globalThis.__fakes99_13[${JSON.stringify(mod)}];`;
  });
  if (/^import /m.test(js)) unknown.push(`${name}: an import was not replaced`);
  writeFileSync(`${TMP}${name}.mjs`, js);
  await import(pathToFileURL(`${TMP}${name}.mjs`).href + `?${Date.now()}`);
  return served;
}
const updateBooking = await load("update-booking", ub);
const canaryHandler = BREAK ? null : await load("update-booking-canary", ub.replace(SABOTAGE["no-gate"][0], SABOTAGE["no-gate"][1]));
check("the production handler loaded with every import replaced", typeof updateBooking === "function" && unknown.length === 0, unknown.join(" | "));

const row = (over) => ({
  id: "bk_1", business_id: "biz_1", status: "pending", declined_at: null, deleted_at: null, admin_notes: null,
  quoted_amount: null, quoted_at: null, payment_status: "pending", total_price: 150, subtotal: 150,
  start_at: "2026-10-20T16:00:00.000Z", end_at: "2026-10-20T18:00:00.000Z",
  customer_name: "Maya Ortiz", customer_email: "maya@example.test", service_type: "mobile", ...over,
});
const call = async (fn, body) => {
  const res = await fn(new Request("https://fn.test/x", { method: "POST", body: JSON.stringify({ booking_id: "bk_1", business_id: "biz_1", ...body }) }));
  return { status: res.status, body: await res.json() };
};
const fresh = (over) => { db.bookings = [row(over)]; };
const refused = (r) => r.status === 403 && /permission to answer booking requests/.test(String(r.body?.error));

const SCENARIOS = 10;
let reached = 0;
let r;

console.log("\n§ 1 — staff WITHOUT \"Answer requests\": answering a request is refused");
caller = MEMBERS.tickless;
for (const [label, body] of [["accept (pending → confirmed)", { status: "confirmed" }], ["decline (pending → cancelled)", { status: "cancelled" }]]) {
  fresh({});
  r = await call(updateBooking, body);
  reached++;
  check(`${label} · refused 403 with the respond-to-booking wording`, refused(r), `${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
  check(`${label} · the request is still pending`, db.bookings[0].status === "pending", db.bookings[0].status);
}
fresh({});
r = await call(updateBooking, { soft_delete: true });
reached++;
check("remove (soft delete of a request) · refused 403", refused(r), `${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
check("remove · the request is still in the records", db.bookings[0].deleted_at === null, String(db.bookings[0].deleted_at));

console.log("\n§ 2 — staff WITHOUT the tick: the rest of the diary still works");
fresh({});
r = await call(updateBooking, { admin_notes: "Gate code 4411" });
reached++;
check("a note on a pending request · saved", r.status === 200 && db.bookings[0].admin_notes === "Gate code 4411" && db.bookings[0].status === "pending", `${r.status}`);
fresh({});
r = await call(updateBooking, { status: "pending", admin_notes: "Same status sent back" });
reached++;
check("a pending request saved with its own status sent back · saved", r.status === 200 && db.bookings[0].status === "pending", `${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
fresh({ status: "confirmed" });
r = await call(updateBooking, { status: "completed" });
reached++;
check("a confirmed job marked completed · saved", r.status === 200 && db.bookings[0].status === "completed", `${r.status}`);
fresh({ status: "confirmed" });
r = await call(updateBooking, { soft_delete: true });
reached++;
check("a confirmed job removed from records · allowed (not a request)", r.status === 200 && db.bookings[0].deleted_at !== null, `${r.status}`);

console.log("\n§ 3 — staff WITH the tick, and an owner: answering still works");
caller = MEMBERS.ticked;
fresh({});
r = await call(updateBooking, { status: "confirmed" });
reached++;
check("ticked staff · pending → confirmed saved", r.status === 200 && db.bookings[0].status === "confirmed", `${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
fresh({});
r = await call(updateBooking, { soft_delete: true });
reached++;
check("ticked staff · request removed", r.status === 200 && db.bookings[0].deleted_at !== null, `${r.status}`);
caller = MEMBERS.owner;
fresh({});
r = await call(updateBooking, { status: "cancelled" });
reached++;
check("owner (no ticks, owns everything) · pending → cancelled saved", r.status === 200 && db.bookings[0].status === "cancelled", `${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);

let canaryCaught = false;
if (canaryHandler) {
  caller = MEMBERS.tickless;
  fresh({});
  const c = await call(canaryHandler, { status: "confirmed" });
  canaryCaught = !refused(c) && db.bookings[0].status === "confirmed";
  console.log(`\ncanary  a handler without the gate let tickless staff accept a request (${c.status}, now ${db.bookings[0].status}): ${canaryCaught ? "caught" : "NOT CAUGHT"}`);
  if (!canaryCaught) failures.push("canary not caught: the refusal predicate passed a handler with no gate");
}
const failed = failures.length;
console.log(`\n${assertions - failed} passed, ${failed} failed, ${reached} of ${SCENARIOS} scenarios.`);
const logName = receiptFile(`requests-tick-holds${BREAK ? `-${BREAK}.sabotage` : ""}.txt`);
writeFileSync(path(logName), [`requests-tick-holds${BREAK ? ` BREAK=${BREAK}` : ""} — ${new Date().toISOString()}`, ...lines,
  `${assertions - failed} passed, ${failed} failed, ${reached} of ${SCENARIOS} scenarios.`].join("\n") + "\n");
const { path: receipt } = writeReceipt({
  check_id: BREAK ? `requests-tick-holds-${BREAK}` : "requests-tick-holds",
  started_at,
  status: failed || reached !== SCENARIOS || (!BREAK && !canaryCaught) ? "fail" : "pass",
  expected_targets: SCENARIOS,
  discovered_targets: reached,
  attempted_targets: reached,
  completed_targets: reached,
  skipped_targets: 0,
  assertions_executed: assertions,
  // Below the 14 a clean run executes (receipt.mjs refuses an equal floor);
  // the 10-of-10 scenario count is what binds a run that quietly did less.
  min_assertions: 12,
  failures,
  dimensions: { handler: "supabase/functions/update-booking/index.ts", ...(BREAK ? { break: BREAK } : {}) },
  artifacts: [logName],
  canary: BREAK
    ? { id: `break-${BREAK}`, observed_failure: failed > 0 }
    : { id: "tickless-staff-accepts-through-a-handler-without-the-gate", observed_failure: canaryCaught,
      sabotage_receipts: Object.keys(SABOTAGE).map((b) => receiptFile(`requests-tick-holds-${b}.sabotage.json`)) },
});
console.log(`receipt: ${receipt}`);
process.exitCode = failed || reached !== SCENARIOS || (!BREAK && !canaryCaught) ? 1 : 0;
