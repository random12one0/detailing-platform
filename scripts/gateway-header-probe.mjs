// ROADMAP 14.18 — DOES AN OUTSIDE CALLER GET COUNTED? The two calls the item asks for.
//
//   set -a; . ./.env; set +a
//   node scripts/gateway-header-probe.mjs
//   node scripts/gateway-header-probe.mjs --break=blind
//
// The question: `ipOf(req)` keys every per-IP limit on `x-forwarded-for`. The
// code comment says Supabase's gateway writes that header itself (measured
// 2026-09-06); 14.18 asks whether that holds for a caller from the public
// internet, because a caller who arrives WITHOUT it was, before the fix, not
// counted at all. The answer has to come from `rate_hits`, not from "the edge
// probably sets it".
//
// WHAT IT DOES, in order. Two live calls to ONE rate-limited public function
// (`available-slots`, read-only, ceiling 600 an hour), never a loop:
//   A. no `x-forwarded-for` header at all (what node's fetch sends by default);
//   B. `x-forwarded-for: 203.0.113.18` (a documentation address, not the caller).
// `rate_hits` for the `available-slots%` buckets is read immediately before
// A, after A, and after B (read-only, service role), and each call is judged
// by the rows it moved:
//   - COUNTED UNDER THE REAL ADDRESS  = the gateway wrote the header (A) or
//     overwrote the forged one (B) — the per-IP limit is enforced.
//   - COUNTED UNDER THE FORGED VALUE  = the gateway believed the client; a
//     caller can pick its own bucket, so the per-IP limit is bypassable.
//   - NOT COUNTED                     = the limit is advisory. THAT IS THE
//     FINDING, not a failure of this test (the item says so).
//
// THE READER HAS TO BE PROVEN BEFORE ITS SILENCE MEANS ANYTHING. Before the
// first call the script writes one control row through `rate_take` (bucket
// `probe-14-18-control`) and reads it back with the same reader; if it cannot
// see its own row it stops with UNJUDGEABLE and makes NO public call. The row
// is deleted by exact bucket and key afterwards. `--break=blind` points the
// reader at the wrong bucket name: the control is then unseen and the run must
// go red as UNJUDGEABLE, never report "advisory". `--break=blind-calls` lets the
// control pass and blinds only the reads around the two calls, so nothing seems
// to move: the run must then say "advisory" (the finding), proving the verdict
// can come out the other way. It spends the same two public calls.
//
// WRITES: the control row (deleted), and one row per call in `rate_hits` —
// that is the thing being measured. Any row keyed on the forged value is
// deleted by exact key. The row under this machine's real address is shared
// with whoever else is calling `available-slots` from here and is left alone.
// It never prints or stores the address, only "<this machine>".

import { mkdirSync, writeFileSync } from "node:fs";
import { REPO, writeReceipt } from "./receipt.mjs";

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const { SUPABASE_URL: URL_, SUPABASE_SERVICE_ROLE_KEY: SR, SUPABASE_ANON_KEY: ANON } = process.env;
if (!URL_ || !SR || !ANON) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY — load .env first"); process.exit(2); }
// THIS PLATFORM'S OWN PROJECT, AND NOTHING ELSE (CLAUDE.md hard rules).
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) { console.error(`refusing: SUPABASE_URL is not kguqylyzgyzfktkfnhjb (${URL_})`); process.exit(2); }

const FUNCTION = "available-slots";
const FORGED = "203.0.113.18";
const CONTROL = { bucket: "probe-14-18-control", key: "control" };
const READ_BUCKET = BREAK === "blind" ? "available-slotz" : FUNCTION;
const sr = { apikey: SR, Authorization: `Bearer ${SR}` };

const started = new Date().toISOString();
const failures = [];
let assertions = 0;
const ok = (cond, msg) => { assertions++; if (!cond) failures.push(msg); console.log(`${cond ? "ok  " : "FAIL"} ${msg}`); };

const read = async (bucketLike) => {
  const r = await fetch(`${URL_}/rest/v1/rate_hits?bucket=like.${encodeURIComponent(bucketLike)}%25&select=bucket,key,window_start,hits`, { headers: sr });
  if (!r.ok) throw new Error(`rate_hits read ${r.status}`);
  return r.json();
};
const id = (x) => `${x.bucket}|${x.key}|${x.window_start}`;
// What moved between two reads: rows that are new or grew, with the growth.
const moved = (before, after) => {
  const was = new Map(before.map((x) => [id(x), x.hits]));
  return after.map((x) => ({ ...x, delta: x.hits - (was.get(id(x)) ?? 0) })).filter((x) => x.delta > 0);
};
const del = (bucket, key) =>
  fetch(`${URL_}/rest/v1/rate_hits?bucket=eq.${encodeURIComponent(bucket)}&key=eq.${encodeURIComponent(key)}`, { method: "DELETE", headers: sr });

// ---------- the reader's own positive control ----------
const take = await fetch(`${URL_}/rest/v1/rpc/rate_take`, {
  method: "POST", headers: { ...sr, "content-type": "application/json" },
  body: JSON.stringify({ p_bucket: CONTROL.bucket, p_key: CONTROL.key, p_window_seconds: 3600, p_limit: 5 }),
});
const controlRows = take.ok ? await read(BREAK === "blind" ? "available-slotz" : CONTROL.bucket) : [];
const controlSeen = controlRows.some((x) => x.bucket === CONTROL.bucket && x.key === CONTROL.key && x.hits >= 1);
await del(CONTROL.bucket, CONTROL.key);
ok(take.ok, `the control row was written through rate_take (${take.status})`);
ok(controlSeen, "the reader sees the control row it just wrote");

let calls = [], verdict, observed = {};
if (!controlSeen) {
  verdict = "UNJUDGEABLE: the reader cannot see a row it wrote, so no public call was made";
} else {
  const CALL_BUCKET = BREAK === "blind-calls" ? "available-slotz" : FUNCTION;
  const baseline = await read(CALL_BUCKET);
  const call = async (label, headers) => {
    const r = await fetch(`${URL_}/functions/v1/${FUNCTION}`, {
      method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "content-type": "application/json", ...headers },
      body: JSON.stringify({ business_slug: "demo-detail", duration_minutes: 60, start_date: "2026-11-02", end_date: "2026-11-02" }),
    });
    const text = await r.text();
    const after = await read(CALL_BUCKET);
    const rows = moved(calls.length ? calls[calls.length - 1].snapshot : baseline, after);
    const total = rows.reduce((s, x) => s + x.delta, 0);
    const forgedRow = rows.find((x) => x.key === FORGED);
    const realRow = rows.find((x) => x.key !== FORGED && x.key !== "all");
    const outcome = total !== 1 ? (total === 0 ? "NOT COUNTED" : `AMBIGUOUS (${total} hits moved)`)
      : forgedRow ? "COUNTED UNDER THE FORGED VALUE" : "COUNTED UNDER THE REAL ADDRESS";
    const entry = { label, sent_xff: headers["x-forwarded-for"] ?? null, status: r.status, body_head: text.slice(0, 80),
      outcome, rows_moved: rows.map((x) => ({ bucket: x.bucket, key: x.key === FORGED || x.key === "all" ? x.key : "<this machine>", delta: x.delta })),
      real_key: realRow?.key, snapshot: after };
    calls.push(entry);
    console.log(`${label}: HTTP ${r.status}, ${outcome}`);
    return entry;
  };
  const A = await call("A (header absent)", {});
  const B = await call("B (header forged)", { "x-forwarded-for": FORGED });
  if (B.rows_moved.some((x) => x.key === FORGED)) await del(FUNCTION, FORGED);

  ok(A.status === 200 && B.status === 200, `both calls reached the function and were answered (${A.status}, ${B.status})`);
  ok(!/^AMBIGUOUS/.test(A.outcome) && !/^AMBIGUOUS/.test(B.outcome), `each call moved exactly 0 or 1 hit, so the rows can be attributed (${A.outcome}; ${B.outcome})`);
  if (A.real_key && B.real_key) ok(A.real_key === B.real_key, "the forged call landed on the same row as the unforged one (same real address)");

  const parts = [`absent header: ${A.outcome}`, `forged header: ${B.outcome}`];
  const advisory = [A, B].some((c) => c.outcome === "NOT COUNTED");
  const spoofable = B.outcome === "COUNTED UNDER THE FORGED VALUE";
  verdict = spoofable ? `FINDING — per-IP limits are bypassable: ${parts.join("; ")}`
    : advisory ? `FINDING — per-IP limits are advisory: ${parts.join("; ")}`
    : `CLEAN — an outside caller is counted under the real address whether or not the header is sent or forged: ${parts.join("; ")}`;
  observed = { A: { ...A, snapshot: undefined }, B: { ...B, snapshot: undefined } };
}
console.log(`\n${verdict}`);

const judged = controlSeen;
// The calls, status and moved rows, so a reader can judge them by hand.
const LOG = `artifacts/gateway-header-probe/calls${BREAK ? "." + BREAK : ""}.json`;
mkdirSync(`${REPO}/artifacts/gateway-header-probe`, { recursive: true });
writeFileSync(`${REPO}/${LOG}`, JSON.stringify({ verdict, control_seen: controlSeen, ...observed }, null, 1));
const { path } = writeReceipt({
  check_id: "gateway-header-probe",
  started_at: started,
  status: failures.length ? "fail" : "pass",
  expected_targets: 2,
  discovered_targets: judged ? 2 : 0,
  attempted_targets: judged ? 2 : 0,
  completed_targets: judged ? calls.filter((c) => c.status === 200).length : 0,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 4,   // 5 run when both calls name a real-address row; 4 is the least a judged run executes
  failures,
  warnings: [
    "Two calls from one machine, one function, one evening. It says what the gateway did for this caller now, not for every path or every header (cf-connecting-ip was not forged).",
    "The deployed `available-slots` may still run the pre-fix `ipOf`; DIFFERS in deployed-inventory. A header-less call is only 'not counted' on the OLD code; on the fixed code it would land in available-slots:no-address.",
  ],
  artifacts: [LOG],
  canary: { id: "reader-sees-its-own-control-row", observed_failure: controlSeen },
  dimensions: { function: FUNCTION, forged: FORGED, break: BREAK, item: "14.18" },
  observed: { verdict, control_seen: controlSeen, ...observed },
});
console.log(`receipt: ${path}\n${failures.length ? "FAIL" : "PASS"} — ${assertions} assertions, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
