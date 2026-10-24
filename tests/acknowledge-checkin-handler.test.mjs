// ROADMAP 97.55 - THE REAL `acknowledge-checkin` HANDLER, RUN IN MEMORY.
//
// `tests/damage-checkin.test.mjs` proves the shared rule and the column. This proves the HANDLER, which
// that file cannot reach: the file `supabase/functions/acknowledge-checkin/index.ts` is imported as it is
// (Node strips the types), with each `_shared` import answered by a fake through a resolve hook, the same
// arrangement as `tests/day-rule-refusal.test.mjs`. No network, no credentials, no database.
//
//   live, unticked   200, stored time is "now", exactly one row written
//   ticked already   200 `duplicate: true` with the FIRST time; nothing written
//   cancelled        409, nothing written
//   unknown booking  404, nothing written
//   no booking_id    400
//   over the ceiling 429, nothing read
//   two presses      the row is ticked between this press's read and its write: the write matches no
//                    row and the answer is `duplicate: true` with the other press's time, never a
//                    fresh success that moved the time
//
// SABOTAGE - an env var, never a flag (docs/gotchas.md 104), made in memory as the handler is loaded and
// required to land (docs/gotchas.md 102):
//   BREAK=no-cancel-check  the cancelled refusal removed         -> the cancelled case goes red
//   BREAK=no-only-if-empty the `.is("damage_ack_at", null)` fence on the write removed
//                                                                -> the two-presses case goes red
//   BREAK=moves-time       the already-ticked early answer AND the fence both removed (either alone is
//                          covered by the other) -> the ticked case goes red, a second press moves the time
//
//   node --test tests/acknowledge-checkin-handler.test.mjs

import { registerHooks } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

const BREAK = process.env.BREAK || "";
const HANDLER = fileURLToPath(new URL("../supabase/functions/acknowledge-checkin/index.ts", import.meta.url));
const FENCE = ['      .is("damage_ack_at", null)\n      .select("damage_ack_at")', '      .select("damage_ack_at")'];
const SABOTAGE = {
  "no-cancel-check": [['if (booking.status === "cancelled") {', "if (false) {"]],
  "no-only-if-empty": [FENCE],
  // The early answer and the fence are two guards on one fact: either alone still keeps the first time, so only both gone moves it.
  "moves-time": [["if (booking.damage_ack_at) {", "if (false) {"], FENCE],
};
if (BREAK && !SABOTAGE[BREAK]) { console.error(`unknown BREAK=${BREAK}`); process.exit(2); }

const FILE = /\/supabase\/functions\/acknowledge-checkin\/index\.ts\?fakes=(\w+)$/;
const asModule = (src) => ({ url: `data:text/javascript,${encodeURIComponent(src)}`, shortCircuit: true });
registerHooks({
  resolve(spec, ctx, next) {
    const parent = FILE.exec(ctx.parentURL ?? "");
    if (!parent) return next(spec, ctx);
    if (spec.startsWith("jsr:")) return asModule("");
    const mod = /^\.\.\/_shared\/(\w+)\.ts$/.exec(spec)?.[1];
    if (!mod) return next(spec, ctx);
    const ref = `globalThis[${JSON.stringify(parent[1])}][${JSON.stringify(mod)}]`;
    return asModule(Object.keys(globalThis[parent[1]][mod] ?? {}).map((n) => `export const ${n} = ${ref}[${JSON.stringify(n)}];`).join("\n"));
  },
  load(url, ctx, next) {
    const r = next(url, ctx);
    if (!FILE.test(url) || !BREAK) return r;
    let src = String(r.source).replace(/\r\n/g, "\n");
    for (const [a, b] of SABOTAGE[BREAK]) {
      // The patch must land exactly where it is aimed, or the red it produces proves nothing.
      if (src.split(a).length !== 2) { console.error(`BREAK=${BREAK} did not land: ${a}`); process.exit(2); }
      src = src.replace(a, () => b);
    }
    return { ...r, source: src };
  },
});

const http = await import("../supabase/functions/_shared/http.ts");
const ID = "00000000-0000-4000-8000-000000000055";
const FIRST = "2026-10-20T08:00:00.000Z";
let loads = 0;

// A bookings table of one row that honours `.eq` and `.is(col, null)` exactly as PostgREST does, and
// counts writes. `raceFirst` ticks the row after the handler's read and before its write.
function world({ row, withinLimits = true, raceFirst = false }) {
  const rows = row ? [{ id: ID, deleted_at: null, ...row }] : [];
  const writes = [];
  let reads = 0;
  const supabase = {
    from() {
      const filters = [];
      let patch = null;
      const q = {
        select() { return q; },
        update(p) { patch = p; return q; },
        eq(c, v) { filters.push((r) => r[c] === v); return q; },
        is(c, v) { filters.push((r) => (r[c] ?? null) === v); return q; },
        async maybeSingle() {
          if (!patch) { reads++; return { data: structuredClone(rows.find((r) => filters.every((f) => f(r)))) ?? null, error: null }; }
          if (raceFirst && rows[0]) rows[0].damage_ack_at = FIRST;
          const hit = rows.find((r) => filters.every((f) => f(r)));
          if (!hit) return { data: null, error: null };
          Object.assign(hit, patch);
          writes.push(patch);
          return { data: structuredClone(hit), error: null };
        },
      };
      return q;
    },
  };
  const fakes = {
    db: { supabase },
    http: { json: http.json, preflight: http.preflight },
    rateLimit: { ipOf: () => "fixture", LIMITS: { publicCeiling: {} }, withinLimits: async () => withinLimits },
  };
  return { rows, writes, fakes, reads: () => reads };
}

async function call(w, body) {
  const key = `__fakes97_55_${++loads}`;
  globalThis[key] = w.fakes;
  let served = null;
  globalThis.Deno = { env: { get: () => undefined }, serve: (h) => { served = h; } };
  await import(`${pathToFileURL(HANDLER).href}?fakes=${key}`);
  assert.equal(typeof served, "function", "the handler did not call Deno.serve");
  const res = await served(new Request("https://fixture.invalid/", { method: "POST", body: JSON.stringify(body) }));
  return { status: res.status, data: await res.json() };
}

let scenarios = 0;

test("a live unticked booking is ticked: 200, a fresh time, one write", async () => {
  const w = world({ row: { status: "confirmed", damage_ack_at: null } });
  const before = Date.now();
  const r = await call(w, { booking_id: ID });
  scenarios++;
  assert.equal(r.status, 200);
  assert.equal(r.data.success, true);
  assert.notEqual(r.data.duplicate, true);
  assert.ok(Date.parse(r.data.damage_ack_at) >= before - 1000, "the stored time is now");
  assert.equal(w.writes.length, 1);
  assert.equal(w.rows[0].damage_ack_at, r.data.damage_ack_at);
});

test("an already-ticked booking answers duplicate with the FIRST time and writes nothing", async () => {
  const w = world({ row: { status: "confirmed", damage_ack_at: FIRST } });
  const r = await call(w, { booking_id: ID });
  scenarios++;
  assert.equal(r.status, 200);
  assert.equal(r.data.duplicate, true);
  assert.equal(r.data.damage_ack_at, FIRST);
  assert.equal(w.writes.length, 0);
  assert.equal(w.rows[0].damage_ack_at, FIRST);
});

test("a cancelled booking is refused with 409 and nothing is written", async () => {
  const w = world({ row: { status: "cancelled", damage_ack_at: null } });
  const r = await call(w, { booking_id: ID });
  scenarios++;
  assert.equal(r.status, 409);
  assert.match(r.data.error, /cancelled/i);
  assert.equal(w.writes.length, 0);
  assert.equal(w.rows[0].damage_ack_at, null);
});

test("an unknown booking gets 404 and nothing is written", async () => {
  const w = world({ row: null });
  const r = await call(w, { booking_id: ID });
  scenarios++;
  assert.equal(r.status, 404);
  assert.equal(w.writes.length, 0);
});

test("a deleted booking gets 404 too", async () => {
  const w = world({ row: { status: "confirmed", damage_ack_at: null, deleted_at: "2026-10-01T00:00:00Z" } });
  const r = await call(w, { booking_id: ID });
  scenarios++;
  assert.equal(r.status, 404);
  assert.equal(w.writes.length, 0);
});

test("no booking id gets 400", async () => {
  const w = world({ row: { status: "confirmed", damage_ack_at: null } });
  const r = await call(w, {});
  scenarios++;
  assert.equal(r.status, 400);
  assert.equal(w.writes.length, 0);
});

test("over the per-address ceiling gets 429 before anything is read", async () => {
  const w = world({ row: { status: "confirmed", damage_ack_at: null }, withinLimits: false });
  const r = await call(w, { booking_id: ID });
  scenarios++;
  assert.equal(r.status, 429);
  assert.equal(w.reads(), 0);
  assert.equal(w.writes.length, 0);
});

test("two presses at once: the loser answers duplicate with the winner's time and moves nothing", async () => {
  const w = world({ row: { status: "confirmed", damage_ack_at: null }, raceFirst: true });
  const r = await call(w, { booking_id: ID });
  scenarios++;
  assert.equal(r.status, 200);
  assert.equal(r.data.duplicate, true, "a press that lost the race must not answer as a fresh success");
  assert.equal(r.data.damage_ack_at, FIRST);
  assert.equal(w.rows[0].damage_ack_at, FIRST, "the first time stays the record");
  assert.equal(w.writes.length, 0);
});

test("every scenario ran (a run that reached fewer proves only what it reached)", () => {
  assert.equal(scenarios, 8);
});
