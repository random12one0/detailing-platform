// THE 504 RETRY, CHECKED BY RUNNING IT — 2026-09-13
//
// `retryRead` exists because ~1.1% of this project's PostgREST calls come back
// 504 in bursts, which killed 5 of 5 reminder sweeps. FOUND.md § THE "GATEWAY
// TIMEOUT" IS OUR OWN CATCH BLOCK is the measurement.
//
// **THIS IMPORTS THE REAL FUNCTION AND CALLS IT.** Node 24 strips types, and
// `_shared/retryRead.ts` deliberately has no imports, so the check exercises
// behaviour instead of grepping source — CLAUDE.md trap (k), which produced
// three false failures in one day against code that was correct.
//
// **BASELINED BY BREAKING WHAT IT GUARDS**, per FOUND.md's rule, by hand and
// on a committed tree so the revert is `git checkout --`. Four breaks, four
// red runs, recorded in this file's commit message: dropping the retry to one
// attempt, wrapping `claim_job_alerts`, unwrapping one of the sweep's reads,
// and putting an import into `retryRead.ts`. A guard that cannot be made to
// fail is not a guard.

import { readFileSync } from "node:fs";
import { retryRead } from "../supabase/functions/_shared/retryRead.ts";

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; } else { fail++; console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
};

// A fake PostgREST caller: answers with the given queue of results, in order,
// and records how many times it was asked.
const caller = (queue) => {
  const calls = [];
  return {
    calls,
    run: () => { calls.push(1); return Promise.resolve(queue[Math.min(calls.length - 1, queue.length - 1)]); },
  };
};
const gw = (status) => ({ error: { message: "Gateway Timeout" }, status });
const good = { error: null, status: 200, data: [1, 2] };
const pgErr = { error: { message: "column does not exist", code: "42703" }, status: 400 };

// --- 1 · a 504 then a success: retried, and the SUCCESS is what comes back ---
{
  const c = caller([gw(504), good]);
  const r = await retryRead("t1", c.run);
  ok("1a · a 504 is retried", c.calls.length === 2, `called ${c.calls.length}x`);
  ok("1b · the successful result is returned", r.error === null && r.status === 200);
}

// --- 2 · 502 and 503 count too; they are the same class of non-answer -------
for (const s of [502, 503]) {
  const c = caller([gw(s), good]);
  await retryRead("t2", c.run);
  ok(`2 · ${s} is retried`, c.calls.length === 2, `called ${c.calls.length}x`);
}

// --- 3 · A REAL POSTGRES COMPLAINT IS NOT RETRIED ---------------------------
// This is the half that protects the product from the fix. A 400 is a correct,
// final answer; retrying it takes three times as long to say the same thing.
{
  const c = caller([pgErr]);
  const r = await retryRead("t3", c.run);
  ok("3a · a 400 is answered on the first try", c.calls.length === 1, `called ${c.calls.length}x`);
  ok("3b · the error is handed back untouched", r.error?.code === "42703");
}

// --- 4 · a clean read is not retried ----------------------------------------
{
  const c = caller([good]);
  await retryRead("t4", c.run);
  ok("4 · a 200 is called exactly once", c.calls.length === 1, `called ${c.calls.length}x`);
}

// --- 5 · IT GIVES UP, AND GIVES BACK THE FAILURE ----------------------------
// It must not throw and must not return a fake success: the caller's own
// `if (r.error) throw r.error` is what turns this into a reported failure.
// A retry that swallowed the error would be the eighth costume in FOUND.md.
{
  const c = caller([gw(504)]);
  const r = await retryRead("t5", c.run);
  ok("5a · it stops after 3 attempts", c.calls.length === 3, `called ${c.calls.length}x`);
  ok("5b · the failure is returned, not swallowed", !!r.error && r.status === 504);
}

// --- 6 · a missing status is NOT treated as transient -----------------------
// Stated in the file's own header: if PostgREST ever stops populating `status`
// this goes inert rather than wrong. That is a promise, so it is checked.
{
  const c = caller([{ error: { message: "something" } }]);
  await retryRead("t6", c.run);
  ok("6 · no status means one attempt, not three", c.calls.length === 1, `called ${c.calls.length}x`);
}

// --- 7 · THE WRITE THAT MUST NOT BE WRAPPED ---------------------------------
// `claim_job_alerts` UPDATEs `job_heartbeats`. A 504 does not mean the
// statement did not run, so retrying it can claim twice. This is the one place
// a source read is the only instrument available, and it says so.
{
  const wj = readFileSync("supabase/functions/watch-jobs/index.ts", "utf8");
  const claim = wj.split("\n").find((l) => l.includes("claim_job_alerts") && !l.trim().startsWith("//"));
  ok("7a · watch-jobs still calls claim_job_alerts", !!claim);
  ok("7b · and it is NOT wrapped in retryRead (it writes)", !!claim && !claim.includes("retryRead"));
}

// --- 8 · the sweep's seven-call burst is wrapped ----------------------------
// Counted, not matched: seven due-ness reads plus the businesses read. Two of
// one day's rewritten checks passed with one of two subjects broken.
{
  const sw = readFileSync("supabase/functions/send-owner-reminders/index.ts", "utf8");
  const n = (sw.match(/retryRead\(/g) || []).length;
  ok("8 · all 8 reads in the sweep are wrapped", n === 8, `found ${n}`);
}

// --- 9 · retryRead.ts stays loadable outside Deno ---------------------------
// The moment it gains an import or a `Deno.` reference, this whole file stops
// being able to run the real code and silently becomes a source grep.
{
  const src = readFileSync("supabase/functions/_shared/retryRead.ts", "utf8");
  const code = src.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  ok("9a · no imports", !/\bimport\s|\brequire\(/.test(code));
  ok("9b · no Deno global", !/\bDeno\./.test(code));
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
