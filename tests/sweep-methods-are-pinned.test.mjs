// THE TWO SWEEP METHODS, PINNED AS CODE INSTEAD OF PROSE.
//
// Run: node --test tests/sweep-methods-are-pinned.test.mjs
//      Credential-free. One `git log` call and filesystem reads. No network.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS — two sweeps produced eleven figures and NOT ONE of them can
// be re-taken, for a reason that is fixable and was proved fixable in the same
// document
// ---------------------------------------------------------------------------
// `docs/gotchas.md` 94: a recorded number carries the command that produced it
// and the revision it was taken at, or it is a memory. 44 recorded figures were
// re-run on 2026-10-02 and **5 survived**. Eleven of the casualties came from
// two sweeps whose method was a prose paragraph:
//
//   * **the commit-grep sweep** said *"for each item number, `git log --grep`"*.
//     That does not pin a count. Unique commits gives **434** at the table's own
//     revision; summing per item with duplicates gives **853**. The recorded
//     figure is **534** and is neither.
//   * **the quote sweep** said *"quoted fragments of 8-70 characters containing
//     a space"*. Its sibling figure — criteria that quote AND name a file —
//     **reproduced EXACTLY at 36**, because the zone rule WAS written down.
//     The fragment rule was not, and the fragment count missed by 27.
//
// **One document, both outcomes, which is the whole proof: the rule that was
// recorded reproduced and the rule that was described did not.** So the fix is
// not better prose. It is this file.
//
// ---------------------------------------------------------------------------
// WHAT "PINNED" MEANS HERE
// ---------------------------------------------------------------------------
// The functions below ARE the definitions. There is no prose version to drift
// from. A number taken from this file can be re-taken by running this file, and
// the constants record what it returned and at which commit.
//
// **The constants are DECLARED, not derived.** When a real change moves one,
// move it in the same edit and say why — the same discipline as
// `CROSS_FILE_OVERLAP` in `every-open-item-is-citable`. A constant that silently
// tracks reality measures nothing.
//
// ---------------------------------------------------------------------------
// BROKEN ON PURPOSE BEFORE IT WAS TRUSTED
// ---------------------------------------------------------------------------
//   * `PIN_CANARY=scope` widens the commit-scope regex to match a bare number,
//     which pulls in unrelated commits and must move the count.
//   * `PIN_CANARY=fragment` drops the "must contain a space" clause from the
//     fragment rule, which admits single tokens and must move the count.
// Both are reproducible on any checkout with nothing to clean up.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const CANARY = process.env.PIN_CANARY || "";

const sh = (c) => {
  try { return execFileSync("bash", ["-c", c], { encoding: "utf8", maxBuffer: 1 << 28 }); }
  catch (e) { return e.stdout || ""; }
};

// ===========================================================================
// THE SHARED POPULATION — open items, and their identifiers
// ===========================================================================
function openItems(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const items = [];
  lines.forEach((line, i) => {
    if (!/^- \[ \] /.test(line)) return;
    const bare = line.replace(/\*\*/g, "");
    let m = bare.match(/^- \[ \] (\d+\.\d+[a-z]?)\b/);
    if (!m) {
      for (let j = i - 1; j >= 0 && j > i - 6; j--) {
        const h = lines[j].match(/^#{2,4} (\d+\.\d+[a-z]?) —/);
        if (h) { m = [null, h[1]]; break; }
      }
    }
    items.push({ id: m ? m[1] : null, line: i + 1 });
  });
  return { items, lines };
}

// ===========================================================================
// METHOD 1 — THE COMMIT-GREP SCOPE, pinned
// ===========================================================================
// ONE `git log` over everything reachable from HEAD, then match in JS. This is
// deliberately not 66 separate `git log --grep` calls: that shape is what made
// "534" ambiguous between a unique count and a summed one.
//
// A commit NAMES an item when its message contains the id bounded on both sides
// by something that is not a digit and not a dot — so `9.11` does not match
// inside `9.110`, and `1.3` does not match inside `11.3` (`gotchas.md` 89).
// Each commit is counted ONCE however many items it names.
// THE BOUNDARY RULE, lifted out of `commitScope` so section 4 exercises THE SAME
// CODE the sweep uses. It was inline, and `PIN_CANARY=scope` therefore never
// reached the boundary assertion: the sabotage moves the commit count UPWARD, the
// only count assertion is a monotonic floor, and the whole run went GREEN under
// sabotage. **Found by re-running both canaries after changing the floor, not by
// reading** — a canary stops biting silently when the assertion it was aimed at
// moves out from under it.
const bound = (id) =>
  CANARY === "scope"
    ? new RegExp(id.replace(".", "\\."))                            // SABOTAGE: unbounded
    : new RegExp(`(^|[^0-9.])${id.replace(".", "\\.")}([^0-9.]|$)`);

function commitScope(ids) {
  const raw = sh(`git log --format=%H%x1f%s%x1f%b%x1e`);
  const commits = raw.split("\x1e").map((c) => c.trim()).filter(Boolean).map((c) => {
    const [sha, subj, body] = c.split("\x1f");
    return { sha, subj: subj || "", msg: `${subj || ""}\n${body || ""}` };
  });
  const naming = [];
  for (const c of commits) {
    const hit = ids.filter((id) => bound(id).test(c.msg));
    if (hit.length) naming.push({ ...c, items: hit });
  }
  return { commits, naming };
}

// ===========================================================================
// METHOD 2 — THE FRAGMENT RULE, pinned
// ===========================================================================
// A criterion zone runs from the first `Done when` to the end of the entry.
// A FRAGMENT is text enclosed by a straight or curly DOUBLE quote — backticks
// are NOT quotes here, because including them doubled the count (508 vs 276) —
// of 8 to 70 characters, containing at least one space, with no newline.
const FRAGMENT_RE = () => /["“]([^"“”\n]{8,70})["”]/g;
const NAMES_A_FILE = /[A-Za-z0-9_.\/-]+\.(jsx?|mjs|tsx?|css|sql|json|md)\b/;

function quoteSweep(roadmapText) {
  const { items, lines } = openItems(roadmapText);
  const zoneFor = (start) => {
    let end = lines.length;
    for (let j = start; j < lines.length; j++) {
      if (/^- \[[ x]\] /.test(lines[j]) || /^#{2,4} /.test(lines[j])) { end = j; break; }
    }
    return lines.slice(start - 1, end).join("\n");
  };
  let criteria = 0, fragments = 0;
  for (const it of items) {
    if (!it.id) continue;
    const z = zoneFor(it.line);
    const dw = z.indexOf("Done when");
    if (dw < 0) continue;
    const crit = z.slice(dw);
    if (!NAMES_A_FILE.test(crit)) continue;
    const re = FRAGMENT_RE();
    let m; let n = 0;
    while ((m = re.exec(crit))) {
      const keep = CANARY === "fragment" ? true : /\s/.test(m[1]); // SABOTAGE: drop the space clause
      if (keep) n++;
    }
    if (n) { criteria++; fragments += n; }
  }
  return { criteria, fragments, population: items.filter((i) => i.id).length };
}

// ===========================================================================
// DECLARED — measured 2026-10-02 at the commit recorded below.
// Move these in the SAME EDIT as whatever really changed, and say why.
// ===========================================================================
const TAKEN_AT = "31f6e32";          // re-taken 2026-10-07 (was 45e98bd, before that 3398470).
// PER-FIGURE REVISIONS ARE IN THE COMMENTS BELOW WHERE THEY DIFFER FROM THIS ONE:
// `quoteCriteria` and `quoteFragments` are both taken at `31f6e32`. `numberedOpenItems`
// is taken at the tree that adds ROADMAP 4.7, which is the commit this edit lands in --
// it reads 46 at `31f6e32` and 47 with 4.7 in. `docs/gotchas.md` 94 asks for the revision
// beside the number, and these two are no longer the same revision.

// ITEMS WITH NO COMMIT NAMING THEM, DECLARED BY NAME RATHER THAN COUNTED.
// This was `itemsWithACommit: 66` — a bare count — and it broke the moment 14.32
// was written, because a brand-new item legitimately has no commit until its
// first one lands. **A count there churns on every commit, which is the
// red-by-default fault `gotchas.md` 95 records about `commitsNamingAnItem`.**
// A NAMED list cannot drift silently and says which item, not how many:
// `DECISIONS.md`'s declared-expected-failures pattern. An item leaving this list
// is ordinary progress; one arriving uninvited is the finding.
// Empty as of 2026-10-02: **every numbered open item is now named by at least one
// commit.** It held `14.32` for the minutes between writing that item and
// committing it, and emptied the moment the commit message mentioned the number —
// which is the list behaving as intended rather than a figure needing a nudge.
// **An item arriving here uninvited is the finding**: something in the backlog
// that no commit has ever mentioned, and therefore invisible to every sweep that
// keys on the item number (`tests/every-open-item-is-citable.test.mjs`).
const NO_COMMIT_YET = [];

const DECLARED = {
  // 68 after 14.33, the parked figure-pinning item. Moved in the same edit as
  // that item, per this file's own rule.
  // 68 -> 47, 2026-10-06: items were ticked and left the open population (the count equals `grep -c '^- [ ]' ROADMAP.md`
  // at the same revision, which is the cross-check). Moved in the same edit as the re-measurement, per this file's own rule.
  //
  // 47 -> 46 -> 47, 2026-10-07, AND THE VALUE IS UNCHANGED WHILE THE POPULATION IS NOT.
  // THIS IS THE ENTRY TO READ BEFORE TRUSTING THIS NUMBER AGAIN.
  //
  // The run was RED when this sitting opened: 46 found against 47 declared. Measured
  // per revision with `git show <c>:ROADMAP.md | grep -c '^- [ ]'`:
  //
  //     45e98bd  47   <- where 47 was taken
  //     1b97ac3  47       7.17 ticked
  //     cbc144a  46   <- 14.10 ticked; the whole -1 is here and nowhere else
  //     2c0308a  46
  //     31f6e32  46
  //     + ROADMAP 4.7 (this commit)  47
  //
  // 47 was NOT wrong because of two ticks. `1b97ac3` (7.17) is an ANCESTOR of `45e98bd`
  // -- `git merge-base --is-ancestor 1b97ac3 45e98bd` exits 0 -- so 7.17's tick was
  // already inside the declared 47 and never moved it. Only `cbc144a` (14.10) did.
  // Recorded as measured rather than as handed over, which is `docs/gotchas.md` 93:
  // the fault there was a correct measurement being bent to agree with an assertion.
  //
  // AND THE PART THAT MATTERS MORE THAN THE ARITHMETIC: adding 4.7 puts the live count
  // back to 47, so this equality would have gone green TODAY WITH THE CONSTANT NEVER
  // TOUCHED -- right value, wrong population, and nothing anywhere to say so. A
  // declared count can be correct by coincidence, and the only defence is the trail
  // above. If this number ever matches without you knowing which commit last moved it,
  // it is a memory and not a measurement.
  //
  // 47 -> 48, 2026-10-07, fourth sitting of the day: ROADMAP 9.18 filed (the
  // System health tab's 400). One item in, nothing out, so this one is the
  // simple case for once -- which is worth saying, because the three moves
  // above were all two things cancelling and a reader who skims could take
  // "+1" as the normal shape.
    // 47 -> 48, 2026-10-08, and it is NOT this edit's: the other session filed
  // ROADMAP 9.19 at `5396f86` — the tab scrim being 40px taller than the reserve,
  // handed up by this lane earlier the same evening. Recorded as theirs rather
  // than absorbed, the way the fragments ledger above splits its legs.
  // 48 -> 49, 2026-10-08, and it is NOT this edit's: the other session filed
  // ROADMAP 9.20 at `37471cf` — a receipt can be attached and never seen again,
  // which this lane handed up while pressing 0.11 slice 5. Theirs, recorded as
  // theirs.
  numberedOpenItems: 49,
  // 37 criteria / 276 fragments. The prose sweep's criteria figure was 36 and
  // reproduced exactly at its own revision; 37 is 36 plus 14.31. Its fragment
  // figure was 247 and does not reproduce under any faithful reading.
  // 37 -> 32, 2026-10-06: the ticked items' criteria left the population with them.
  // UNCHANGED at 32, re-taken 2026-10-07 at `31f6e32` and again with 4.7 in the tree.
  // Stated rather than left silent: a figure that did not move is evidence only if
  // somebody re-took it, and this one sits between two that both moved today.
  //
  // 33 -> 32, 2026-10-07, third sitting of the day: lane A TICKED 7.8 (`8fcb154`),
  // and a ticked item's criteria leave the population with it. Measured at that
  // commit by running this file against `git show 8fcb154:ROADMAP.md`: 32. So the
  // +1 the note below records and this -1 are two different items passing each
  // other, which is exactly why each move is written down rather than the number
  // being nudged to whatever the run returned.
  //
  // 32 -> 33, 2026-10-07, LATER THE SAME SITTING: ROADMAP 9.11e's write-up gave that
  // item's Done-when zone a filename, so 9.11e ENTERED this population. Before the
  // block its Done-when named no file at all ("a list names each screen with fixed
  // furniture and the check that hit-tests it"), and this figure counts only items
  // whose criteria name one. Moved in the same edit as the prose that moved it, which
  // is this file's own rule and the third time it has been applied today.
  //
  // 32 -> 33, 2026-10-07, fourth sitting: 9.18's Done-when names files, so that
  // item entered the criteria population. 0.11's slice 5 block did not move it:
  // 0.11 was already in the population.
  //
  // 33 -> 35, 2026-10-08: TWO items entered at once, and both were already open —
  // this is a population change, not a backlog change, which is why
  // `numberedOpenItems` did not move. **4.7**: its Done-when quoted no multi-word
  // fragment when the note three blocks up recorded it at "+0", and the build
  // write-up gave the zone a restated Done-when that does. **9.4**: its
  // re-verification block sits inside the same zone as its Done-when and names
  // `scripts/calendar-legible.mjs`, where before the zone named no file at all.
  // Both ends measured by running this file against a checkout of
  // `git show 2dc6064:ROADMAP.md` (33) and against this commit's tree (35).
  //
  // 35 -> 34, 2026-10-08: **9.4 TICKED.** A ticked item's criteria leave the
  // population with it, which this constant's own trail already records happening
  // twice (7.8 on 2026-10-07, and the 37 -> 32 move on 2026-10-06). Measured at
  // both ends against `git show 639ae24:ROADMAP.md` (35) and this tree (34).
  quoteCriteria: 34,
  // 276 -> 280: ROADMAP 3.1 gained a Done-when zone quoting four more strings
  // (the Lane A render spec). Moved in the same edit as that prose.
  // 280 -> 254, 2026-10-06: the same, and the same caveat that this figure is a count of this method, not of the prose sweep's.
  //
  // 254 -> 277, 2026-10-07. ALSO RED WHEN THIS SITTING OPENED, AND NOT MENTIONED WHEN
  // THE 46/47 RED WAS HANDED OVER -- which is the reason to re-take every figure in a
  // declaration and not only the one somebody noticed. Attributed commit by commit,
  // each reading taken by running THIS FILE against `git show <c>:ROADMAP.md`:
  //
  //     45e98bd  254  <- where 254 was taken
  //     2a357c8  254
  //     7a4f757  261  +7   ROADMAP 4.1 fresh-eyes review
  //     cbc144a  259  -2   14.10 ticked; its criteria left the population with it
  //     24d32f0  260  +1   14.34 re-measured
  //     2c0308a  273  +13  ROADMAP 4.1 gaps 1, 2, 3 and 7
  //     31f6e32  277  +4   ROADMAP 7.8's clause (b)(c)(d) write-up
  //     + ROADMAP 4.7       277  +0  -- its Done-when quotes no multi-word fragment
  //
  // So 19 of the 23 predate this sitting and 4 are its own. Written out because the
  // tempting write-up was "my block moved it", and the measurement says that was a
  // sixth of it.
  //
  // 277 -> 279, 2026-10-07, LATER THE SAME SITTING: the same 9.11e block, the same
  // cause as `quoteCriteria` above -- its Done-when zone now names files and quotes
  // two multi-word fragments. Both figures moved together because they are two
  // readings of one population, and a sitting that moved one and not the other would
  // have left this file red for a reason nobody could reconstruct.
  //
  // 279 -> 274, 2026-10-07, third sitting. Attributed by running this file against
  // `git show <c>:ROADMAP.md`, the same way as the block above:
  //
  //     5e5a54d  279
  //     b561c11  279   (lane A's 4.1 work moved neither figure)
  //     8fcb154  272   -7  lane A TICKED 7.8; its Done-when zone left the population
  //     + ROADMAP 9.17 and the 9.11e back-office block   274   +2
  //
  // **A net -5 that is a -7 and a +2**, and the bare number would have read as five
  // fragments going missing. Two items moved in opposite directions inside one
  // working tree, which is the ordinary case in a two-lane repo and the reason this
  // constant carries a trail instead of a value.
  //
  // 274 -> 290, 2026-10-07, fourth sitting. +16, from two items in one working
  // tree: ROADMAP 9.18, and 0.11's slice 5 write-up, whose Done-when zone now
  // quotes the receipts contract. Not attributed commit by commit this time,
  // and that is stated rather than implied: both additions are in the SAME
  // uncommitted tree, so there is no revision between them to measure at. The
  // two ends are `git show 8a2292b:ROADMAP.md` (274) and this commit (290).
  //
  // 290 -> 294, 2026-10-08. +4, the fragments carried in by the two items that
  // entered the criteria population in the same edit (see `quoteCriteria` above):
  // ROADMAP 4.7's restated Done-when and 9.4's re-verification block. **The whole
  // move is those two items** — no other Done-when zone was touched. Both ends
  // measured the way this file asks: `git show 2dc6064:ROADMAP.md` reads 290, and
  // this commit's tree reads 294. Worth one line because +4 is small enough to
  // look like drift and is not: it is two items arriving, and the criteria figure
  // beside it moving by exactly 2 is the cross-check.
  //
  // 294 -> 296, 2026-10-08, same sitting, +2: ROADMAP 9.4's second write-up, after
  // the manager rejected the frames and the padding cells were given a class. All of
  // it lands inside 9.4's existing Done-when zone, so `quoteCriteria` does NOT move
  // this time — 9.4 entered the population two commits ago and cannot enter twice.
  // **A criteria figure that holds while the fragments figure moves is the ordinary
  // case for a second pass on one item**, and it is written down because the pair
  // moving together is what the note above used as its own cross-check.
  //
  // 296 -> 299, 2026-10-08. **TWO LEGS IN OPPOSITE DIRECTIONS AND ONLY ONE OF THEM
  // IS THIS EDIT'S**, recorded separately because folding them into a single "+3"
  // would credit this commit with somebody else's four:
  //
  //     2dc6064 + this lane's 9.4 note   296   <- where 296 was taken
  //     639ae24                          300   +4  the OTHER session's 9.14 write-up
  //     + 9.4 TICKED (this commit)       299   -1  9.4 leaves the open population
  //
  // So 296 was already stale at HEAD before this edit existed, and the honest
  // ledger is +4 theirs, -1 mine. Both ends measured the way this file asks, by
  // running it against a checkout of `git show 639ae24:ROADMAP.md` (300) and
  // against this tree (299).
  //
  // 299 -> 300, 2026-10-08, +1: this lane's 9.11e back-office write-up. One
  // fragment, inside 9.11e's existing Done-when zone, so `quoteCriteria` holds at
  // 34 — 9.11e was already in the population. Measured against
  // `git show 34f93eb:ROADMAP.md` (299) and this tree (300).
  //
  // 300 -> 305, 2026-10-08. **TWO LEGS AGAIN, AND THEY ARE NOT BOTH THIS LANE'S:**
  //
  //     c750236                          300   <- where 300 was taken
  //     fc524da                          303   +3  the OTHER session's 2.15a write-up
  //     + 0.11 slice 5 app half          305   +2  this commit
  //
  // `quoteCriteria` holds at 34: 0.11 and 2.15a were both already in the
  // population, so neither write-up could enter it twice. Both ends measured by
  // running this file against a checkout of `git show fc524da:ROADMAP.md` (303)
  // and against this tree (305). **This constant has now been overtaken by the
  // other lane three times in one evening**, which is not a fault in either
  // lane — it is what a shared document looks like with two sessions in it, and
  // it is the reason this trail records an owner per leg instead of a net.
  //
  // 305 -> 319, 2026-10-08, and ELEVEN OF THE FOURTEEN ARE NOT THIS LANE'S:
  //
  //     e246714                          305   <- where 305 was taken
  //     b109170                          316   +11  the OTHER session's cold read of the two money items
  //     + 0.11 re-framing and 2.15a      319   +3   this commit
  //
  // Fourth time in one evening this constant has been overtaken between a
  // measurement and its commit. The criteria figure holds at 34: 0.11 and 2.15a were
  // both already in the population. Both ends measured against
  // `git show b109170:ROADMAP.md` (316) and this tree (319).
  //
  // 319 -> 323, 2026-10-08, +4, and all four are this lane's: the 4.7 and 6.4
  // write-ups for the two money bugs the OTHER lane found by reading them cold.
  // `quoteCriteria` holds at 34 — both items were already in the population.
  // Measured against `git show 96d7eb6:ROADMAP.md` (319) and this tree (323).
  quoteFragments: 323,
};
// A floor, not an equality: guards the PARSER, never the backlog.
const ITEM_FLOOR = 40;
const COMMIT_FLOOR = 100;

// `commitsNamingAnItem` IS NOT A DECLARED EQUALITY, AND THE FIRST VERSION OF THIS
// FILE HAD IT AS ONE — which was wrong, and running the check is what showed it.
// It was declared at 339 and was 340 within the hour, because the very commit
// that landed this file mentions an item number. **A figure that increments every
// time anybody commits is red by default, which is the "red forever" fault
// `every-open-item-is-citable` rejects by name.**
//
// Commits only accumulate, so the honest assertion is MONOTONIC: it must never
// DECREASE. A drop means history was rewritten or the scope regex broke — both
// worth a red — while ordinary work moves it up and says nothing.
//
// The pinned VALUE still matters and is reported every run; what changed is that
// its drift is no longer a failure. 339 was the first take, 2026-10-02 @ 3398470.
const COMMITS_NAMING_FLOOR = 339;

test("the two sweep methods are pinned, not described", async (t) => {
  const roadmap = readFileSync("ROADMAP.md", "utf8");
  const { items } = openItems(roadmap);
  const ids = items.filter((i) => i.id).map((i) => i.id);

  await t.test("0 · the methods have subjects", () => {
    assert.ok(
      ids.length >= ITEM_FLOOR,
      `parsed ${ids.length} numbered open items, floor ${ITEM_FLOOR}. Few or zero `
      + "is a BROKEN PARSER, not a cleared backlog, and every count below would "
      + "then be vacuously small.",
    );
  });

  const scope = commitScope(ids);
  const qs = quoteSweep(roadmap);

  await t.test("1 · the commit scope reaches the history", () => {
    assert.ok(
      scope.commits.length >= COMMIT_FLOOR,
      `git log returned ${scope.commits.length} commits, floor ${COMMIT_FLOOR}. `
      + "A truncated log makes every figure below meaningless.",
    );
  });

  await t.test("2 · REPORT — the pinned figures, re-takeable by running this file", () => {
    const got = {
      numberedOpenItems: ids.length,
      quoteCriteria: qs.criteria,
      quoteFragments: qs.fragments,
    };
    console.log(`\n   PINNED SWEEP FIGURES — taken by this file, declared at ${TAKEN_AT}`);
    for (const k of Object.keys(DECLARED)) {
      const flag = got[k] === DECLARED[k] ? "" : `   <-- MOVED from ${DECLARED[k]}`;
      console.log(`     ${k.padEnd(22)} ${String(got[k]).padStart(5)}${flag}`);
    }
    console.log(`     commitsNamingAnItem    ${String(scope.naming.length).padStart(5)}   (floor ${COMMITS_NAMING_FLOOR}, monotonic — not an equality)`);
    console.log(`     (canary: ${CANARY || "off"})`);
    assert.ok(true);
  });

  await t.test("3b · every numbered open item is named by a commit, except the declared ones", () => {
    const named = new Set(scope.naming.flatMap((c) => c.items));
    // AN ITEM THAT IS NOT ITSELF COMMITTED YET IS NEW BY DEFINITION, and asking
    // for a commit that names it is asking for one that cannot exist. Derived
    // from the uncommitted ROADMAP diff rather than declared, because the
    // declared version meant adding each new item to a list and removing it on
    // the very next commit — the churn `gotchas.md` 95 records about a figure
    // that moves every time anybody commits. NO_COMMIT_YET stays for a genuinely
    // long-lived exception; this handles the ordinary case with no upkeep.
    const pending = sh("git diff -- ROADMAP.md") + sh("git diff --cached -- ROADMAP.md");
    const brandNew = ids.filter((id) =>
      new RegExp(`^\\+.*\\b${id.replace(".", "\\.")}\\b`, "m").test(pending));
    const without = ids
      .filter((id) => !named.has(id) && !brandNew.includes(id))
      .sort();
    assert.deepEqual(
      without, [...NO_COMMIT_YET].sort(),
      "the set of open items that NO commit names has changed. **Declared by name "
      + "rather than counted**, because a count churns on every commit: an item "
      + "written this minute legitimately has no commit until its first one lands, "
      + "and that is not a fault. An item LEAVING this list is ordinary progress — "
      + "take it out of NO_COMMIT_YET. An item ARRIVING uninvited means something is "
      + "in the backlog that no commit has ever mentioned, which is what this asks.",
    );
  });

  await t.test("3a · commits naming an item never DECREASES", () => {
    assert.ok(
      scope.naming.length >= COMMITS_NAMING_FLOOR,
      `${scope.naming.length} commits name an open item, floor ${COMMITS_NAMING_FLOOR}. `
      + "Commits only accumulate, so a DROP means history was rewritten or the "
      + "boundary regex stopped matching. Ordinary work moves this up and is not a "
      + "failure — which is why it is a floor and not an equality.",
    );
  });

  await t.test("3 · the declared figures still hold", () => {
    const got = {
      numberedOpenItems: ids.length,
      quoteCriteria: qs.criteria,
      quoteFragments: qs.fragments,
    };
    assert.deepEqual(
      got, DECLARED,
      "a pinned figure moved. This is NOT automatically a fault — adding an item "
      + "or a commit moves these legitimately. Move the constant in the SAME EDIT "
      + "as the change and say why, the way CROSS_FILE_OVERLAP is moved. What must "
      + "never happen is the constant being updated to whatever the run returned "
      + "without anybody asking what moved.",
    );
  });

  await t.test("4 · the PRODUCTION boundary rule keeps 1.3 out of 11.3", () => {
    const re = bound("1.3");   // the same function the sweep calls, not a copy
    assert.equal(
      re.test("11.3 — something"), false,
      "1.3 must not match inside 11.3 (gotchas 89). **Under PIN_CANARY=scope this "
      + "is the assertion that must fail**: the sabotage widens the commit count "
      + "UPWARD, which a monotonic floor cannot see, so the boundary rule is the "
      + "only place that sabotage can be caught. It was caught here only after the "
      + "rule was lifted out of commitScope — while it was inline, this test "
      + "exercised a copy and the sabotaged run passed 7/0.",
    );
    assert.equal(re.test("fixes 1.3 today"), true, "1.3 must match as its own token");
    assert.equal(re.test("1.30 is different"), false, "1.3 must not match inside 1.30");
  });
});
