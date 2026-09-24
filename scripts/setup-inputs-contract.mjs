// DOES EVERY CALLER OF `setupProgress()` FEED IT ENOUGH TO ANSWER? — ROADMAP 9.1.
//
//   node scripts/setup-inputs-contract.mjs                  # the check
//   node scripts/setup-inputs-contract.mjs --break=step     # sabotage: a step nothing feeds
//   node scripts/setup-inputs-contract.mjs --break=canary   # sabotage: drop the canary
//   node scripts/receipt.mjs receipts/setup-inputs-contract.json
//
// **Credential-free, no browser, no dev server, nothing written.** It imports
// the real `setup.js` and reads one source file.
//
// ---------------------------------------------------------------------------
// THE FAULT THIS EXISTS FOR, AND IT IS NOT TWO IMPLEMENTATIONS
// ---------------------------------------------------------------------------
// 9.1 says setup progress disagrees between the dashboard and the back office.
// **Both sides genuinely call the same `setupProgress()`** — CLAUDE.md's claim
// is true and there is no second implementation to delete. The disagreement is
// entirely in **what each side FEEDS it**, and the function cannot tell the
// difference between *"this business has not done that step"* and *"nobody
// gave me anything to look at"*. It returns the same confident number either
// way.
//
// **MEASURED 2026-09-23, the same business, live:** Coastline Auto Detailing
// reads **9 of 12** on the dashboard and **4 of 12** in the back office — the
// second computed from the `setup_inputs` the DEPLOYED `platform-admin`
// actually returned that minute, not from a reading of its source. (The
// deployed bundle matched the checkout on the day, per
// `receipts/deployed-inventory.json`, so source and server agree here.)
//
// **SIX OF THE TWELVE STEPS HAD NO INPUTS AT ALL** in that payload —
// `vehicle_types`, `hours`, `reviews`, `faq`, `payments`, `plans` — so the
// back office can only ever see `catalog`, `promos`, `colour`, `info`, plus
// whatever a business ticked by hand. **And two of the fields it DOES send go
// nowhere:** `counts.addOns`, which nothing in `setupProgress` read, and
// `counts.hoursOpen`, which is the wrong NAME and the wrong TYPE for the
// `counts.hoursRows` array the function actually reads. So the back office
// sends a true fact about opening hours and still scores that step zero.
//
// **THE REPO ALREADY NAMED THIS SHAPE, ONE CAUSE OVER.** `Business.jsx:295`,
// about a staff role that cannot read promo codes: *"Nothing in `setup.js` is
// wrong; it is being asked the question through a narrower window."* That was
// a PERMISSION narrowing the window. This is a PAYLOAD narrowing it. Same
// sentence, and neither of them can make the function complain.
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS
// ---------------------------------------------------------------------------
// **1 · EVERY STEP IS FED BY SOMETHING, AND THE CHECK FINDS OUT BY REMOVING
// IT.** For each of the twelve steps, the complete fixture is rebuilt with
// that step's input BLANKED and the count must drop by exactly one, and the
// step that goes missing must be the expected one. **This is behavioural
// rather than a grep**: it never reads `setup.js`'s text, so renaming a field
// cannot blind it the way `label-guard.mjs` exists to catch. It also declares
// the twelve — a step added to `STEPS` with no row here fails the count.
//
// **2 · EVERY CALLER SUPPLIES THOSE INPUTS.** `platform-admin` builds its
// payload as a literal, so the literal's own keys are read out of the source
// and a fixture is assembled from **exactly those keys**. If that payload
// cannot reach 12 of 12 on a business that has done everything, the back
// office cannot either — which is 9.1, stated as an assertion.
//
// **3 · NOTHING IS SENT THAT NOTHING READS.** A key in the payload that no
// step depends on is either dead weight or a misspelling of a live one, and
// the second is how `hoursOpen` came to sit next to `hoursRows` for weeks
// looking correct.
//
// **FIXED IN THE REPO THE SAME NIGHT — this check went red, DP Cowork2 widened
// the payload, and it went green without anybody re-measuring by hand.** The
// payload now carries `counts{services,promos,reviews,plans,hoursRows}`,
// `settings{setup,vehicle_sizes,faqs,pay_*}` and both contact fields, and
// `addOns`/`hoursOpen` are gone. The paragraphs above are kept in the past
// tense because the SHAPE of the fault is what this file guards against, not
// that one instance of it.
//
// **AND IT IS STILL NOT TRUE FOR ANY REAL DETAILER.** This check reads THIS
// CHECKOUT. The back office a real account is scored by runs on Andrew's
// server and only changes when he publishes — ROADMAP 0.6. **A green here is
// not a fixed product**, and `deployed-inventory.mjs` had 13 functions running
// something other than this checkout on the day.
//
// ---------------------------------------------------------------------------
// WHY THIS IS A CHECK AND NOT A TEST IN `tests/`
// ---------------------------------------------------------------------------
// It was **red on purpose** while the fault was live. A red inside the test
// battery is noise for every other session and gets muted; a red receipt is a
// recorded finding that `receipt.mjs` grades. Nothing here writes
// `platform-admin/index.ts` — it only reads it.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { setupProgress, STEPS } from "../app/src/lib/setup.js";
import { VEHICLE_BODY_TYPES } from "../app/src/book/core.js";

const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const ART = fileURLToPath(new URL("../artifacts/setup-inputs-contract/", import.meta.url));
const ART_FILE = ART + "contract.txt";
const ADMIN_FN = fileURLToPath(
  new URL("../supabase/functions/platform-admin/index.ts", import.meta.url));

// A BUSINESS THAT HAS GENUINELY DONE EVERYTHING. Every field here exists
// because some step reads it; the rows below prove that one at a time.
const complete = () => ({
  business: { contact_phone: "562-555-0199", contact_email: "owner@example.com" },
  branding: { primary_color: "#38E08B" },
  settings: {
    setup: { done: ["where", "templates"] },
    vehicle_sizes: [{ key: "all", bodyTypes: VEHICLE_BODY_TYPES.map((t) => t.key) }],
    // **ALL SIX, NOT ONE.** `payments` is an OR across six columns, and the
    // dead-field test below can only judge a key the fixture actually fills:
    // with only `pay_cash` set, the other five looked dead the moment
    // `platform-admin` started sending them, and the check failed a correct
    // fix. A fixture for a business that has done everything has every
    // alternative on.
    pay_cash: true, pay_venmo: true, pay_cashapp: true,
    pay_zelle: true, pay_paypal: true, pay_other: true,
    faqs: [{ q: "Do you come to me?", a: "Yes." }],
  },
  counts: {
    services: 6, promos: 2, reviews: 4, plans: 1,
    hoursRows: [{ open_time: "09:00" }],
  },
});

// ONE ROW PER STEP, AND THE LIST IS THE DECLARATION. `blank` removes only
// that step's evidence; the count must fall by exactly one and the step that
// disappears must be this one.
const FEEDS = [
  ["catalog", (i) => { i.counts.services = 0; }],
  ["vehicle_types", (i) => { i.settings.vehicle_sizes = []; }],
  ["hours", (i) => { i.counts.hoursRows = []; }],
  ["where", (i) => { i.settings.setup.done = i.settings.setup.done.filter((k) => k !== "where"); }],
  ["info", (i) => { i.business.contact_phone = null; i.business.contact_email = null; }],
  ["colour", (i) => { i.branding.primary_color = null; }],
  ["reviews", (i) => { i.counts.reviews = 0; }],
  ["faq", (i) => { i.settings.faqs = []; }],
  // All six, because the step is an OR across all six: clearing one leaves the
  // step satisfied and the row would claim `payments` is not fed by anything.
  ["payments", (i) => {
    for (const k of ["pay_cash", "pay_venmo", "pay_cashapp", "pay_zelle", "pay_paypal", "pay_other"]) {
      i.settings[k] = false;
    }
  }],
  ["promos", (i) => { i.counts.promos = 0; }],
  ["plans", (i) => { i.counts.plans = 0; }],
  ["templates", (i) => { i.settings.setup.done = i.settings.setup.done.filter((k) => k !== "templates"); }],
];

let assertions = 0;
const failures = [];
const observed = [];

const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok      ${name}`); return true; }
  failures.push(`${name} ${detail}`.trim());
  console.error(`    FAIL    ${name}  ${detail}`);
  return false;
};

/**
 * The keys `platform-admin` puts in `setup_inputs`, read out of its source.
 *
 * **Reading a LITERAL's keys is not the grep this repo warns about.** The
 * warning is about a check coupled to a SPELLING of prose; these keys ARE the
 * data under test, and if the block cannot be found the check fails loudly
 * rather than quietly passing on an empty set.
 */
function adminPayloadKeys() {
  const src = readFileSync(ADMIN_FN, "utf8");
  const at = src.indexOf("setup_inputs:");
  if (at < 0) return null;
  // Walk braces from the first `{` after the label so a nested object cannot
  // end the block early.
  const start = src.indexOf("{", at);
  let depth = 0, end = -1;
  for (let i = start; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return null;
  const block = src.slice(start, end + 1);
  const out = {};
  for (const group of ["counts", "branding", "settings", "business"]) {
    const g = block.indexOf(`${group}: {`);
    if (g < 0) { out[group] = []; continue; }
    let d = 0, e = -1;
    const s2 = block.indexOf("{", g);
    for (let i = s2; i < block.length; i++) {
      if (block[i] === "{") d++;
      else if (block[i] === "}") { d--; if (d === 0) { e = i; break; } }
    }
    const inner = block.slice(s2 + 1, e);
    // **TOP-LEVEL `key:` PAIRS, SCANNED BY CHARACTER RATHER THAN BY LINE.**
    // The first version walked lines and took at most one key from each, so
    // `{ contact_phone: …, contact_email: … }` — both on one line, which is
    // how that function writes it — reported ONE field and made the payload
    // read narrower than it is. **A check that mis-reads the thing under test
    // is this file's own subject, one level out**, and it was caught by the
    // printed key list disagreeing with the source rather than by any
    // assertion.
    out[group] = [];
    let depth2 = 0, tok = "";
    for (let i = 0; i < inner.length; i++) {
      const c = inner[i];
      if ("{([".includes(c)) { depth2++; tok = ""; continue; }
      if ("})]".includes(c)) { depth2--; tok = ""; continue; }
      if (depth2 !== 0) continue;
      if (c === ",") { tok = ""; continue; }
      if (c === ":") {
        const k = tok.trim();
        if (/^[A-Za-z_]\w*$/.test(k)) out[group].push(k);
        // Skip to this pair's own comma, so a colon inside the VALUE — a
        // ternary, a nested object — cannot be read as another key.
        let d3 = 0;
        for (i++; i < inner.length; i++) {
          const v = inner[i];
          if ("{([".includes(v)) d3++;
          else if ("})]".includes(v)) { if (d3 === 0) { i--; break; } d3--; }
          else if (v === "," && d3 === 0) break;
        }
        tok = "";
        continue;
      }
      tok += c;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
console.log("  the twelve steps — each one's input removed in turn");
const base = setupProgress(complete());
// 12 steps + complete-fixture + payload-found + payload-complete +
// payload-no-dead-fields. The canary is not a target here — it is a
// property of the run. **This said +3 and `receipt.mjs` refused the
// receipt:** 16 discovered against 15 expected, and one target never
// marked itself completed. The grader caught both, which is what it is for.
const expectedTargets = STEPS.length + 4;
let discovered = 0, attempted = 0, completed = 0;

check("complete-fixture", base.count === STEPS.length,
  `a business that has done everything reads ${base.count} of ${base.total}; `
  + `the fixture is missing an input for: `
  + STEPS.map(([k]) => k).filter((k) => !base.done.has(k)).join(", "));
attempted++; discovered++; completed++;

// THE SABOTAGE: a step nothing feeds. This is 9.1 in miniature — the function
// answers confidently and the missing input is invisible — so the row for that
// step must fail.
const SABOTAGED = "payments";

for (const [step, blank] of FEEDS) {
  attempted++; discovered++;
  const inputs = complete();
  if (!(BREAK === "step" && step === SABOTAGED)) blank(inputs);
  const got = setupProgress(inputs);
  const lost = STEPS.map(([k]) => k).filter((k) => base.done.has(k) && !got.done.has(k));
  const ok = check(`feeds:${step}`,
    got.count === base.count - 1 && lost.length === 1 && lost[0] === step,
    `blanking ${step}'s input moved the count ${base.count} -> ${got.count} and lost `
    + `[${lost.join(", ")}]; expected exactly [${step}]`);
  observed.push(`${step}: ${ok ? "fed" : "NOT FED"} — blanking it lost [${lost.join(", ") || "nothing"}]`);
  completed++;
}

console.log("  the back office's payload");
attempted++; discovered++;
const keys = adminPayloadKeys();
check("payload-found", !!keys,
  "could not find the `setup_inputs` literal in platform-admin/index.ts, so the two "
  + "assertions below were asked of nothing");
completed++;
if (keys) {
  observed.push(`platform-admin sends: ${Object.entries(keys)
    .map(([g, k]) => `${g}{${k.join(",")}}`).join(" ")}`);

  // Assemble a payload with EXACTLY the keys that function sends, filled from
  // the complete business. Anything it does not send is simply absent — which
  // is what the back office lives with.
  const full = complete();
  const asSent = {};
  for (const [group, ks] of Object.entries(keys)) {
    asSent[group] = {};
    for (const k of ks) if (k in (full[group] ?? {})) asSent[group][k] = full[group][k];
  }
  const back = setupProgress(asSent);
  const blind = STEPS.map(([k]) => k).filter((k) => base.done.has(k) && !setupProgress(asSent).done.has(k));
  attempted++; discovered++;
  check("payload-complete", back.count === base.count,
    `the same business reads ${base.count} of ${base.total} from the dashboard's inputs and `
    + `${back.count} of ${back.total} from platform-admin's. Steps it cannot see: `
    + `${blind.join(", ")}. This is ROADMAP 9.1`);
  completed++;

  // Every key sent must matter. A key that changes nothing is dead weight or a
  // misspelling of a live one — `hoursOpen` next to `hoursRows`.
  // **A KEY IS TESTED ALONE, NOT REMOVED — and the first version got this
  // wrong in the direction that matters.** Deleting one key at a time and
  // watching the count calls `contact_phone` dead, because `info` is
  // *phone OR email* and the other one is still there. Two live inputs to the
  // same step each look redundant while the other stands. So each key is put
  // in an otherwise-empty group instead: **does this field, by itself, answer
  // any step?** `addOns` and `hoursOpen` answer none; either contact field
  // answers `info`.
  // **"DEAD" AND "CANNOT JUDGE" ARE DIFFERENT ANSWERS AND ARE REPORTED AS
  // SUCH.** A key the fixture does not fill cannot be tested alone at all, and
  // calling that dead is a statement about this check rather than about the
  // product — which it made, wrongly, about five payment columns the moment
  // they started being sent. A gap in the fixture is the check's own fault and
  // says so.
  const dead = [];
  const unjudged = [];
  for (const [group, ks] of Object.entries(keys)) {
    const floor = setupProgress({ ...asSent, [group]: {} }).count;
    for (const k of ks) {
      if (!(k in (asSent[group] ?? {}))) { unjudged.push(`${group}.${k}`); continue; }
      const alone = setupProgress({ ...asSent, [group]: { [k]: asSent[group][k] } }).count;
      if (alone <= floor) dead.push(`${group}.${k}`);
    }
  }
  attempted++; discovered++;
  check("payload-no-dead-fields", dead.length === 0 && unjudged.length === 0,
    [dead.length ? `platform-admin sends field(s) that change no step: ${dead.join(", ")} — `
      + "dead weight, or a misspelling of one the function does read" : "",
    unjudged.length ? `THIS CHECK'S OWN FIXTURE does not fill: ${unjudged.join(", ")} — `
      + "so they could not be judged either way; fill them in `complete()`" : ""]
      .filter(Boolean).join(" · "));
  observed.push(`fields sent that change nothing: ${dead.join(", ") || "none"}`
    + `; fields the fixture cannot judge: ${unjudged.join(", ") || "none"}`);
  completed++;
}

// ---------------------------------------------------------------------------
// THE CANARY: a step with nothing feeding it must be caught. Run as its own
// pass so a green run has proved the detector still bites.
console.log("  canary — a step nothing feeds; it MUST fail");
const canary = { id: "a-step-with-no-input", observed_failure: false, problems: [] };
if (BREAK === "canary") {
  // The documented sabotage: the canary is not run at all, so nothing is
  // observed and `receipt.mjs` must refuse the receipt. **It was written as a
  // documented flag that did nothing** — the canary block below runs
  // unconditionally — which is a switch that reads as a guard and is a
  // decoration, the exact thing this repo keeps finding. Caught by running it.
  console.log("    SKIPPED — --break=canary");
} else {
  const inputs = complete();
  // `payments` left untouched while claiming to have been blanked — exactly
  // what a missing input looks like from the function's side.
  const got = setupProgress(inputs);
  const lost = STEPS.map(([k]) => k).filter((k) => base.done.has(k) && !got.done.has(k));
  const bites = !(got.count === base.count - 1 && lost.length === 1 && lost[0] === SABOTAGED);
  canary.observed_failure = bites;
  if (!bites) canary.problems.push("the feeds row passed for a step whose input was never removed");
  console.log(`    ${bites ? "caught" : "MISSED"} — a row that does not blank its input fails `
    + `\`feeds:${SABOTAGED}\``);
  assertions++;
}

console.log("\nWhat it measured:");
for (const o of observed) console.log("  " + o);

// **AN ARTIFACT, BECAUSE A SOURCE-ONLY CHECK STILL OWES A PERSON SOMETHING TO
// LOOK AT.** `receipt.mjs` refused the first version for having none, and it
// was right: "12 of 12" says nothing about WHICH input feeds which step, and
// that is the whole content of this check.
mkdirSync(ART, { recursive: true });
writeFileSync(ART_FILE, [
  `setup-inputs-contract - ${new Date().toISOString()}`,
  "",
  `A business that has done everything reads ${base.count} of ${base.total} from the`,
  "dashboard's inputs. Each row below was proved by REMOVING that step's input",
  "and watching the count fall by exactly one.",
  "",
  ...observed.map((o) => "  " + o),
  "",
  "platform-admin's payload, keys read out of its own source:",
  ...(keys ? Object.entries(keys).map(([g, k]) => `  ${g}: ${k.join(", ")}`) : ["  NOT FOUND"]),
  "",
  failures.length ? "FAILURES:" : "No failures.",
  ...failures.map((f) => "  - " + f),
].join("\n"), "utf8");

const status = failures.length === 0 && canary.observed_failure ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "setup-inputs-contract",
  started_at,
  status,
  expected_targets: expectedTargets,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: STEPS.length + 5,
  assertion_floor:
    "12 steps + 1 complete-fixture + 1 payload-found + 1 payload-complete + 1 payload-no-dead-fields "
    + "+ the canary = 17. Fixed by STEPS.length and the row list, never by what the run finds: a "
    + "step added to `STEPS` with no row in FEEDS fails `complete-fixture`, and a payload literal "
    + "that cannot be found fails `payload-found` rather than passing on an empty set.",
  failures,
  artifacts: ["artifacts/setup-inputs-contract/contract.txt"],
  warnings: [
    "Behavioural, not a grep: which input feeds which step is discovered by REMOVING it and "
    + "watching the count, so renaming a field cannot blind this check.",
    "It reads platform-admin/index.ts and never writes it. The fix for a red `payload-complete` "
    + "is an edge-function change plus a deploy, and both belong to somebody else.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: {
    steps: STEPS.map(([k]) => k),
    dashboard_count: base.count,
    observed,
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expectedTargets} targets, ${assertions} assertions, `
  + `${failures.length} failure(s), canary ${canary.observed_failure ? "caught" : "MISSED"}. Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
