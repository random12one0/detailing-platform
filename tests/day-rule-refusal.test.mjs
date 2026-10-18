// ROADMAP 97.18 — THE THREE HANDLERS THAT NOW WRITE THROUGH THE DAY LOCK, RUN IN MEMORY.
//
// `scripts/booking-day-lock.mjs` proves the database half on a throwaway Postgres: two racing writes, one
// refused with BK001 (day full) or BK002 (too close). This proves the HANDLER half, which that script cannot
// reach: create-booking, reschedule-booking and update-booking answering a refused write with the sentence
// validateSlot already shows, and an allowed write still doing what it did. reschedule-booking and
// update-booking are the REAL files, imported as they are (Node strips the types), with each `_shared` import
// answered by a fake through a resolve hook; the expected sentences come from the real slotValidation.ts.
//
//   create-booking   (scripts/lib/bookingConsentFixture.mjs, the harness six other suites use)
//     ordinary      200, written through insert_booking_checked, confirmation sent
//     full / close  a stranger's racing booking saved first: 409 and the sentence, nothing sent
//     twin          the customer's own first press saved first and this one met it on the buffer:
//                   200 with their own booking (`duplicate: true`), nothing sent twice
//   reschedule-booking and update-booking
//     ok            200, written through move_booking_checked with the read-at fence, notices sent
//     full / close  409 and the sentence, the row unmoved, nothing sent
//     plain edit    (update-booking) an edit that is not a move does not touch the lock at all
//
// No network, no credentials, no database.
//
// SABOTAGE — an env var, never a flag (docs/gotchas.md 104), made in memory as the handler is loaded, never to
// the file, and it must land (docs/gotchas.md 102):
//   BREAK=no-map     the BK001/BK002 → sentence mapping removed from all three handlers
//   BREAK=twin-first create-booking stops sending a day-rule refusal through the twin-press lookup
//
//   node --test tests/day-rule-refusal.test.mjs

import { writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeReceipt } from "../scripts/receipt.mjs";
import { bookingFixture, fixtureBooking } from "../scripts/lib/bookingConsentFixture.mjs";

const path = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const BREAK = process.env.BREAK || "";
const started_at = new Date().toISOString();
const MAP = ["const dayRule = dayRuleRefusal(", "const dayRule = null && dayRuleRefusal("];
const SABOTAGE = {
  "no-map": { "create-booking": [MAP], "reschedule-booking": [MAP], "update-booking": [MAP] },
  "twin-first": { "create-booking": [['insertErr.code === "23505" || dayRule)', 'insertErr.code === "23505")']] },
};
if (BREAK && !SABOTAGE[BREAK]) { console.error(`unknown BREAK=${BREAK}`); process.exit(2); }
const patchFor = (fn) => (BREAK ? SABOTAGE[BREAK][fn] ?? [] : []);
// The patch must land exactly where it is aimed, or the red it produces proves nothing.
const patched = (fn, src) => {
  for (const [a, b] of patchFor(fn)) {
    if (src.split(a).length !== 2) { console.error(`BREAK=${BREAK} did not land in ${fn}: ${a}`); process.exit(2); }
    src = src.replace(a, () => b);
  }
  return src;
};

// THE REAL FILE IS IMPORTED, NOT ITS TEXT: Node strips the types itself, and a resolve hook answers each
// `../_shared/<mod>.ts` the handler imports with a module exporting `fakes[mod]`. A name the fake lacks
// fails the import by name. The file is only rewritten under BREAK, in the load hook, and the patch must land.
const HANDLER = /\/supabase\/functions\/(reschedule-booking|update-booking)\/index\.ts\?fakes=(\w+)$/;
const asModule = (src) => ({ url: `data:text/javascript,${encodeURIComponent(src)}`, shortCircuit: true });
registerHooks({
  resolve(spec, ctx, next) {
    if (spec === "./db.ts" && ctx.parentURL?.endsWith("/_shared/slotValidation.ts")) return asModule("export const supabase = null;");
    const parent = HANDLER.exec(ctx.parentURL ?? "");
    if (!parent) return next(spec, ctx);
    if (spec.startsWith("jsr:")) return asModule("");
    const mod = /^\.\.\/_shared\/(\w+)\.ts$/.exec(spec)?.[1];
    if (!mod) return next(spec, ctx);
    const ref = `globalThis[${JSON.stringify(parent[2])}][${JSON.stringify(mod)}]`;
    return asModule(Object.keys(globalThis[parent[2]][mod] ?? {}).map((n) => `export const ${n} = ${ref}[${JSON.stringify(n)}];`).join("\n"));
  },
  load(url, ctx, next) {
    const hit = HANDLER.exec(url);
    const r = next(url, ctx);
    return hit && BREAK ? { ...r, source: patched(hit[1], String(r.source).replace(/\r\n/g, "\n")) } : r;
  },
});
// The real refusal mapping, from the module the three handlers import it from (its database client stood in for).
const { DAY_FULL, TOO_CLOSE, dayRuleRefusal } = await import("../supabase/functions/_shared/slotValidation.ts");

let assertions = 0, reached = 0;
const failures = [], lines = [];
const check = (name, cond, detail = "") => {
  assertions++;
  lines.push(`${cond ? "ok  " : "FAIL"}  ${name}${cond || !detail ? "" : ` — ${detail}`}`);
  if (!cond) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

// ── create-booking, through the shared harness ──────────────────────────────
async function create(collision, payload) {
  const createPatch = patchFor("create-booking");
  const f = bookingFixture({ collision, srcPatch: createPatch.map(([a, b]) => [a, b]) });
  const calls = [];
  const rpc = f.db.rpc;
  f.db.rpc = (name, args) => { calls.push(name); return rpc(name, args); };
  const r = await f.book(payload);
  reached++;
  return { ...r, calls, f };
}
const STRANGER = { ...fixtureBooking, customer_phone: "(555) 012-9876", customer_name: "Sam Rivera" };
{
  const { status, data, calls, f } = await create(false, fixtureBooking);
  check("create ordinary: 200", status === 200, `status ${status} ${JSON.stringify(data)}`);
  check("create ordinary: written through insert_booking_checked", calls.includes("insert_booking_checked"), calls.join(","));
  check("create ordinary: one booking saved, one confirmation sent", f.rows.bookings.length === 1 && f.sends.length === 1, `${f.rows.bookings.length} saved, ${f.sends.length} sent`);
}
for (const [code, sentence, label] of [["BK001", DAY_FULL, "full"], ["BK002", TOO_CLOSE, "close"]]) {
  const { status, data, f } = await create(code, STRANGER);
  check(`create ${label}: a stranger's racing booking refuses this one with 409`, status === 409, `status ${status}`);
  check(`create ${label}: with the sentence validateSlot shows`, data?.error === sentence, JSON.stringify(data));
  check(`create ${label}: no confirmation sent`, f.sends.length === 0, `${f.sends.length} sent`);
}
{
  const { status, data, f } = await create("BK002", fixtureBooking);
  check("create twin: the customer's own first press is handed back (200, duplicate)", status === 200 && data?.duplicate === true, `status ${status} ${JSON.stringify(data)}`);
  check("create twin: no second confirmation", f.sends.length === 0, `${f.sends.length} sent`);
}

// ── reschedule-booking and update-booking, the real handlers with every import replaced ──
const OLD_START = "2030-03-12T16:00:00.000Z", OLD_END = "2030-03-12T18:00:00.000Z";
const NEW_START = "2030-03-13T17:00:00.000Z", NEW_END = "2030-03-13T19:00:00.000Z";
const tz = await import("../supabase/functions/_shared/tz.ts");
const connect = await import("../supabase/functions/_shared/connect.ts");
let loads = 0;
function world(refuse) {
  const rows = [{ id: "bk_1", business_id: "biz_1", status: "confirmed", start_at: OLD_START, end_at: OLD_END, deleted_at: null,
    customer_name: "Maya Ortiz", customer_email: "maya@example.invalid", customer_phone: "(555) 010-2000", service_type: "mobile",
    total_price: 150, subtotal: 150, lang: "en" }];
  const rpcs = [], sends = [], pushes = [];
  const supabase = {
    from() {
      const filters = [];
      let patch = null;
      const b = {
        select() { return b; }, eq(c, v) { filters.push((r) => r[c] === v); return b; }, is(c, v) { filters.push((r) => (r[c] ?? null) === v); return b; },
        update(p) { patch = p; return b; }, maybeSingle() { return b; }, single() { return b; },
        then(ok, bad) {
          const hit = rows.filter((r) => filters.every((f) => f(r)));
          if (patch) hit.forEach((r) => Object.assign(r, structuredClone(patch)));
          return Promise.resolve({ data: hit[0] ? structuredClone(hit[0]) : null, error: null }).then(ok, bad);
        },
      };
      return b;
    },
    // move_booking_checked as the migration defines it: refused, or the patch under the two fences.
    rpc(name, args) {
      rpcs.push({ name, args });
      const answer = () => {
        if (name !== "move_booking_checked") return { data: null, error: { code: "PGRST202", message: "unknown function " + name } };
        if (refuse) return { data: null, error: { code: refuse, message: "refused" } };
        const r = rows.find((x) => x.id === args.p_id && x.business_id === args.p_business
          && (args.p_from_start == null || new Date(x.start_at).getTime() === new Date(args.p_from_start).getTime())
          && (args.p_from_status == null || x.status === args.p_from_status));
        if (r) Object.assign(r, structuredClone(args.p_patch));
        return { data: r ? structuredClone(r) : null, error: null };
      };
      return { maybeSingle: async () => answer() };
    },
  };
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const fakes = {
    db: { supabase },
    http: { json, preflight: () => new Response(null, { status: 204 }) },
    rateLimit: { ipOf: () => "fixture", LIMITS: { publicCeiling: {} }, withinLimits: async () => true },
    tenant: {
      businessById: async (id) => ({ id, name: "Ridgeline Auto Detail", timezone: "America/Los_Angeles", contact_phone: null }),
      getSettings: async () => ({ cancellation_window_hours: 24 }),
      requireMember: async () => ({ businessId: "biz_1", userId: "user_1", role: "owner" }),
    },
    pricing: { servicesForBooking: async () => [] },
    slotValidation: { dayRuleRefusal, validateSlot: async () => ({ ok: true, startAt: new Date(NEW_START), endAt: new Date(NEW_END) }) },
    email: { buildBrand: async () => ({ contactEmail: null }), extraVehiclesFor: async () => [], recipientLang: async () => "en", sendTenantEmail: async (m) => { sends.push(m); } },
    emailTemplates: { rescheduleEmail: () => ({ subject: "Moved", html: "", text: "" }), cancellationEmail: () => ({ subject: "Cancelled", html: "", text: "" }), restoredEmail: () => ({ subject: "Restored", html: "", text: "" }) },
    ownerPush: { sendOwnerPush: async (_b, p) => { pushes.push(p); } },
    actionLog: { recordActions: async () => true },
    connect,
    config: { receiptUrl: () => "" },
    tenantSite: { siteFor: async () => "" },
    tz,
  };
  return { rows, rpcs, sends, pushes, fakes };
}
async function handler(fn, fakes) {
  const key = `__fakes97_18_${++loads}`;
  globalThis[key] = fakes;
  let served = null;
  globalThis.Deno = { env: { get: () => undefined }, serve: (h) => { served = h; } };
  await import(`${pathToFileURL(path(`supabase/functions/${fn}/index.ts`)).href}?fakes=${key}`);
  if (typeof served !== "function") throw new Error(`${fn} did not call Deno.serve`);
  return served;
}
const call = async (fn, refuse, body) => {
  const w = world(refuse);
  const served = await handler(fn, w.fakes);
  const res = await served(new Request("https://fixture.invalid/", { method: "POST", body: JSON.stringify(body) }));
  reached++;
  return { ...w, status: res.status, data: await res.json() };
};
const MOVE = { booking_id: "bk_1", booking_date: "2030-03-13", start_time: "10:00" };

for (const fn of ["reschedule-booking", "update-booking"]) {
  {
    const r = await call(fn, null, MOVE);
    const mv = r.rpcs.find((c) => c.name === "move_booking_checked");
    check(`${fn} ok: 200`, r.status === 200, `status ${r.status} ${JSON.stringify(r.data)}`);
    check(`${fn} ok: written through move_booking_checked, fenced at the start it read`, !!mv && mv.args.p_from_start === OLD_START && mv.args.p_patch.start_at === NEW_START, JSON.stringify(mv?.args));
    check(`${fn} ok: the row moved and the customer was told`, r.rows[0].start_at === NEW_START && r.sends.length === 1 && r.pushes.length === 1, `start ${r.rows[0].start_at}, ${r.sends.length} sent, ${r.pushes.length} pushed`);
  }
  for (const [code, sentence, label] of [["BK001", DAY_FULL, "full"], ["BK002", TOO_CLOSE, "close"]]) {
    if (fn === "update-booking" && label === "full") continue; // one refusal each way is asked of update-booking; the mapping is shared
    const r = await call(fn, code, MOVE);
    check(`${fn} ${label}: 409 with the sentence validateSlot shows`, r.status === 409 && r.data?.error === sentence, `status ${r.status} ${JSON.stringify(r.data)}`);
    check(`${fn} ${label}: the row is unmoved and nothing was sent`, r.rows[0].start_at === OLD_START && r.sends.length === 0 && r.pushes.length === 0, `start ${r.rows[0].start_at}, ${r.sends.length} sent, ${r.pushes.length} pushed`);
  }
}
{
  const r = await call("update-booking", "BK001", { booking_id: "bk_1", payment_notes: "Cash" });
  check("update-booking plain edit: 200 and saved without the lock", r.status === 200 && r.rows[0].payment_notes === "Cash" && r.rpcs.length === 0, `status ${r.status}, rpcs ${r.rpcs.map((c) => c.name).join(",") || "none"}`);
}

// THE CANARY, clean runs only: the same refused move with the mapping removed from the fake must lose its
// sentence. If it still printed the sentence, the cases above could not tell a mapped refusal from any other.
let canary = null;
if (!BREAK) {
  const w = world("BK001");
  w.fakes.slotValidation = { ...w.fakes.slotValidation, dayRuleRefusal: () => null };
  const res = await (await handler("reschedule-booking", w.fakes))(new Request("https://fixture.invalid/", { method: "POST", body: JSON.stringify(MOVE) }));
  const body = await res.json();
  canary = { status: res.status, error: body?.error ?? null, lost_sentence: body?.error !== DAY_FULL };
  lines.push(`canary (mapping removed in the fake): status ${res.status}, ${JSON.stringify(body)}`);
}

const SCENARIOS = 10;
const failed = failures.length;
const logName = `receipts/day-rule-refusal${BREAK ? `-${BREAK}.sabotage` : ""}.txt`;
writeFileSync(path(logName), [`day-rule-refusal${BREAK ? ` BREAK=${BREAK}` : ""} — ${new Date().toISOString()}`, ...lines,
  `${assertions - failed} passed, ${failed} failed, ${reached} of ${SCENARIOS} scenarios.`].join("\n") + "\n");
const { path: receipt } = writeReceipt({
  check_id: BREAK ? `day-rule-refusal-${BREAK}` : "day-rule-refusal",
  started_at,
  status: failed || reached !== SCENARIOS ? "fail" : "pass",
  expected_targets: SCENARIOS,
  discovered_targets: reached,
  attempted_targets: reached,
  completed_targets: reached,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 24,
  assertion_floor: "create 3+3+3+2, reschedule 3+2+2, update 3+2, plain edit 1 = 24; every check() unconditional.",
  failures,
  dimensions: { handlers: ["create-booking", "reschedule-booking", "update-booking"], item: "97.18", ...(BREAK ? { break: BREAK } : {}) },
  artifacts: [logName],
  // The canary: the refusal sentence is compared exactly, so a handler answering 409 with anything else, or a
  // check comparing nothing, cannot pass it AND the two sabotages.
  canary: BREAK ? { id: `break-${BREAK}`, observed_failure: failed > 0 } : { id: "mapping-removed-loses-the-sentence", observed_failure: !!canary?.lost_sentence },
});
console.log(lines.join("\n"));
console.log(`\n${assertions - failed} passed, ${failed} failed, ${reached} of ${SCENARIOS} scenarios.\nreceipt: ${receipt}`);
test("97.18 · the three handlers answer a day-rule refusal with the existing sentence and still serve an allowed write", () => {
  assert.equal(reached, SCENARIOS, `${reached} of ${SCENARIOS} scenarios reached`);
  assert.deepEqual(failures, []);
});
