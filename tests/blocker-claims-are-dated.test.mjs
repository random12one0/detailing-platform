// ROADMAP 14.27 — A CLAIM ABOUT SOMETHING OUTSIDE THE REPO CARRIES THE DATE IT WAS MEASURED.
//
//   node --test tests/blocker-claims-are-dated.test.mjs
//   BLOCKER_BREAK=undate node --test tests/blocker-claims-are-dated.test.mjs   # sabotage
//
// Credential-free, one filesystem read, well under a second.
//
// ---------------------------------------------------------------------------
// THE FAULT
// ---------------------------------------------------------------------------
// *"The fix is written, it is not live, the only thing left is a publish"* is a
// reading of a system that changes without a commit. 2.8 and 2.1 carried the
// identical sentence; for 2.8 it stopped being true on 2026-09-21 and the item
// stayed open two days. **From the roadmap, a stale blocker and a real one are
// the same words** — so the words have to carry how old they are.
//
// ---------------------------------------------------------------------------
// WHAT IT ENFORCES, AND IT IS SMALLER THAN A RE-MEASURING CHECK
// ---------------------------------------------------------------------------
// In every OPEN item of ROADMAP.md, a paragraph that states live state in one of
// the phrasings below must contain an ISO date (YYYY-MM-DD). Text inside
// `~~strike-through~~` is a corrected claim and is not read: the convention here
// is to strike rather than delete, and a struck sentence asserts nothing.
//
// It also REPORTS each claim's age — the newest date in the paragraph against
// today — and names the ones past the budget as UNPROVEN rather than as true.
// **It reports; it does not fail on age.** Failing would redden the battery on
// the calendar rather than on the product, and the item asks that a reader can
// SEE the age, not that nobody ever lets one grow.
//
// ---------------------------------------------------------------------------
// WHAT IT CANNOT SEE, SAID HERE RATHER THAN DISCOVERED LATER
// ---------------------------------------------------------------------------
//   * **It reads phrasings, not meaning.** The 2026-09-24 hand pass found that a
//     keyword scan cannot tell a blocker from the word for one, and this is that
//     scan with a narrower net. A blocker worded some other way ("still the old
//     one", "awaiting the migration") is invisible. Add a phrasing when one is
//     found; the list is the one place to do it.
//   * **A date beside a claim is not proof the claim was re-measured on that
//     date.** It makes the claim's age readable, which is all the item asks.
//   * It does not re-ask the world. That is shape 2 in the item and it needs a
//     credential per claim; this check needs none.
//
// ---------------------------------------------------------------------------
// BROKEN ON PURPOSE
// ---------------------------------------------------------------------------
//   * Test 2 is a canary run EVERY time, against the same production function
//     the real read uses: an undated claim must be flagged, a dated one passed,
//     a struck one ignored.
//   * `BLOCKER_BREAK=undate` strips every date out of the real document before
//     checking and the suite must go red. (It was run 2026-10-06; the count is in
//     the roadmap entry.)
//   * The first real run of this file found a stale claim nobody had noticed —
//     3.4's "NOT LIVE" paragraph, about a function that had been published on
//     2026-09-21 — which is the item's own subject, found by the item's own check.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ROADMAP = new URL("../ROADMAP.md", import.meta.url);

// The phrasings that state live state. One list, one place to add to.
const CLAIM = new RegExp([
  String.raw`\bnot (?:yet )?(?:live|deployed|published)\b`,
  String.raw`\bis not live\b`,
  String.raw`\bunpublished\b`,
  String.raw`\bnot applied yet\b`,
  String.raw`\bnot running\b`,
  String.raw`\bstill (?:the old|firing)\b`,
  String.raw`\bwaiting on Andrew\b`,
  String.raw`\bblocked (?:on|by) Andrew\b`,
  String.raw`\bneeds? (?:a|the) publish`,
  String.raw`\bAndrew (?:publishing|publishes|pressing publish)\b`,
].join("|"), "i");
const ISO = /\b20\d\d-\d\d-\d\d\b/g;

const BUDGET_DAYS = 7;       // older than this reports as UNPROVEN
const DISCOVERY_FLOOR = 5;   // fewer claims than this means the parser stopped matching, not that the board is clean

/** Open items → their claim paragraphs, each with whether it is dated. */
export function claimsIn(text) {
  const lines = text.split(/\r?\n/);
  const heads = lines.flatMap((l, i) => (/^- \[[ x]\] \*\*/.test(l) ? [i] : []));
  heads.push(lines.length);
  const out = [];
  for (let k = 0; k + 1 < heads.length; k++) {
    const head = lines[heads[k]];
    if (!head.startsWith("- [ ]")) continue;                       // ticked items are history
    const label = (head.match(/\*\*(?:DONE[^*]*?— )?([0-9]+(?:\.[0-9]+)?[a-z]?)\b/) || [, head.slice(0, 40)])[1];
    const body = lines.slice(heads[k], heads[k + 1]).join("\n");
    for (const para of body.split(/\n\s*\n/)) {
      const live = para.replace(/~~[\s\S]*?~~/g, " ");             // a struck claim asserts nothing
      if (!CLAIM.test(live)) continue;
      const dates = para.match(ISO) || [];
      out.push({ item: label, dated: dates.length > 0, newest: dates.sort().pop() || null, snippet: live.replace(/\s+/g, " ").trim().slice(0, 110) });
    }
  }
  return out;
}

const raw = readFileSync(ROADMAP, "utf8");
const text = process.env.BLOCKER_BREAK === "undate" ? raw.replace(ISO, "") : raw;
const claims = claimsIn(text);

test("14.27 · 1 — the scan found live-state claims in open items (discovery floor)", () => {
  assert.ok(claims.length >= DISCOVERY_FLOOR,
    `found ${claims.length} claim paragraphs in open items, floor ${DISCOVERY_FLOOR}. **Few or zero is a broken scan, never a clean board** — check the item-head shape \`- [ ] **\` and the CLAIM phrasings before touching the floor.`);
});

test("14.27 · 2 — canary: the same function flags an undated claim, passes a dated one, ignores a struck one", () => {
  const doc = [
    "- [ ] **99.1 — undated**", "  The fix is not live.", "",
    "- [ ] **99.2 — dated**", "  The fix is not live — measured 2026-10-06.", "",
    "- [ ] **99.3 — struck**", "  ~~The fix is not live.~~", "",
    "- [x] **99.4 — ticked**", "  The fix is not live.", "",
  ].join("\n");
  const got = claimsIn(doc);
  assert.deepEqual(got.map((c) => [c.item, c.dated]), [["99.1", false], ["99.2", true]],
    "claimsIn must flag the undated open claim, pass the dated one, ignore the struck sentence and the ticked item");
});

test("14.27 · 3 — every live-state claim in an open item carries a date", () => {
  const bad = claims.filter((c) => !c.dated);
  assert.deepEqual(bad.map((c) => `${c.item}: ${c.snippet}`), [],
    "**These claim something about a live system and say nothing of when it was measured.** "
    + "Re-measure the claim and put the date in the same paragraph, or strike it with ~~ ~~ if it is no longer true. "
    + "`docs/gotchas.md` and ROADMAP 14.27: a stale blocker and a real one are the same words.");
});

test("14.27 · 4 — AGE REPORT (reports, never fails): claims older than the budget are UNPROVEN", () => {
  const today = Date.parse(new Date().toISOString().slice(0, 10));
  const aged = claims.filter((c) => c.newest).map((c) => ({ ...c, age: Math.round((today - Date.parse(c.newest)) / 86400000) }));
  const stale = aged.filter((c) => c.age > BUDGET_DAYS);
  console.log(`  ${aged.length} dated claims in open items; ${stale.length} older than ${BUDGET_DAYS} days (UNPROVEN, not false):`);
  for (const c of stale.sort((a, b) => b.age - a.age)) console.log(`    ${c.item.padEnd(6)} ${String(c.age).padStart(3)}d  ${c.newest}  ${c.snippet}`);
  assert.ok(aged.length >= 1, "no dated claim at all — the age report has nothing to report on");
});
