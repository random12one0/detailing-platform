// ROADMAP 14.9 — DOES EVERY PUBLIC BOOKING-WIDGET ENDPOINT CARRY A RATE
// LIMIT, MEASURED BY READING THE SOURCE RATHER THAN TRUSTED FROM A LIST.
//
//   node scripts/rate-limit-coverage.mjs
//   node scripts/receipt.mjs receipts/rate-limit-coverage.json
//
// Credential-free, reads only. It never calls a deployed function — Andrew's
// standing rule, no deploy — so it cannot observe a live 429. What it CAN
// observe, honestly, is whether the source calls `withinLimits` with a real
// `LIMITS.*` config and a per-caller key before doing any work, which is
// exactly the mechanism the six (now eleven) working examples already use.
//
// ---------------------------------------------------------------------------
// WHY "COUNT IT AGAIN YOURSELF" MATTERED HERE
// ---------------------------------------------------------------------------
// ROADMAP 14.9's own text says "nine public endpoints have no rate limit" and
// names them, including `booking-ics`. Measured today rather than trusted:
// `booking-ics` already calls `withinLimits` (ROADMAP 14.2, a separate item,
// landed after 14.9 was written) — so the roadmap's own list was stale by one
// entry before this session touched anything. `grep -rl withinLimits
// supabase/functions/*/index.ts` is the actual ground truth, every run.
//
// PUBLIC_FUNCTIONS below is DECLARED, not derived from that grep — the same
// rule `keyboard-walk.mjs` and `sweep-tap-targets.mjs`'s admin section use:
// a list read off what happened this run can't say a function went missing,
// only a declared one can. It was built by checking every one of the 39
// directories under `supabase/functions/` for the absence of `requireMember`
// / `requireOwner` / `auth.getUser` / a real `Authorization` check, then
// reading each candidate's own header comment to resolve the false positives
// that check produces on its own (a dual-purpose function like
// `create-booking` mentions `Authorization` for its ADMIN half; a webhook
// like `resend-webhook` authenticates by signature, not a header check this
// grep recognises; `session-ping`, `refresh-weather` and `watch-jobs` are
// internal/cron endpoints with no booking-widget audience at all).
//
// ONE MORE PUBLIC, UNGUESSABLE-TOKEN ENDPOINT WAS FOUND THE SAME WAY AND IS
// DELIBERATELY NOT IN THIS LIST: `accept-invite` (team-invite acceptance,
// token is `encode(gen_random_bytes(24), 'hex')`, 192 bits, not guessable).
// It has no rate limit either. It is not part of the booking widget's public
// surface, which is this item's scope, so it is named here and in the
// receipt rather than silently fixed or silently dropped.
// ---------------------------------------------------------------------------
// A FIELD WAS REMOVED FROM THE RECEIPT ON PURPOSE — 2026-09-23
// ---------------------------------------------------------------------------
// **`dimensions.today_fixed` is gone. It was deleted, not broken.** Saying so
// here because **a field that vanishes is indistinguishable from a field that
// broke**, and the person who notices is usually diffing two receipts months
// apart with no way to tell which happened.
//
// It held 14.9's four function names under a key called `today`. **A field
// called "today" is a lie on every day but one** — by the time 14.12 landed
// the next evening it was naming the wrong day AND the wrong functions, in a
// receipt that passed. Correcting the contents would have bought one more
// correct day and then gone stale again the same way.
//
// **Replaced by `dimensions.fixed_by_item`**, keyed on the roadmap item that
// did the work — `14.9`, `14.12`, `14.13` — which is the question a reader
// actually has and which cannot rot, because an item number does not move.
// **What landed when is git's job, and git already answers it.**
//
// ---------------------------------------------------------------------------
// AND THE LIMIT OF THIS WHOLE CHECK, STATED WHERE IT CANNOT BE MISSED
// ---------------------------------------------------------------------------
// **This file can tell you every public endpoint calls `withinLimits`. It
// cannot tell you any of them has ever refused anybody.** It reads source and
// never calls a deployed function — see the first entry in `warnings`, which
// says the same thing to anyone reading the receipt instead of the script.
//
// **ROADMAP 14.9 is open on exactly that** and on nothing else: the code is
// complete, the live `429` has never been observed, and it cannot be until
// Andrew publishes, because the deployed bundles are still the old guardless
// code. A loop run today would measure their absence and prove nothing about
// the guards now in source. **14.12 and 14.13 are ticked; the thread is
// proved in source and unproved in the world.**
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FUNCS = path.join(ROOT, "supabase", "functions");
const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

// **DECLARED, CHECKED AGAINST TODAY'S SOURCE — 2026-09-23.** `already` is
// what this session found already protected before touching anything;
// `today` is the four this item was asked to fix.
const PUBLIC_FUNCTIONS = {
  already: ["create-booking", "pay-booking", "plan-link", "unsubscribe", "address-suggest", "stripe-webhook", "booking-ics"],
  today: ["available-slots", "calculate-booking", "validate-promo-code", "get-booking-receipt"],
  // **ROADMAP 14.12, CLOSED 2026-09-23.** These four were `knownOpen` until
  // tonight — named in this file's own `warnings` while the receipt PASSED,
  // which is the shape Andrew objected to: *a warning inside a passing
  // receipt is a thing nobody opens.*
  //
  // Three are writes — cancel, reschedule and accept-quote each change a real
  // booking — so the risk was a write a script can spam, not a read it can
  // scrape. All three took the same `LIMITS.publicCeiling` per-IP ceiling the
  // rest already carry, on purpose: 14.9 settled that the blunt ceiling is the
  // right tool, and a tighter per-purpose limit is a separate question.
  //
  // **`track-visit` WAS THE ONE THAT NEEDED MEASURING RATHER THAN BUILDING,
  // AND ITS HEADER WAS WRONG.** That header claimed "Service-role only;
  // campaigns / campaign_visits stay closed to anon". Measured two ways on
  // 2026-09-23 and both say otherwise:
  //   · the DEPLOYED config reads `verify_jwt=false` (Management API, `.env`
  //     token, project `kguqylyzgyzfktkfnhjb`). **There is no
  //     `supabase/config.toml` in this repo, so the deployed value is the
  //     only value there is.**
  //   · `deploy-functions.mjs` lists `track-visit` in `PUBLIC_FUNCTIONS` and
  //     sets `verify_jwt: !PUBLIC_FUNCTIONS.has(fn)` — the repo's own tooling
  //     is what produces that `false`.
  // So it is reachable by a stranger, every call writes a visit row, and it
  // took the same ceiling as the other three. The false header is corrected
  // in the function itself.
  tonight: ["cancel-booking", "reschedule-booking", "accept-quote", "track-visit"],
  // **ROADMAP 14.13, 2026-09-23.** Named in this file's own header as
  // deliberately out of scope, then fixed — so it becomes a declared
  // target rather than staying a warning nobody opens. It is NOT part of
  // the booking widget; it is the invite landing page, public because an
  // invitee has no session yet.
  inviteLanding: ["accept-invite"],
  // **EMPTY, AND THAT IS A RESULT RATHER THAN A DEFAULT.** Anything genuinely
  // still unprotected goes here and gets named in `warnings`. It is empty
  // because nothing is left on this thread, not because nobody looked.
  knownOpen: [],
};
const ALL = [...PUBLIC_FUNCTIONS.already, ...PUBLIC_FUNCTIONS.today, ...PUBLIC_FUNCTIONS.tonight,
  ...PUBLIC_FUNCTIONS.inviteLanding, ...PUBLIC_FUNCTIONS.knownOpen];
// DECLARED, NOT COUNTED — the same reason every other receipted check here
// writes the number down instead of trusting `ALL.length` to stay right.
const EXPECTED_COUNT = 16;

const HAS_CALL = /await\s+withinLimits\s*\(\s*[a-zA-Z_]+\s*,\s*\[\s*\{[^}]*\.\.\.\s*LIMITS\.\w+/s;

/** Read one function's source. `override` lets the canary feed a mutated copy without touching disk. */
function readSource(name, override) {
  if (override !== undefined) return override;
  return readFileSync(path.join(FUNCS, name, "index.ts"), "utf8");
}

function isProtected(name, override) {
  const src = readSource(name, override);
  return HAS_CALL.test(src);
}

if (ALL.length !== EXPECTED_COUNT) {
  console.error(`THE DECLARED LIST HAS ${ALL.length} NAMES, NOT ${EXPECTED_COUNT} — the constant `
    + `and the number it is checked against have drifted apart. Fix the file before trusting it.`);
  process.exit(2);
}

console.log(`${EXPECTED_COUNT} public booking-widget endpoints declared\n`);

const rows = [];
let discovered = 0;
for (const name of ALL) {
  let src;
  try {
    src = readFileSync(path.join(FUNCS, name, "index.ts"), "utf8");
  } catch (e) {
    rows.push({ name, found: false, protected: false, error: String(e.message || e) });
    continue;
  }
  discovered++;
  const protectedNow = HAS_CALL.test(src);
  rows.push({ name, found: true, protected: protectedNow });
  console.log(`${name.padEnd(24)} ${protectedNow ? "PROTECTED (withinLimits found)" : "NOT PROTECTED"}`);
}

// --- the canary, run five times, not once ----------------------------------
// A mutated COPY of a real, currently-protected file's text, with the
// `withinLimits` call stripped out exactly as `--break=strip` simulates. The
// detector must call this NOT PROTECTED every time, proving `HAS_CALL` is
// actually testing something and not a regex that matches everything.
console.log("\ncanary — a real protected function with its rate-limit call stripped, in memory only:");
const CANARY_RUNS = 5;
let canaryCaught = 0;
// `stripe-webhook`, ON PURPOSE, NOT ONE OF TODAY'S FOUR. The canary has to
// stay meaningful even if a future regression breaks one of this item's own
// deliverables — a canary built from the same function it is also grading
// would go quiet exactly when it is needed, which very nearly happened
// while proving this: a manual test that broke `get-booking-receipt` on
// purpose also broke the canary's own premise, because it was reading that
// same file. `stripe-webhook` predates this item by weeks and belongs to
// nobody's today.
const canarySource = readSource("stripe-webhook");
const stripped = canarySource.replace(HAS_CALL, "/* withinLimits call removed for the canary */ true");
if (stripped === canarySource) {
  console.log("  CANARY COULD NOT BE BUILT — the strip regex did not match the real source. Void.");
} else {
  for (let i = 1; i <= CANARY_RUNS; i++) {
    const caught = !isProtected("stripe-webhook (stripped copy)", stripped);
    if (caught) canaryCaught++;
    console.log(`  run ${i}/${CANARY_RUNS}: ${caught ? "CAUGHT" : "MISSED"}`);
  }
}
const canaryOk = canaryCaught === CANARY_RUNS;
console.log(`canary: caught ${canaryCaught}/${CANARY_RUNS}`);

// --- --break=blind: the detector that would rubber-stamp everything --------
// Proves the canary itself can fail — the negative control's negative
// control, `sweep-tap-targets.mjs`'s own `--baseline` pattern one level up.
const effectivelyProtected = (name, protectedNow) =>
  BREAK === "blind" ? true : protectedNow;

const failures = [];
if (discovered === 0) {
  failures.push("ZERO FUNCTION FILES WERE READ. Nothing was measured — this is not a pass.");
}
for (const row of rows) {
  if (!row.found) { failures.push(`${row.name}: could not read supabase/functions/${row.name}/index.ts — ${row.error}`); continue; }
  const wantProtected = !PUBLIC_FUNCTIONS.knownOpen.includes(row.name);
  const got = effectivelyProtected(row.name, row.protected);
  if (wantProtected && !got) {
    failures.push(`${row.name}: expected PROTECTED (this item's own deliverable), source shows no withinLimits call`);
  }
}
if (!canaryOk) failures.push(`the strip canary was only caught ${canaryCaught}/${CANARY_RUNS} times`);

const knownOpenReport = PUBLIC_FUNCTIONS.knownOpen.map((n) => {
  const r = rows.find((x) => x.name === n);
  return `${n}: ${r && r.protected ? "now protected (update PUBLIC_FUNCTIONS.knownOpen)" : "still open, out of this item's scope"}`;
});

const status = failures.length === 0 && canaryOk ? "pass" : "fail";
const { path: receiptPath } = writeReceipt({
  check_id: "rate-limit-coverage",
  started_at,
  status,
  expected_targets: EXPECTED_COUNT,
  discovered_targets: discovered,
  attempted_targets: EXPECTED_COUNT,
  completed_targets: discovered,
  skipped_targets: EXPECTED_COUNT - discovered,
  assertions_executed: rows.length + CANARY_RUNS,
  // A LITERAL, NOT `EXPECTED_COUNT + CANARY_RUNS` — ANDREW'S OWN CORRECTION,
  // 2026-09-23. `assertions_executed` is always exactly that sum, because
  // `ALL.length` is guarded to equal `EXPECTED_COUNT` before anything runs.
  // A floor computed from the same constant it is meant to police moves
  // with it: shrink `PUBLIC_FUNCTIONS` and `EXPECTED_COUNT` together and
  // the floor shrinks too, silently, and would still read "PASS" the day
  // half the endpoints are dropped from the list. `migration-drift.mjs`'s
  // own `min_assertions: 1000` is the precedent — a number set "just under"
  // the real count and left alone, so raising it later is a visible diff
  // somebody has to justify, and so is lowering it.
  min_assertions: 19,
  failures,
  artifacts: ["scripts/rate-limit-coverage.mjs"],
  warnings: [
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    "READS SOURCE ONLY — never calls a deployed function, so it cannot observe a live 429; "
    + "it can only confirm the source calls withinLimits with a real LIMITS config, the same "
    + "mechanism the working examples use. Applying nothing, deploying nothing.",
    // **A SENTENCE, NOT A TRAILING COLON.** This read "KNOWN OPEN, not this
    // item's scope: ." when the list emptied — a dangling colon and a full
    // stop with nothing behind them. An empty list has to say so in words,
    // or a reader cannot tell "none" from "the string got truncated".
    PUBLIC_FUNCTIONS.knownOpen.length === 0
      ? `NONE of the ${EXPECTED_COUNT} declared public endpoints is known-open. Every one `
        + `reads as protected in source. This is a result, not an empty default: anything `
        + `genuinely unprotected would be listed here by name.`
      : `${PUBLIC_FUNCTIONS.knownOpen.length} of ${EXPECTED_COUNT} declared public endpoints are `
        + `KNOWN OPEN, not this item's scope: ${knownOpenReport.join("; ")}.`,
    // **THIS WARNING USED TO SAY accept-invite "is not in PUBLIC_FUNCTIONS
    // above". THAT WAS FALSE.** It IS in `PUBLIC_FUNCTIONS` — the set in
    // `deploy-functions.mjs`, commented "invite landing page — the invitee
    // has no session yet". What was meant was this file's own declared
    // target list, a DIFFERENT list with a confusingly similar name. A
    // false statement about a security-relevant set, inside a passing
    // receipt, is the exact shape this item exists to remove.
    // **Moot as of 14.13: it is now a declared target here and protected.**
    "accept-invite (team-invite acceptance) is public — it is in deploy-functions.mjs's "
    + "PUBLIC_FUNCTIONS set, so it deploys with verify_jwt=false, because an invitee has no "
    + "session yet. ROADMAP 14.13, 2026-09-23: it now carries the same LIMITS.publicCeiling "
    + "guard and is a declared target of this check. Its token is 192 bits of randomness "
    + "(encode(gen_random_bytes(24),'hex')), so it was never guessable — THIS WAS A COST "
    + "ITEM, NOT A SECURITY HOLE, and should not be read as one later.",
  ],
  dimensions: {
    functions: rows,
    known_open: PUBLIC_FUNCTIONS.knownOpen,
    // **THIS SAID `today` AND WAS A DAY OUT OF DATE THE MOMENT 14.12 LANDED.**
    // `today` is 14.9's four, fixed 2026-09-22. Tonight's four were absent, so
    // the receipt named the wrong day AND the wrong functions while passing.
    // Split by item, which is what a reader actually wants, and neither
    // field is called `today` any more — a date-shaped word in a constant
    // is wrong on every day but one.
    fixed_by_item: { "14.9": PUBLIC_FUNCTIONS.today, "14.12": PUBLIC_FUNCTIONS.tonight,
      "14.13": PUBLIC_FUNCTIONS.inviteLanding },
    already_protected: PUBLIC_FUNCTIONS.already,
    limit_used: "LIMITS.publicCeiling (per-caller IP, 600/hour) — the same blunt ceiling every "
      + "other read-only public endpoint uses; per-address, not per-business or global, checked "
      + "against _shared/rateLimit.ts before reuse because a per-business limit would never fire "
      + "for a caller with no business context yet.",
  },
  canary: {
    id: "a real protected function's withinLimits call stripped in memory must be reported NOT PROTECTED",
    observed_failure: canaryOk,
    findings: [`caught ${canaryCaught}/${CANARY_RUNS}`],
  },
});

console.log(`\n${status.toUpperCase()} — ${discovered}/${EXPECTED_COUNT} functions read, `
  + `${failures.length} failure(s), canary ${canaryOk ? "caught as required" : "DID NOT CATCH RELIABLY"}.`);
for (const f of failures) console.log("  · " + f);
console.log(`Receipt ${receiptPath}`);
process.exit(status === "pass" ? 0 : 1);
