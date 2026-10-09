// EVERY OPEN ITEM IN `ROADMAP.md` CAN BE CITED UNAMBIGUOUSLY.
//
// Run: node --test tests/every-open-item-is-citable.test.mjs
//      Credential-free. Two filesystem reads. No network, no database.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS — an item with no identifier is not hard to find, it is
// UNCHECKABLE, and the cost is invisible until somebody looks
// ---------------------------------------------------------------------------
// Two open items sat in `ROADMAP.md` for ten days with no number:
//
//   - [ ] **A reseed eats the evidence an open item depends on...**
//   - [ ] **Nothing notices when a blocker goes stale...**
//
// **Every instrument in this repo keys on the item number** — the commit-grep
// sweep (`git log --grep "14.26"`), the present-tense sweep, the batch audits,
// every cross-reference between entries. So **neither item was ever checked by
// any of them, and nothing said so**, because a tool that enumerates by
// identifier cannot report an item it never enumerated. Other entries cited
// them as *"the reseed item"* and *"the stale-blocker item"*, which is itself
// the evidence they needed numbers: a thing referred to by description is a
// thing nothing can index.
//
// **They were numbered 14.26 and 14.27 on 2026-10-03, and within the hour 14.26
// turned out to be the sharpest finding of the night** — it had predicted its
// own fault in writing eight days earlier (an evidence row eaten by a reseed),
// the loss had already happened, and nothing had noticed. **That finding was
// sitting there the whole time and no sweep could reach it.**
//
// This check is the cheapest possible guard against a third one: count the open
// items with no identifier, and expect zero. **It would have fired on day one.**
//
// ---------------------------------------------------------------------------
// THE WIDER QUESTION, AND THE DECISION — a number alone is NOT an unambiguous
// citation in this repo, and this check does NOT try to make it one
// ---------------------------------------------------------------------------
// `docs/gotchas.md` 91 records that **`ROADMAP.md` and `docs/roadmap.md` both
// issue item numbers and reuse them.** `docs/roadmap.md:71` has its own `1.3`,
// done 2026-08-29; the live `1.3` is *"Test accounts appear in production lists
// and counts"*. So "1.3" cites two different items and `git log --grep "1.3"`
// answers confidently about the wrong one.
//
// **Three options were on the table and the choice is recorded here rather than
// left to be re-derived:**
//
//   1. **Require global uniqueness across both files.** REJECTED. **19 of the
//      64 open items collide today** — 0.3, 0.4, 1.3, 2.1, 2.12, 2.15, 3.1,
//      3.3, 3.4, 4.1, 4.3, 6.1 and more. Satisfying it means renumbering a live
//      queue or rewriting a build history nobody is working from, and the check
//      would stand red for weeks over a condition nobody intends to fix. **A
//      check that is red forever is a check everybody learns to walk past**,
//      which is the fault this repo keeps paying for.
//   2. **Ignore the collision.** REJECTED for the opposite reason: it is real,
//      it cost 21 false positives in one sweep, and an unwatched overlap grows.
//   3. **CHOSEN: require uniqueness WITHIN `ROADMAP.md`, which is actionable,
//      and DECLARE the cross-file overlap so it cannot grow silently.** The
//      overlap is a number in this file. A twentieth collision reddens the run
//      and somebody decides on purpose. Same shape as
//      `platform-admins-declared`: a document states the intention, the check
//      compares reality against it, never the reverse.
//
// **So "citable" here means: every open item has an identifier, no two open
// items share one, and the known ambiguity with the old roadmap is a declared
// constant rather than a surprise.** It does not mean a bare number is safe to
// grep — for that, `docs/gotchas.md` 91 says to add a date floor at 2026-09-12.
//
// ---------------------------------------------------------------------------
// WHAT IT DECLARES, AND WHY ZERO DISCOVERED IS A FAILURE
// ---------------------------------------------------------------------------
// **The failure mode this check must not have is its own parser going quiet.**
// If the `- [ ]` regex stops matching — a heading style changes, the file is
// moved, somebody switches to a task-list plugin — discovery collapses to zero
// and **every assertion below passes vacuously**: no items, therefore no items
// without an identifier, therefore green. That is this repo's single most
// repeated fault and it is why `OPEN_FLOOR` exists.
//
// `OPEN_FLOOR` guards the PARSER, not the backlog. It is deliberately well
// below today's count so that closing real items never reddens the run, and
// well above zero so that a broken parser cannot pass.
//
// ---------------------------------------------------------------------------
// BROKEN ON PURPOSE BEFORE IT WAS TRUSTED — 2026-10-03
// ---------------------------------------------------------------------------
// Two sabotages, both run, both caught. Recorded in ROADMAP 14.28.
//
//   1. **A real unnumbered item added to `ROADMAP.md`** — an actual `- [ ]`
//      line with no number, written into the file, the suite run, the line
//      removed. It must name the line number. (What happened: see 14.28.)
//   2. **`CITABLE_CANARY=1`** injects a synthetic unnumbered item into the
//      parsed list without touching the file, so the red can be reproduced on
//      any checkout at any time with nothing to clean up.
//
// The canary exists because sabotage 1 edits a shared file two sessions append
// to, and a crash between the edit and the revert leaves `ROADMAP.md` dirty.
// **The canary is the one to reach for; the file edit is the one that proves
// the canary is not lying.**

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ROADMAP = "ROADMAP.md";
const OLD_ROADMAP = "docs/roadmap.md";

// Guards the parser, not the backlog. 64 open items on 2026-10-03.
const OPEN_FLOOR = 40;

// Declared, not derived — `docs/gotchas.md` 91. Measured 2026-10-03.
// A new collision should redden this run and be decided on purpose.
//
// **19 → 18 on 2026-10-03, and the check caught it rather than a person.** 6.2
// was ticked, so it left the open set and took its collision with it. The run
// went red with *"18 open items share a number with docs/roadmap.md, declared
// 19"* — **which is the design working in the direction nobody plans for**: the
// guard was written against the number GROWING, and it fired on the number
// shrinking for a good reason. **Moved deliberately, with the cause named, which
// is the whole point of a declared constant over a derived one.**
//
// **18 → 17 on 2026-10-06, same cause:** 7.3 (pricing page) was ticked and
// took its collision with old-roadmap 7.3 with it.
//
// **17 → 16 on 2026-10-06, same cause:** 2.12 (Spanish) was ticked and took its
// collision with old-roadmap 2.12 with it. The new open item 2.12a has no twin.
//
// **16 → 15 on 2026-10-06, same cause:** 9.2 (the back office saying contradictory
// things) was closed, Andrew having ruled the stages redesign not built, and took
// its collision with old-roadmap 9.2 with it. Read off the failure's own list, which
// names the open items sharing a number: 9.2 was the only one that left.
//
// **15 → 14 on 2026-10-08, same cause for the fifth time:** 9.4 (the calendar) was
// ticked and took its collision with old-roadmap 9.4 with it. Nobody renumbered
// anything — this constant's own note says a shrink is worth knowing because it
// USUALLY means a renumber, and this is the other way it can shrink. Read off the
// failure's own list, which names the fourteen that remain: 0.3, 0.4, 1.3, 2.1,
// 2.15, 3.1, 3.3, 3.4, 4.1, 4.3, 6.1, 8.2, 8.5, 9.1 — 9.4 is the only one gone.
//
// **AND THIS GATE WAS RED FOR EXACTLY ONE COMMIT, `e95f01c`, WHICH IS WORTH A LINE
// RATHER THAN A QUIET FIX.** The failure was on screen when that commit was made
// and it was committed anyway, in the same breath as a message claiming the gates
// were run. Nothing downstream was harmed — the move is this one line and the tick
// it describes is correct — but "the output was printed" and "the output was read"
// are two different things, and this repo's oldest lesson is about exactly that
// gap. Caught on the next command rather than by anybody else.
// **14 → 13 ON 2026-10-09, AND IT SHRANK BY A CLOSURE RATHER THAN BY A
// RENUMBERING**, which is the other of the two reasons the message above names.
// `0.4` was ticked — the build-start notice, the last promise on a public page
// with nothing behind it — so it left the OPEN set and took its collision with
// `docs/roadmap.md` 0.4 with it. Nothing was renumbered and no citation moved.
const CROSS_FILE_OVERLAP = 13;

const CANARY = process.env.CITABLE_CANARY === "1";

/** Every open item, with the identifier it can be cited by (or null). */
function openItems(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  lines.forEach((line, i) => {
    if (!/^- \[ \] /.test(line)) return;
    const bare = line.replace(/\*\*/g, "");
    // The number may lead the item text...
    let m = bare.match(/^- \[ \] (\d+\.\d+[a-z]?)\b/);
    // ...or sit in a `### 14.26 — ...` heading just above it.
    if (!m) {
      for (let j = i - 1; j >= 0 && j > i - 6; j--) {
        const h = lines[j].match(/^#{2,4} (\d+\.\d+[a-z]?) —/);
        if (h) { m = [null, h[1]]; break; }
      }
    }
    items.push({ line: i + 1, id: m ? m[1] : null, text: bare.slice(6, 60).trim() });
  });
  if (CANARY) {
    items.push({ line: 0, id: null, text: "CITABLE_CANARY — a synthetic unnumbered item" });
  }
  return items;
}

/** Item numbers issued by the old build history, which reuses them. */
function oldIds(text) {
  return new Set(
    (text.match(/^- \[.\] (\d+\.\d+[a-z]?)\b/gm) || [])
      .map((s) => s.replace(/^- \[.\] /, "")),
  );
}

test("every open item in ROADMAP.md is citable", async (t) => {
  const roadmap = readFileSync(ROADMAP, "utf8");
  const items = openItems(roadmap);

  await t.test("0 · the check has subjects", () => {
    assert.ok(roadmap.length > 1000, `${ROADMAP} is empty or unreadable`);
    assert.ok(
      items.length >= OPEN_FLOOR,
      `discovered ${items.length} open items, floor is ${OPEN_FLOOR}. `
      + "Zero or few discovered is a BROKEN PARSER, never a clean backlog — "
      + "every assertion below would pass vacuously. Check the `- [ ] ` shape "
      + "before changing this floor.",
    );
  });

  await t.test("1 · every open item has an identifier", () => {
    const naked = items.filter((i) => !i.id);
    assert.deepEqual(
      naked.map((n) => `ROADMAP.md:${n.line} — ${n.text}`),
      [],
      "an open item with no number is UNCHECKABLE: every sweep in this repo "
      + "keys on the identifier, so nothing will ever report on it and nothing "
      + "will say so. Give it one (the 14.x series is where found-in-passing "
      + "items go) and cite it from wherever it is referred to by description.",
    );
  });

  await t.test("2 · no two open items share an identifier", () => {
    const seen = new Map();
    const dupes = [];
    for (const i of items) {
      if (!i.id) continue;
      if (seen.has(i.id)) dupes.push(`${i.id}: lines ${seen.get(i.id)} and ${i.line}`);
      else seen.set(i.id, i.line);
    }
    assert.deepEqual(dupes, [], "two open items citing the same number means a "
      + "citation picks one of them at random");
  });

  await t.test("3 · the overlap with the old roadmap is the declared one", () => {
    const old = oldIds(readFileSync(OLD_ROADMAP, "utf8"));
    assert.ok(old.size > 20, `${OLD_ROADMAP} yielded ${old.size} ids — parser check`);
    const overlap = items.filter((i) => i.id && old.has(i.id)).map((i) => i.id);
    assert.equal(
      overlap.length, CROSS_FILE_OVERLAP,
      `${overlap.length} open items share a number with ${OLD_ROADMAP}, `
      + `declared ${CROSS_FILE_OVERLAP}. This is NOT a failure to fix by `
      + "renumbering — see the decision at the top of this file. It is a "
      + "declared ambiguity: if it grew, say why and move the constant; if it "
      + "shrank, somebody renumbered something and that is worth knowing too. "
      + `Today: ${overlap.sort().join(", ")}`,
    );
  });

  await t.test("4 · the canary is wired and says so", () => {
    if (!CANARY) {
      assert.equal(
        items.filter((i) => i.line === 0).length, 0,
        "no synthetic item should exist without CITABLE_CANARY=1",
      );
      return;
    }
    // Reached only under the canary: section 1 has already failed by now.
    assert.fail("CITABLE_CANARY=1 — this line should be unreachable because "
      + "section 1 must fail first on the synthetic unnumbered item");
  });
});
