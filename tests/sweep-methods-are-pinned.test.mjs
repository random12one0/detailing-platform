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

// This runs on Windows as well as Unix. The former `bash -c` wrapper was not
// an implementation detail: where bash is absent, its caught launch error
// became an empty history, and the gate accused every open item instead of
// naming the missing executable.
const git = (args) => {
  try { return execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 }); }
  catch (e) {
    // A FAILED LAUNCH IS NOT AN EMPTY ANSWER -- `gotchas.md` 114, whose own first
    // fix changed only WHICH executable was wrapped in this fallback and left the
    // fallback itself in place. Proved by substituting a missing executable: the
    // run reddened with "0 commits name an open item, floor 339", which reads as
    // a rewritten history or a broken regex and says nothing about git. If the
    // process never ran, `status` is null/undefined; say so instead of measuring.
    if (e.status === undefined || e.status === null) {
      throw new Error(
        `git could not RUN (${e.code || e.message}). This is a launch failure, ` +
        `not an empty history -- do not read the figures below it.`
      );
    }
    return e.stdout || "";
  }
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
  const raw = git(["log", "--format=%H%x1f%s%x1f%b%x1e"]);
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
  // 49 -> 48, 2026-10-08: the other lane filed one (50) and this edit TICKED
  // TWO — 9.7 and 9.11, both on the manager's own press. 9.23 was filed `[x]`
  // and so was never an open item. Net -1, and the legs are what matter.
  // 48 -> 47, 2026-10-08, AND IT IS NOT THIS EDIT'S: `0914a14` ticked ROADMAP
  // 0.4 (the legal pages) and did not move this constant, so **the suite was
  // already red when this sitting opened** — 47 found against 48 declared,
  // before anything here was touched. Measured per revision with
  // `git show <c>:ROADMAP.md | grep -c '^- [ ]'`: `c07f8a1` 48, `0914a14` 47,
  // and the whole -1 is that one tick. 3.1's own work this sitting ticked
  // NOTHING, so it contributes 0 to this figure. Recorded as theirs rather than
  // absorbed silently, the way the fragments ledger below splits its legs.
  // 47 -> 53, 2026-10-09, SUPERVISOR, AND THE SIX ARE NOT ALL MINE — the split
  // matters more than the total. **Five are items this edit creates**: `0.4g`
  // (the build-start notice can be sent twice and the recorded refund date is
  // decided by a race) and `3.1a`-`3.1d` (Andrew's four mail-log details, cut
  // into dispatchable slices after 3.1 was killed twice at ~50 minutes).
  // **The sixth was ALREADY RED AT HEAD and is nobody's new work**: this
  // file's own `openItems` reads **48** at `a07a2dc` against the 47 declared
  // above, because that commit UNTICKED 0.4 and put it back in the open
  // population without moving this constant. Measured with this file's own
  // parser over `git show a07a2dc:ROADMAP.md`, not with a looser grep — a bare
  // `grep -c '^- [ ]'` gives a different population because `openItems` also
  // takes an id from a heading within five lines.
  // **So the ledger is 47 declared -> 48 actual at HEAD -> 53 with this edit's
  // five.** Recorded as two legs rather than absorbed into one number, which
  // is what the assertion message asks for and what the fragments ledger below
  // already does. **The same re-opening left `CROSS_FILE_OVERLAP` stale by one
  // in `every-open-item-is-citable` too** — one re-tick, two declared figures,
  // neither moved, and neither test was a belt gate. One is now.
  //
  // 53 -> 58, 2026-10-09, ROADMAP 0.11a. TWO LEGS, BOTH MEASURED PER REVISION,
  // and only one of them is this edit's:
  //
  //   HEAD `dcf79dc`  54   <- 53 declared, so already RED on arrival
  //   worktree        58
  //
  // Taken by lifting this file's own `openItems` out and running it on
  // `git show HEAD:ROADMAP.md` and on the working tree, then DIFFING THE ID
  // SETS rather than the counts: the four new ids are exactly `0.11a`, `0.11b`,
  // `0.11c`, `0.11d` and nothing else moved. **The inherited +1 is the 3.1
  // slicing**, recorded in the `quoteFragments` ledger below by the session
  // that found it red and deliberately left it for whoever caused it. Both legs
  // now have a named cause, which is what this file asks for, so the constant
  // moves to the whole 58 rather than to 57 — a partial move would report a
  // population that is not the one in the file.
  // **`quoteCriteria` is STILL RED at 36 against 37 and is NOT touched here**,
  // for that same session's reason: its cause is the 3.1 slicing, not this edit,
  // and a constant moved to whatever the run returned is this file's own
  // forbidden move.
  // 58 -> 57, 2026-10-09, SUPERVISOR. **One cause, one commit, and it is not
  // mine:** `ccc1e9c` ticked `0.11a`, so one numbered open item left the
  // population. Nothing else moved — `git show HEAD:ROADMAP.md | grep -cE
  // "^- \[ \] \*{0,2}[0-9]"` and the same against the working tree both answer
  // 52 raw, and this method's own count answers 57 at both. The session that
  // closed `0.11a` left this red; it is moved here with the cause named rather
  // than left to look like drift.
  numberedOpenItems: 57,
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
  //
  // 34 -> 35, 2026-10-08, and it is NOT this edit's: the other lane's 2.15a
  // done-when write-up (`868d23f`) gave that item's Done-when zone a quoted
  // fragment, so 2.15a entered the criteria population. This commit's own note
  // lands inside 4.7's zone, which was already in it.
  //
  // 35 -> 34, 2026-10-08, same cause and NOT this edit's: the other lane ticked
  // 2.15a at `ca6065f`, so that item's criteria left the population with it —
  // the sixth time this constant has moved for exactly that reason. This commit's
  // own note lands inside 9.11's zone, which was already in the population.
  //
  // 34 -> 33, 2026-10-08: net -1 across two legs. The other lane's work took it
  // to 35; ticking 9.7 and 9.11 took two items' criteria out, and 9.23 enters
  // nothing because it is filed ticked. Seventh move for the same reason.
  // 33 -> 34, 2026-10-08, the supervisor's pass, and for ONCE not a tick:
  // **0.13 ENTERS the population.** `NAMES_A_FILE` was already true for its zone
  // (it has quoted `TEXTING.md` since 2026-09-25) but the zone held ZERO
  // double-quoted fragments, so `if (n)` kept it out. The supervisor's note on
  // 0.13 adds two (named at `quoteFragments` below), so the item crosses the
  // threshold. Eighth move, first one caused by prose arriving rather than an
  // item leaving. Measured both sides: `git show HEAD:ROADMAP.md` in place gives
  // 8 pass / 0 fail at 33/318, and the working copy — 8 added lines, ROADMAP.md
  // only, `git diff --numstat` — gives 34/320.
  // 34 -> 35, 2026-10-08, ROADMAP 0.4's round: **0.4 ENTERS the population, and it
  // enters on `NAMES_A_FILE` rather than on quotes.** Its Done-when zone held
  // double-quoted fragments already (*"every promise"*, twice) but named no file
  // at all, so `NAMES_A_FILE` was false and `continue` kept the whole item out.
  // The write-up appended under that Done-when names `FOR-ANDREW.md`,
  // `lib/customer-export.js`, `lib/photo-export.js` and others, so the zone
  // crosses the threshold and **all 21 of its fragments arrive at once** — which
  // is why `quoteFragments` moves by 21 on a single-item change. Second move
  // caused by prose arriving rather than an item leaving (the first was 0.13).
  // Measured both ends by running this file against `git show HEAD:ROADMAP.md`
  // in place (34/320, 8 pass / 0 fail) and against this tree (35/341), with the
  // working copy saved and restored byte-for-byte around it — `cmp -s`, not
  // `git checkout` (`docs/gotchas.md` 97).
  // 35 -> 36, 2026-10-08, ROADMAP 7.10's round: **prose arriving, not an item
  // leaving.** 7.10 had a `Done when` zone already, but it named no file, so
  // `NAMES_A_FILE` was false and the whole item was skipped. The write-up
  // appended under it names `app/public/ex3/index.html`,
  // `docs/tenant-sites/x-ballantyne.html`, `FOR-ANDREW.md`,
  // `scripts/example-shots-check.mjs` and others, so the zone crosses the
  // threshold and 7.10 enters the criteria population whole. Same cause and
  // same shape as 0.13 and 3.1 above. `numberedOpenItems` does not move: 7.10
  // was already numbered, already open, and is still open — its third clause
  // needs a ruling from Andrew.
  // 36 -> 35, 2026-10-08, SAME CAUSE AND SAME COMMIT AS `numberedOpenItems`
  // above: `0914a14` ticked ROADMAP 0.4, and a ticked item's criteria leave the
  // population with it. Already red on arrival; 3.1's block this sitting adds
  // no Done-when of its own, so it contributes 0 here too.
  // 35 -> 37, 2026-10-09, SUPERVISOR. Two legs, and NEITHER is a new Done-when
  // of mine: inserting an item ENDS the previous entry's criterion zone, which
  // `zoneFor` runs from an item's line to the next `- [ ]` or heading. `0.4g`
  // lands inside what was 0.4's zone and `3.1a` at the foot of 3.1's, so both
  // parents' zones are re-cut and the five new entries bring their own. This is
  // the same mechanic the 254 -> 277 note below describes, seen from the other
  // side: a figure here moves when an entry's BOUNDARY moves, not only when its
  // prose does. Re-taken at this edit's tree with the canary off.
  // 37 -> 36, 2026-10-09, SUPERVISOR. **The same single cause as
  // `numberedOpenItems` directly above:** `ccc1e9c` ticked `0.11a`, and a
  // closed item takes its Done-when zone out of the population with it. One
  // item left, both legs moved by exactly one, and the previous note above
  // already predicted this figure would have to move once its cause was named
  // — it had been left red on purpose, which is the right call and is why this
  // is a move with a reason rather than a fit to the output.
  quoteCriteria: 36,
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
  //
  // 323 -> 328, 2026-10-08, and FOUR OF THE FIVE ARE THE OTHER LANE'S:
  //
  //     e20ed1e                          323   <- where 323 was taken
  //     b4f1d70 + 868d23f                327   +4  FOR-ANDREW's ten-step list and 2.15a's done-when
  //     + 4.7's 3+1 note (this commit)   328   +1
  //
  // Both ends measured against `git show 868d23f:ROADMAP.md` (327) and this
  // tree (328). Fifth time in two sittings this constant has been overtaken
  // between a measurement and its commit.
  //
  // 328 -> 318, 2026-10-08, and this is the first DOWN move in the trail:
  //
  //     1261425                          328   <- where 328 was taken
  //     ca6065f                          316   -12  the OTHER lane TICKED 2.15a; a ticked
  //                                             item's Done-when zone leaves the population
  //     + 9.11's guide-red note          318   +2   this commit
  //
  // **A FALL IS NOT A LOSS HERE** — it is the ordinary consequence of an item
  // closing, which this constant's `quoteCriteria` twin has recorded four times.
  // Both ends measured against `git show ca6065f:ROADMAP.md` (316) and this tree
  // (318).
  //
  // 318 -> 315, 2026-10-08. Two legs, and the second is the biggest single move
  // this constant has made:
  //
  //     6f3b4f8                          318   <- where 318 was taken
  //     (the other lane's work since)     321   +3  theirs
  //     + 9.7 and 9.11 TICKED             315   -6  two items' Done-when zones
  //                                             left the population together
  //
  // 9.23 is filed `[x]` in the same edit and therefore adds nothing: a ticked
  // item is not in this population at all, which is the same rule the -6 is.
  // Measured against `git show <HEAD>:ROADMAP.md` (321) and this tree (315).
  //
  // 315 -> 317, 2026-10-08, in the same edit as ROADMAP 0.11's slice 4 note, and
  // **the two new fragments are named rather than counted** because a +2 with no
  // names is the thing this constant exists to stop:
  //
  //     "[object Object]"                     what a wrong destructure of
  //                                           uploadBusinessPhoto now saves into a
  //                                           business's logo_url
  //     "the line to sabotage is not unique"  the message a canary printed when
  //                                           readMediaStart re-spelled two of
  //                                           tests/photo-door.test.mjs's targets
  //
  // 0.11 is open and has a `Done when`, so anything appended to its entry is in
  // this population. Nothing closed and nothing else moved: `quoteCriteria` and
  // `numberedOpenItems` are unchanged, which is what a note on an EXISTING item
  // should do. Measured against `git show HEAD:ROADMAP.md` (315) and this tree (317).
  //
  // 317 -> 318, same sitting, same edit, and the one new fragment is again named:
  //
  //     "which is the commit this note lands in"   the clause that note had to
  //                                               correct, because another
  //                                               session's checkpoint committed
  //                                               the work before it did
  //
  // The second quotation in that correction — the other session's commit message —
  // wraps across a line in the markdown, and the fragment rule excludes a newline,
  // so it is not in this population. **Written out because +1 where +2 looks right
  // is exactly the gap a bare count hides.** Measured on this tree (318).
  // 318 -> 320, 2026-10-08, the supervisor's pass. THE TWO FRAGMENTS, NAMED
  // RATHER THAN COUNTED, both inside 0.13's Done-when zone and both added by the
  // note recording why the belt's planner dispatched a queued item:
  //
  //     "0.13 is fully specified and finishable today"   the planner's own reason, quoted from belt/log.md
  //     "The belt commits nothing it did not write"      the DECISIONS.md section the note cites
  //
  // Nothing else in that edit is countable here: `0.14(DEFERRED ON PURPOSE)` and
  // the new `NEEDS ANDREW:` phrase are backticked or bold, not double-quoted, and
  // `FRAGMENT_RE` only takes `"…"`. Moved in the same edit as the prose, and the
  // delta attributed by running this file against `git show HEAD:ROADMAP.md`
  // first (33/318, green) rather than by accepting what the run returned.
  // 320 -> 341, 2026-10-08, ROADMAP 0.4's round. **+21 from ONE item, because
  // 0.4 entered the criteria population whole** — see `quoteCriteria` above; none
  // of these is a fragment added to an item already being counted. Named rather
  // than counted, which is this constant's own rule, and **the two that are
  // parser artifacts rather than quotations are named as such instead of being
  // quietly included in a total**:
  //
  //     "every promise" (x2)                        already in the zone at HEAD; they
  //                                                 only start counting now
  //     "NOTE - The legal pages name you personally"  the FOR-ANDREW section carrying
  //                                                 Andrew's answer on the entity
  //     "doesn't a DBA cost money"                   Andrew's words, 2026-09-20
  //     "WHOLE AGREEMENT"                            what the terms call themselves
  //     "Sales tax" / "What you pay" / "Ending it" (x2) / "Done when" / "DONE WHEN"
  //                                                 clause and section names
  //     "cannot be changed underneath you"           the clause a tax line reads as
  //                                                 a breach of
  //     "as cancelling"                              the British spelling found live
  //     "by asking" / "You export them and go" / "and your photos are yours"
  //                                                 the three export promises
  //     "Export my customers" / "Export my photos"   the two buttons behind them
  //     "Do you own a domain?"                       the brief question behind the
  //                                                 one hole in the domain promise
  //
  //     "* says **"                                  ARTIFACT: FRAGMENT_RE pairs the
  //                                                 closing quote of one italicised
  //                                                 quotation with the opening quote
  //                                                 of the next, across the markdown
  //                                                 emphasis between them
  //     " -- supabase/functions | grep -vE "         ARTIFACT: the same pairing inside
  //                                                 a runnable shell command in a
  //                                                 fence, between `"fetch("` and the
  //                                                 next quoted argument
  //
  // So 19 are real quotations and 2 are the regex meeting markdown and a shell
  // line. **Said out loud because a +21 with no names is exactly what this
  // constant exists to stop**, and because a reader re-deriving it by hand would
  // count 19 and think the pin had drifted. Delta attributed by running this file
  // against `git show HEAD:ROADMAP.md` first (34/320, green) rather than by
  // accepting what the run returned.
  //
  // 341 -> 350, 2026-10-08, in the same edit as ROADMAP 2.15's scope correction.
  // **+9, and all nine are in 2.15's own `Done when` zone** — measured by running
  // this file's own quote sweep over that one item at `git show HEAD:ROADMAP.md`
  // (2) and this tree (11), not by accepting what the run returned. The amended
  // criterion names four steps where the old one named two, and it quotes each
  // box the phone walk now has to be tapped on, which is where eight of the nine
  // come from:
  //
  //     "What are you bringing?"    the vehicle step's two boxes, neither of
  //     "Year or estimate"          which the old criterion knew existed
  //     "Where should we come?"     the address box (step 4, already covered)
  //     "Your name"                 the details step, already covered
  //     "Anything we should know?"  the notes textarea on that step, MISSED by
  //                                 the old criterion's "name, phone and email"
  //     "Have a code?"              the review step's promo box, the tightest
  //                                 box-to-bar gap in the flow and not covered
  //     "21px of Light, Moderate, Heavy, Extreme"   quoted from this item's own
  //     "landing on the footer"                     2026-09-25 fault table, to
  //                                 show the one reproduced fault sat on a step
  //                                 the criterion did not name
  //
  // The ninth is the amended criterion's closing phrase, "neither happened, at
  // all four". `quoteCriteria` does NOT move: 2.15's `Done when` was already in
  // that population with 2 fragments, so this adds fragments to an existing
  // criterion rather than a new one — which is the shape this pair should have
  // and is the cross-check that the move is what it claims.
  //
  // **ONE OF THE NINE ONLY COUNTS BECAUSE THE PROSE WAS REFLOWED, AND THAT IS
  // WORTH A LINE.** `FRAGMENT_RE`'s character class excludes the newline, so a
  // quotation wrapped
  // across two lines cannot match — and its closing quote then pairs with the
  // NEXT fragment's opening quote, so the sweep recorded `* and a real press *`
  // as a fragment while the real one beside it went uncounted. The count was 10
  // with a nonsense entry in it and is 11 with none. The regex is not wrong; a
  // quotation that spans a line break is simply invisible to it, and anybody
  // adding one here should keep each quotation on one line.
  //
  // 350 -> 357, 2026-10-08, in the same edit as ROADMAP 2.15's second pass.
  // **+7, all seven in 2.15's zone and all seven genuine quotations** — named
  // rather than totalled, and enumerated by running this file's own
  // `FRAGMENT_RE` over the added lines (`git diff ROADMAP.md | grep '^+'`)
  // rather than by accepting what the run returned:
  //
  //     "the two steps in the whole flow with a text box"   the walk's old scope,
  //                                 quoted as the thing that was wrong
  //     "What are you bringing?"            the three labels the walk was
  //     "Year or estimate"                  sending him to tap, each quoted
  //     "Anything we should know?"          beside
  //     "What are you bringing? (optional)" the string the screen actually
  //     "Year or estimate (optional)"       carries — a before/after table, so
  //     "Anything we should know? (optional)"  every row is two fragments
  //
  // `quoteCriteria` does NOT move and `numberedOpenItems` does not either: the
  // block adds fragments to 2.15's existing criterion and no new item.
  // **AND THE PREVIOUS ENTRY'S CLOSING WARNING EARNED ITS PLACE WITHIN A DAY.**
  // The first draft of that block wrapped the first quotation above across a
  // line break, so `FRAGMENT_RE` could not see it and the delta measured +6 for
  // seven quotations. Re-flowed to one line, which is what the line above asks
  // for; the +7 is the count with nothing invisible in it.
  // 357 -> 362, 2026-10-08, ROADMAP 3.1's round: **prose arriving, not an item
  // leaving.** The live-database block appended under 3.1's Done-when carries
  // eight double-quoted strings by `FRAGMENT_RE`'s own pattern -- the two `curl`
  // header strings, twice each, plus "businesses", "100 most recent.",
  // "bookingId" and "email_list" -- and FIVE of them land inside the zone this
  // method slices. Two of the block's other quotations are invisible for the
  // reasons already recorded above: one runs past 70 characters and one wraps
  // across a line break, which is the caveat the entry two above this one is
  // about. `quoteCriteria` does not move and neither does `numberedOpenItems`:
  // 3.1 was already in the population and nothing was ticked.
  // **Both ends measured by running THIS FILE, not by arithmetic**: green at 357
  // against `e063d8c` before the block was written, red at 362 after, with
  // ROADMAP.md the only file changed in between (`git diff --numstat ROADMAP.md`
  // -> 116 added, 0 removed).
  // 362 -> 382, 2026-10-08, and **THE SPLIT IS THE POINT: 18 OF THE 20 ARE NOT
  // THIS ROUND'S.** This constant was ALREADY RED on arrival. Measured, not
  // inferred: a detached worktree at `cfd8932` — the tip before 7.10's edit —
  // runs this file at **380 against a declared 362**, 1 failing subtest. So
  // `cfd8932` (4.1's decline write-up) moved it 362 -> 380 and did not move the
  // declaration; that session's own note recorded the gate as "red by exactly
  // ONE fragment that is not mine" at **363**, taken before its own block was
  // written, and the remaining 17 arrived with the block.
  // **7.10's own contribution is 2**, 380 -> 382: the resolution block quotes
  // *"the next action is a MEASUREMENT, not a build"* and the spec's
  // *"fail on a gate that has the fix and pass on one that does not"*, both
  // inside the zone this method slices. Its other quotations are invisible for
  // the reasons recorded above — over 70 characters, or wrapped across a line
  // break.
  // **It is moved to the true current figure rather than to 380 + 2 of my own**,
  // because an equality left red teaches the next session to walk past it, and
  // because the split above is what an audit actually needs: this edit absorbs
  // another round's 18 and says so by name rather than silently blessing them.
  // Both ends measured by running THIS FILE — 380 in the worktree at `cfd8932`,
  // 382 in this tree — with `ROADMAP.md` the only document changed between them
  // (`git diff --numstat ROADMAP.md` -> 147 added, 0 removed).
  // **382 -> 376, 2026-10-08, AND THE NET -6 IS THREE LEGS PULLING TWO WAYS, SO
  // THE NET IS THE LEAST INFORMATIVE THING ABOUT IT.** Each leg measured by
  // running THIS FILE at that tree, never inferred from a diff:
  //
  //     382   declared, taken at the 7.10 round above
  //     363   `0914a14` ticked ROADMAP 0.4, and the ticked item's quoted
  //           fragments left the population with it            (-19, not ours)
  //     373   `ed8d4ec`, 3.1's detailer-half build write-up     (+10)
  //     376   3.1's re-verification block, this edit            ( +3, ours)
  //
  // The -19 is the one that matters to a reader: **this constant was ALREADY RED
  // when the sitting opened** — 363 against a declared 382, with `ROADMAP.md`
  // clean at `0914a14`, which is how it was found at all. `ed8d4ec` then added
  // its block without moving the declaration either, so the red survived a
  // commit. Both are recorded as theirs rather than absorbed, the way this
  // ledger's earlier entries split their legs.
  //
  // **A near miss worth one line, because it nearly went into this comment as
  // fact:** an intermediate reading of 382 was taken while a LONGER draft of
  // this round's block was in the tree, and it matched the declared 382
  // exactly. Written up at that moment it would have read *"unchanged, nothing
  // moved"* — over a population that had lost 19 and gained 19 from unrelated
  // causes. That is precisely the "correct by coincidence" trap the
  // `numberedOpenItems` ledger above warns about, and the only thing that
  // caught it was re-measuring each leg separately after the draft changed.
  // 376 -> 408, 2026-10-09, SUPERVISOR. Same single cause as `quoteCriteria`
  // above — five inserted items re-cut two existing criterion zones and add
  // five more — so this is one change counted in two places, not two changes.
  // 32 fragments, which is the order of movement this figure has shown before
  // on a single-item edit (the 254 -> 277 note records 21 for one item).
  //
  // 408 -> 414, 2026-10-09, ROADMAP 0.3. Two blocks appended to 0.3's entry —
  // the end-to-end measurement Andrew asked for, and the Done-when correction
  // — quote the criterion and the sweep's own output back ("pressed on the
  // demo tenant, which has such rows today", "learn: no fixture row was
  // discovered", "Show 1 test row", "gone quiet", "the true answer for real
  // customers", "Waiting on you"). Seven fragments by the run, +6 against this
  // constant; no item was added or closed, which is why `numberedOpenItems`
  // and `quoteCriteria` are untouched by this edit.
  //
  // **AND THE OTHER TWO FIGURES WERE ALREADY MOVED WHEN THIS EDIT ARRIVED, SO
  // THEY ARE DELIBERATELY LEFT RED RATHER THAN SWEPT UP WITH IT.** Measured in
  // a detached worktree at `ee6f5e0`, before any of 0.3's edits existed: this
  // file already failed 3 of 8 there, reporting `numberedOpenItems` 54 (from
  // 53), `quoteCriteria` 36 (from 37) and `quoteFragments` 407 (from 408), and
  // test 3b already named `3.1b` and `3.1c` as items no commit mentions. Those
  // belong to the 3.1 slicing in `ee6f5e0`/`8557c5d`/`653bf3b`. **Moving them
  // here would be this file's own forbidden move** — a constant updated to
  // whatever the run returned without anybody asking what moved — so only the
  // leg whose cause is known is moved, and the rest stays visible for whoever
  // caused it. The figure above was re-measured at 414 AFTER 0.3's blocks were
  // in the tree, not predicted from 407 + 7.
  quoteFragments: 414,
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
    const pending = git(["diff", "--", "ROADMAP.md"])
      + git(["diff", "--cached", "--", "ROADMAP.md"]);
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
