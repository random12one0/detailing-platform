// ROADMAP 0.11d1 — THE OVER-CAP REFUSAL A PERSON ACTUALLY SEES.
//
//   node --test tests/overcap-refusal.test.mjs
//   OVERCAP_BREAK=blunt-judge node tests/overcap-refusal.test.mjs
//
// Credential-free, four filesystem reads, no dev server, no network.
//
// ---------------------------------------------------------------------------
// WHY IT EXISTS
// ---------------------------------------------------------------------------
// 0.11d's third criterion is *"an over-cap upload is refused with used space,
// limit and deletion guidance in the message."* **The server says all three and
// nobody ever saw it.** `_shared/photoDoor.ts`'s `fullSentence` is "Photo
// storage is full: 9.0 MB of 10.2 MB used. Delete old job photos to make
// room." — but the client checks `roomFor` BEFORE it calls the door, and that
// order is deliberate (an upload that succeeds and is then refused has already
// spent the bytes), so on the path a detailer walks the door is never asked.
// What they were shown named neither number, and on an expense named nothing at
// all that frees room.
//
// So the criterion was satisfied by a sentence nobody is shown. That is this
// repo's own most repeated fault one level out: the check passes, and the thing
// it describes never happens where it counts. This file asks the question the
// other way round — **of the sentence that reaches the screen.**
//
// ---------------------------------------------------------------------------
// THE SABOTAGE SWITCH IS AN ENV VAR AND THAT IS NOT A STYLE CHOICE
// ---------------------------------------------------------------------------
// `docs/gotchas.md` 104: `node --test <file> --break=x` does NOT pass the flag
// to the file. Node consumes every extra argument and the child's argv is just
// `[node, <file>]`, so a test-file sabotage switched on the obvious way is
// switched off — and prints the same green a caught one prints. `OVERCAP_BREAK`
// is read from the environment, which reaches the file under `node --test` and
// under a direct run alike.
//
// ---------------------------------------------------------------------------
// THE JUDGE IS LIFTED OUT, SO THE SABOTAGE CAN REACH IT
// ---------------------------------------------------------------------------
// `docs/gotchas.md` 95: a canary aimed at a COPY of the rule cannot catch
// anything. `judge()` below is the one rule, used by the real assertions and by
// the canaries, so `OVERCAP_BREAK=blunt-judge` blinds both at once and the
// canaries are what notice. A canary that cannot fail is decoration, and the
// three here are the three sentences that were actually on the screen.
//
// ---------------------------------------------------------------------------
// WHAT IT CANNOT SEE
// ---------------------------------------------------------------------------
//   * **Whether the sentence is READABLE where it lands.** A hit test and a
//     string check both answer "is it there", never "can it be read"
//     (`docs/gotchas.md` 100). That is the browser's half and belongs to
//     `.manager-shots/`, not here.
//   * **`names_used` and `names_limit` are substring tests**, so a budget whose
//     used and cap format to the same string would let a sentence naming one
//     twice pass as naming both. `BUDGET` below is 9.0 MB of 10.2 MB on
//     purpose: the two never collide.
//   * **The server's own sentence**, which has its own checks
//     (`tests/photo-door-server.test.mjs`, `tests/photo-door-contract.test.mjs`)
//     and is unreachable on these two paths by design.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "../scripts/receipt.mjs";
import { fullWords, mb, roomFor } from "../app/src/lib/photo-rules.js";

const started_at = new Date().toISOString();
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BREAK = process.env.OVERCAP_BREAK || "";

let passed = 0, assertions = 0;
const failures = [];
const check = (name, ok, got = "") => {
  assertions++;
  if (ok) { passed++; console.log(`  ok    ${name}`); return true; }
  failures.push(got ? `${name} — got ${got}` : name);
  console.log(`  FAIL  ${name}${got ? ` — got ${got}` : ""}`);
  return false;
};

// ── THE RULE, ONCE ─────────────────────────────────────────────────────────
/** What a refusal sentence has to do. The one rule the assertions and the
 *  canaries both run, so a blunted judge is caught by the canaries. */
export function judge(sentence, b) {
  const s = String(sentence ?? "");
  if (BREAK === "blunt-judge") return { names_used: true, names_limit: true, names_relief: true };
  return {
    names_used: s.includes(mb(b.used_bytes)),
    names_limit: s.includes(mb(b.cap_bytes)),
    // English and Spanish, because the Spanish dashboard shows this sentence
    // too and a rule that only knows English would pass it blind.
    names_relief: /\b(remove|delete)\b|\b(quita|borra|elimina)/i.test(s),
  };
}

// 9.0 MB used of a 10.2 MB cap — the live per-business share is
// `photo_total_bytes() / 100`, which is 10.24 MB today and 102.4 MB after the
// 10 GB change, so MB is the right unit at both settings and no GB formatter is
// owed. The two figures never format alike; see "what it cannot see".
const BUDGET = { used_bytes: Math.round(9.0 * 1048576), cap_bytes: Math.round(10.24 * 1048576) };

const read = (p) => {
  let s = readFileSync(path.join(REPO, p), "utf8");
  // The sabotages corrupt the SOURCE in memory, never on disk.
  if (BREAK === "job-literal" && p.endsWith("JobPhotos.jsx")) {
    s = s.replace("setError(fullWords(budget, t));",
      'setError("Photo storage is full. Remove some photos to add more.");');
  }
  if (BREAK === "expense-plain" && p.endsWith("ExpenseModal.jsx")) {
    s = s.replace(/\? t\("Expense saved, but the receipt did not attach\. \{reason\}",\s*\{ reason: fullWords\(e\.budget, t\) \}\)/,
      '? t("Expense saved, but photo storage is full so the receipt was not attached.")');
  }
  if (BREAK === "budget-link" && p.endsWith("receipts.js")) {
    s = s.replace("e.budget = budget;", "");
  }
  return s;
};

// ── 1 · THE SENTENCE THE PRODUCT PRODUCES ──────────────────────────────────
console.log("1. what fullWords actually says");
{
  const said = BREAK === "sentence"
    ? "Photo storage is full. Remove some photos to add more."   // the pre-fix sentence
    : fullWords(BUDGET);
  const v = judge(said, BUDGET);
  check("1a · it names the space used", v.names_used, JSON.stringify(said));
  check("1b · it names the limit", v.names_limit, JSON.stringify(said));
  check("1c · it names what frees room", v.names_relief, JSON.stringify(said));
  // The numbers must be the REAL ones. A sentence with the right SHAPE and
  // invented figures passes every test above that is keyed on a shape.
  check("1d · and the figures are this budget's, not a shape", said.includes("9.0 MB") && said.includes("10.2 MB"),
    JSON.stringify(said));

  // THE TRANSLATOR IS GIVEN THE PLACEHOLDERS, not a pre-filled string: a
  // Spanish dashboard passes `t`, and a sentence assembled before translation
  // would reach `t` as a key nothing in the catalogue matches.
  const keys = [];
  fullWords(BUDGET, (s, v2) => { keys.push([s, v2]); return s; });
  check("1e · the sentence reaches the translator with {used} and {limit} unfilled",
    keys.length === 1 && keys[0][0].includes("{used}") && keys[0][0].includes("{limit}")
      && keys[0][1]?.used === "9.0 MB" && keys[0][1]?.limit === "10.2 MB",
    JSON.stringify(keys));

  // AN UNREADABLE CAP IS NOT "0 of 0". `photo-rules.js` refuses to invent a
  // reassuring number from a failed read everywhere else and this is no
  // different — the plain sentence is correct there, and it is the ONLY place
  // it is correct.
  check("1f · an unknown cap falls back to the plain sentence, never to 0.0 MB",
    fullWords(null) === "Photo storage is full. Remove some photos to add more."
      && !fullWords(null).includes("0.0 MB"), JSON.stringify(fullWords(null)));
  check("1g · and so does a zero cap", !fullWords({ used_bytes: 5, cap_bytes: 0 }).includes("0.0 MB"));
}

// ── 2 · THE POPULATION, DECLARED AS AN EQUALITY ─────────────────────────────
//
// `docs/gotchas.md` 98: a declaration of how many of something exist is an
// EQUALITY, never a ceiling with room in it. Two places in the app refuse an
// upload for want of room before the door is asked, and a third one appearing
// must redden this rather than slip in under a `>=`.
console.log("\n2. the two places that refuse before the door is asked");
const REFUSERS = ["app/src/components/JobPhotos.jsx", "app/src/lib/receipts.js"];
{
  const all = ["app/src/components/JobPhotos.jsx", "app/src/lib/receipts.js",
    "app/src/components/ExpenseModal.jsx", "app/src/lib/photos.js", "app/src/lib/photo-door.js"];
  const found = all.filter((f) => /\broomFor\(/.test(read(f)));
  if (BREAK === "population") found.push("app/src/screens/Invented.jsx");
  check("2a · exactly two callers of roomFor, and they are the two named",
    found.length === REFUSERS.length && REFUSERS.every((f) => found.includes(f)),
    `${found.length}: ${found.join(", ")}`);
}

// ── 3 · EACH SITE IS WIRED TO THAT SENTENCE ─────────────────────────────────
console.log("\n3. each refusal reaches the screen as that sentence");
const SITES = [
  {
    id: "job-record",
    file: "app/src/components/JobPhotos.jsx",
    wired: /setError\(fullWords\(budget, t\)\)/,
    // The weak literal must not be in the component any more. It still lives
    // in `photo-rules.js` — `budgetWords` and the unknown-cap fallback — and
    // that is correct; in a component it is a refusal naming no numbers.
    gone: '"Photo storage is full. Remove some photos to add more."',
  },
  {
    id: "expense-receipt",
    file: "app/src/components/ExpenseModal.jsx",
    wired: /reason: fullWords\(e\.budget, t\)/,
    gone: "Expense saved, but photo storage is full so the receipt was not attached.",
  },
];
for (const s of SITES) {
  const src = read(s.file);
  check(`3a·${s.id} · the refusal is fullWords, through t`, s.wired.test(src));
  check(`3b·${s.id} · and the sentence that named no numbers is gone`, !src.includes(s.gone));
}
// THE CHAIN, because this is the silent half: `ExpenseModal` has no budget of
// its own, so if `receipts.js` stops attaching one, `fullWords` falls back to
// the plain sentence and the screen quietly stops naming the numbers — with no
// error, nothing red, and the wiring above still perfectly in place.
{
  const src = read("app/src/lib/receipts.js");
  check("3c · receipts.js carries the budget out on the refusal",
    /e\.code = "BUDGET_FULL";[\s\S]{0,400}?e\.budget = budget;/.test(src));
  check("3d · and it is the budget roomFor was asked about",
    /const budget = await budgetFor\(businessId\);[\s\S]{0,600}?roomFor\(blob\.size, budget\)/.test(src));
}

// ── 4 · THE CANARIES — THE THREE SENTENCES THAT WERE REALLY ON THE SCREEN ───
console.log("\n4. the judge still catches what was there before the fix");
const CANARIES = [
  { id: "the-old-job-sentence", text: "Photo storage is full. Remove some photos to add more.",
    miss: ["names_used", "names_limit"] },
  { id: "the-old-expense-sentence", text: "Expense saved, but photo storage is full so the receipt was not attached.",
    miss: ["names_used", "names_limit", "names_relief"] },
  { id: "invented-zeros", text: "Photo storage is full: 0.0 MB of 0.0 MB used. Remove some photos to add more.",
    miss: ["names_used", "names_limit"] },
];
for (const c of CANARIES) {
  const v = judge(c.text, BUDGET);
  check(`4·${c.id} · is still judged a failure, on ${c.miss.join(" and ")}`,
    c.miss.every((k) => v[k] === false), JSON.stringify(v));
}
// The first canary's live result is what the receipt reports, so a blunted
// judge cannot be recorded as a caught defect.
const canaryCaught = CANARIES[0].miss.every((k) => judge(CANARIES[0].text, BUDGET)[k] === false);

// AND THE OPPOSITE DIRECTION, because a judge that fails everything would pass
// every line above.
check("4d · while the sentence the product now sends passes all three",
  Object.values(judge(fullWords(BUDGET), BUDGET)).every(Boolean));

// ── 5 · roomFor IS WHAT ACTUALLY BLOCKS, AND IT IS UNCHANGED ────────────────
// The sentence is cosmetic if the refusal stops happening, so the decision the
// sentence explains is asserted here too.
console.log("\n5. the refusal itself");
check("5a · an over-cap file is refused", !roomFor(2 * 1048576, BUDGET));
check("5b · one that fits is not", roomFor(1024, BUDGET));
check("5c · and an unknown cap does not block", roomFor(9e9, null));

const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions.`);
if (BREAK) console.log(`  note  OVERCAP_BREAK=${BREAK} was set: this run is a sabotage and MUST be red.`);

// SOMETHING FOR A PERSON TO LOOK AT, which the grader requires and is right to:
// a check whose whole output is a colour cannot be argued with. This is the four
// sentences side by side - the one the product now sends and the three it used
// to - so a reader can see the difference rather than take the verdict on
// trust. The browser half's artifacts are its own screenshots under
// `.manager-shots/`; this file produces no pixels and must not claim any.
const table = [
  "ROADMAP 0.11d1 — the over-cap refusal, judged",
  `budget: ${mb(BUDGET.used_bytes)} used of ${mb(BUDGET.cap_bytes)}`,
  "",
  `NOW   ${fullWords(BUDGET)}`,
  ...CANARIES.flatMap((c) => [`WAS   ${c.text}`, `      judged: ${JSON.stringify(judge(c.text, BUDGET))}`]),
].join("\n") + "\n";
const tablePath = path.join(REPO, "receipts", "overcap-refusal.txt");
writeFileSync(tablePath, table);

const { path: receiptPath } = writeReceipt({
  check_id: "overcap-refusal",
  started_at,
  status: failed ? "fail" : "pass",
  // The two refusal sites. Declared as an equality, not a floor — § 2.
  expected_targets: 2,
  discovered_targets: SITES.length,
  attempted_targets: SITES.length,
  completed_targets: SITES.length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 21,
  // DECLARED STRUCTURAL, because the floor equals the count and the grader is
  // right to refuse that on its own (`docs/gotchas.md` 98: a ceiling with room
  // in it is how 196 came to sit over an actual 192). Here the count genuinely
  // cannot vary at run time, so the honest form is to say why rather than to
  // invent slack underneath it.
  assertion_floor: "7 in §1 + 1 in §2 + (2 sites x 2 questions) + 2 chain in §3 + 4 in §4 + 3 in §5 = 21. "
    + "Every check() runs unconditionally - no early return, no conditional section, and the only "
    + "multiplier is SITES.length, which expected_targets declares as 2 and §2 asserts as an equality. "
    + "So the count is fixed by the question list and cannot fall without a diff somebody has to justify: "
    + "a tripwire on the code, not a run-time check.",
  // THE NEGATIVE CONTROL THE GRADER ASKS FOR. The three § 4 canaries are the
  // three sentences that were really on the screen before this fix; this
  // reports the first of them, re-judged on every run, and `observed_failure`
  // is the live result rather than a literal `true` — a canary recorded as
  // caught without being re-run is `docs/gotchas.md` 95's decoration.
  canary: {
    id: CANARIES[0].id,
    observed_failure: canaryCaught,
    what: "the pre-fix job-record sentence, which names neither the space used nor the limit",
    rule: CANARIES[0].miss.join(" + "),
  },
  failures,
  artifacts: ["receipts/overcap-refusal.txt"],
  dimensions: {
    roadmap: "0.11d1",
    criterion: "an over-cap upload is refused with used space, limit and deletion guidance in the message",
    sentence: fullWords(BUDGET),
    budget_mb: { used: mb(BUDGET.used_bytes), cap: mb(BUDGET.cap_bytes) },
    refusers: REFUSERS,
    canaries: CANARIES.map((c) => c.id),
    sabotage: BREAK || null,
    unjudgeable: ["whether the sentence is readable where it lands — that is the browser's half"],
  },
  warnings: [
    "The server's own fullSentence is unreachable on these two paths by design; it has its own checks.",
  ],
});
console.log(`\nreceipt  ${receiptPath}  —  validate: node scripts/receipt.mjs`);
process.exit(failed ? 1 : 0);
