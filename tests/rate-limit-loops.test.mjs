// ROADMAP 14.9 AND 14.18 — A LOOP AGAINST EACH WRITE IS REFUSED, AND A CALLER
// WITH NO ADDRESS IS COUNTED. Both proved by RUNNING the loop, not by reading.
//
//   node tests/rate-limit-loops.test.mjs
//
// WHAT IT RUNS: this checkout's real `cancel-booking`, `reschedule-booking`
// and `accept-quote` (`scripts/lib/edgeLocal.mjs` — Node, no deploy) against
// the real database, through the real `withinLimits` and the real `rate_take`.
// The deployed copies are older than the source and are not touched; this says
// what the source does, and says nothing about what is live until it is
// published (`scripts/deployed-inventory.mjs` names the gap).
//
// WHAT IT WRITES TO `rate_hits`, and ONLY this — docs/shared-resources.md § 5:
//   · (cancel-booking | reschedule-booking | accept-quote, 198.51.100.14) —
//     a documentation address (RFC 5737) no real caller has, one row each;
//   · (cancel-booking:no-address, all) — the shared bucket for callers with no
//     address, which nothing legitimate uses on `cancel-booking`.
// Rows are counted before and after and deleted by exact (bucket, key). Never a
// wildcard, never another caller's row, never the demo tenant. Every request
// names a booking id that does not exist, so the answer to an allowed call is
// 404 and nothing is written to `bookings` or sent to anyone.
//
// A LEFTOVER ROW IS AN ABORT, NOT A CLEAN-UP, for the no-address bucket: the
// exact-boundary check below needs a bucket nobody else has touched this hour,
// and a row there that is not this test's is somebody's traffic.
//
// BREAK IT ON PURPOSE (done 2026-10-06, recorded in ROADMAP 14.9/14.18): delete
// a guard from a handler, or put `ipOf` back to returning a blank — the loop
// that guard owns must go red. A sabotage inside this file could not reach the
// production code it is aimed at (docs/gotchas.md 95), so those are real edits
// on disk, reverted and diffed.

import "./_env.mjs";
import { randomUUID } from "node:crypto";
import { ipOf, withinLimits, NO_ADDRESS, LIMITS } from "../supabase/functions/_shared/rateLimit.ts";

let passed = 0, failed = 0;
const check = (name, ok, detail = "") => {
  if (ok) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};
const req = (h = {}) => new Request("http://x.test/", { headers: h });

// ─── 1. The key a caller gets — credential-free ───────────────────────────
console.log("1. the key a caller gets");
{
  check("no header at all is NO_ADDRESS, never blank", ipOf(req()) === NO_ADDRESS, JSON.stringify(ipOf(req())));
  check("a whitespace-only header is the same", ipOf(req({ "x-forwarded-for": "  " })) === NO_ADDRESS);
  check("the left-most forwarded entry is the caller", ipOf(req({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })) === "203.0.113.9");
  check("cf-connecting-ip is still the fallback", ipOf(req({ "cf-connecting-ip": "203.0.113.7" })) === "203.0.113.7");
  check("NO_ADDRESS cannot be an IP", !/^[0-9a-f.:]+$/i.test(NO_ADDRESS));

  const sent = [];
  const db = { rpc: async (_n, a) => { sent.push(a); return { data: true, error: null }; } };
  await withinLimits(db, [{ ...LIMITS.bookingPerIp, bucket: "b", key: NO_ADDRESS }]);
  check("a no-address limit is counted, in a bucket of its own, on one shared key",
    sent.length === 1 && sent[0].p_bucket === "b:no-address" && sent[0].p_key === "all", JSON.stringify(sent));
  check("and with the generous ceiling, not the per-IP number",
    sent[0]?.p_limit === LIMITS.noAddress.limit && sent[0]?.p_window_seconds === LIMITS.noAddress.windowSeconds, JSON.stringify(sent[0]));
  check("that ceiling is a ceiling above one person's, not a lock", LIMITS.noAddress.limit > LIMITS.publicCeiling.limit);

  sent.length = 0;
  await withinLimits(db, [{ ...LIMITS.bookingPerPhone, bucket: "p", key: "" }, { ...LIMITS.bookingPerPhone, bucket: "p", key: null }]);
  check("a blank key that is NOT an address is still skipped (nothing to count)", sent.length === 0, JSON.stringify(sent));

  sent.length = 0;
  await withinLimits(db, [{ ...LIMITS.publicCeiling, bucket: "c", key: "198.51.100.14" }]);
  check("a real address is untouched", sent.length === 1 && sent[0].p_bucket === "c" && sent[0].p_key === "198.51.100.14" && sent[0].p_limit === 600);
}

// ─── 2. The loops — needs the database ────────────────────────────────────
const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
if (!URL_ || !SERVICE || !ANON) {
  console.log("\nNOT RUN (section 2) — needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (.env).");
  process.exit(1);
}
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) {
  console.log("\nNOT RUN (section 2) — this writes rate_hits rows and only ever writes to kguqylyzgyzfktkfnhjb.");
  process.exit(1);
}
// A fixed window that rolls mid-loop splits the count in two and the exact
// boundary below stops meaning anything.
if (3600 - (Math.floor(Date.now() / 1000) % 3600) < 300) {
  console.log("\nNOT RUN (section 2) — under five minutes to the top of the hour, when every window rolls. Run again after.");
  process.exit(1);
}

const { startEdge } = await import("../scripts/lib/edgeLocal.mjs");
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const rowsOf = async (bucket, key) => {
  const r = await fetch(`${URL_}/rest/v1/rate_hits?bucket=eq.${encodeURIComponent(bucket)}&key=eq.${encodeURIComponent(key)}&select=hits,window_start`, { headers: H });
  if (!r.ok) throw new Error(`rate_hits read ${r.status}`);
  return r.json();
};
const totalRows = async () => {
  const r = await fetch(`${URL_}/rest/v1/rate_hits?select=bucket`, { headers: { ...H, Prefer: "count=exact", Range: "0-0" } });
  return Number((r.headers.get("content-range") || "*/NaN").split("/")[1]);
};
const dropExact = async (bucket, key) => {
  const r = await fetch(`${URL_}/rest/v1/rate_hits?bucket=eq.${encodeURIComponent(bucket)}&key=eq.${encodeURIComponent(key)}`, { method: "DELETE", headers: H });
  if (!r.ok) throw new Error(`rate_hits delete ${r.status}`);
};

const FIX_IP = "198.51.100.14";
const WRITES = ["cancel-booking", "reschedule-booking", "accept-quote"];
const NOADDR_BUCKET = "cancel-booking:no-address";

// Our own documentation-address rows are ours to clear. The shared bucket's are not.
for (const b of WRITES) await dropExact(b, FIX_IP);
const stale = await rowsOf(NOADDR_BUCKET, "all");
if (stale.length) {
  console.log(`\nNOT RUN (section 2) — (${NOADDR_BUCKET}, all) already holds ${JSON.stringify(stale)}. Not this test's to delete.`);
  process.exit(1);
}

const edge = await startEdge(WRITES);
const tally = async (name, n, headers) => {
  const out = { statuses: {}, sample429: null };
  let next = 0;
  await Promise.all(Array.from({ length: 30 }, async () => {
    while (next < n) {
      next++;
      const r = await fetch(`${edge.url}/functions/v1/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}`, ...headers },
        body: JSON.stringify({ booking_id: randomUUID(), booking_date: "2099-01-01", start_time: "10:00" }),
      });
      const text = await r.text();
      out.statuses[r.status] = (out.statuses[r.status] || 0) + 1;
      if (r.status === 429 && !out.sample429) out.sample429 = text;
    }
  }));
  return out;
};

const before = await totalRows();
console.log(`\n   rate_hits rows before: ${before}`);

console.log("\n2. ROADMAP 14.9 — a loop against each write, one fixture address");
const OVER = 10;
const N = LIMITS.publicCeiling.limit + OVER;
for (const name of WRITES) {
  const pre = await rowsOf(name, FIX_IP);
  const t = await tally(name, N, { "x-forwarded-for": FIX_IP });
  const post = await rowsOf(name, FIX_IP);
  console.log(`   ${name}: ${N} calls → ${JSON.stringify(t.statuses)}; rows ${pre.length} → ${post.length}, hits ${post[0]?.hits}`);
  check(`${name}: the first ${LIMITS.publicCeiling.limit} calls are answered by the handler (404, nobody's booking)`,
    t.statuses[404] === LIMITS.publicCeiling.limit, JSON.stringify(t.statuses));
  check(`${name}: the next ${OVER} are refused with 429`, t.statuses[429] === OVER, JSON.stringify(t.statuses));
  check(`${name}: and the refusal says why`, /too_many_requests/.test(t.sample429 || ""), String(t.sample429));
  check(`${name}: nothing else came back`, Object.keys(t.statuses).every((s) => s === "404" || s === "429"), JSON.stringify(t.statuses));
  check(`${name}: one row, ${N} hits (the refused ones count)`, pre.length === 0 && post.length === 1 && post[0].hits === N, JSON.stringify({ pre, post }));
  await dropExact(name, FIX_IP);
  check(`${name}: cleaned up — rows for the fixture address back to 0`, (await rowsOf(name, FIX_IP)).length === 0);
}

console.log("\n3. ROADMAP 14.18 — a caller with no address, no header of either kind");
{
  const NA = LIMITS.noAddress.limit + OVER;
  const t = await tally("cancel-booking", NA, {});
  const post = await rowsOf(NOADDR_BUCKET, "all");
  const strayInIpBucket = await rowsOf("cancel-booking", NO_ADDRESS);
  const strayBlank = await rowsOf("cancel-booking", "");
  console.log(`   cancel-booking, no header: ${NA} calls → ${JSON.stringify(t.statuses)}; shared bucket hits ${post[0]?.hits}`);
  check(`a header-less caller is COUNTED: one row in the shared bucket, ${NA} hits`, post.length === 1 && post[0].hits === NA, JSON.stringify(post));
  check(`the first ${LIMITS.noAddress.limit} are answered, not locked out (a real customer behind a proxy that drops the header)`,
    t.statuses[404] === LIMITS.noAddress.limit, JSON.stringify(t.statuses));
  check(`and it is a ceiling: the next ${OVER} are refused`, t.statuses[429] === OVER, JSON.stringify(t.statuses));
  check("it did not spend the per-address bucket under the placeholder, or a blank key", strayInIpBucket.length === 0 && strayBlank.length === 0,
    JSON.stringify({ strayInIpBucket, strayBlank }));
  await dropExact(NOADDR_BUCKET, "all");
  check("cleaned up — the shared bucket is back to 0 rows", (await rowsOf(NOADDR_BUCKET, "all")).length === 0);
}

await edge.close();
const after = await totalRows();
console.log(`\n   rate_hits rows after: ${after} (before ${before}; other sessions and the 5-minute probe write here too, so the claim is the fixture rows above, not this total)`);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
