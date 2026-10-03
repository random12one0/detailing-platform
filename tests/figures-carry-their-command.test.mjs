// EVERY RECORDED FIGURE IS ACCOUNTED FOR: A COMMAND AND A REVISION, OR A NAMED
// REASON IT CANNOT BE RE-TAKEN.
//
// Run: node --test tests/figures-carry-their-command.test.mjs
//      Credential-free. Filesystem reads plus a bounded set of read-only `git`
//      and `grep` commands extracted from the documents. No network.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS, AND IT IS THE ONLY ARGUMENT THAT MATTERS
// ---------------------------------------------------------------------------
// **This check exists because the two people who knew the rule best broke it
// within an hour of writing it.**
//
// `docs/gotchas.md` 94 is the rule: *a recorded number carries the command that
// produced it and the revision it was taken at, or it is not a measurement, it
// is a memory.* On the night it was written:
//
//   * the session wrote `gotchas.md` 93 — *distrust any edit that makes two
//     numbers agree without re-running the thing that produced either* — and
//     **then edited 92's recorded `58` down to `53` to make two counts agree,
//     without re-running the command four lines above it.** 58 was right.
//   * hours earlier the same session wrote ROADMAP 14.21 with a typed test
//     tally, **four hours after diagnosing that exact fault in 3.4.**
//
// Two failures of remembering, by the author, about the rule being authored.
// **That is not self-flagellation; it is the argument for why the rule had to
// leave prose and become code.** A session that reads 94 and agrees with it is
// the same session that broke it twice in one night.
//
// **So do not delete this check as redundant with the gotcha.** The gotcha is
// the reason; this file is the enforcement, and the gap between them is
// measured at two failures per sitting.
//
// ---------------------------------------------------------------------------
// THE SHARPEST THING THIS SCAN FOUND, AND IT IS NOT IN THE PASS DOCUMENTS
// ---------------------------------------------------------------------------
// **`docs/silences.md` carries 31 figures and 31 of them are bare. One hundred
// per cent.** That document's entire subject is *which checks can tell a pass
// from a did-not-run* — **and not one of its own numbers carries the command or
// the revision that would let a reader tell the same thing about it.**
//
// It is not a classifier artifact, which was checked before it was claimed: the
// command pattern was widened from four command names to thirteen and the figure
// **did not move**, because of 29 figure-bearing rows exactly **1 carries a
// command, 2 carry a revision (both resolve), and NO ROW CARRIES BOTH.**
//
// `PROJECT-STATE.md` is also 17 of 17, and `docs/ticked-without-proof` is 69 of
// 69. **The two documents this check was built for are its best-behaved subjects**
// — because they were annotated by hand earlier the same night, which is the
// measure of how little of this repo's recorded numbers were ever re-takeable.

// ---------------------------------------------------------------------------
// WHAT IT ASKS, AND IT IS *ACCOUNTED FOR* RATHER THAN *COMMANDED*
// ---------------------------------------------------------------------------
// 94 says plainly that some numbers cannot be re-taken: a judgement is not a
// count, an instrument can be gone, and a measurement of a FIRST reading is
// unrepeatable by construction. **Demanding a command for every figure in these
// five documents would demand the impossible and stand red for ever**,
// which is the failure `every-open-item-is-citable` rejected by name: *a check
// that is red forever is a check everybody learns to walk past.*
//
// So a figure passes by being **accounted for**:
//
//   * **VERIFIED** — a runnable command on the row whose OUTPUT EQUALS a figure
//     on that row. End-to-end. The strongest thing here.
//   * **PINNED** — a command plus a revision that resolves, where the command
//     is not safely runnable (`node --test …` is not executed by this file).
//   * **ACCOUNTED** — carries a named reason it cannot be re-taken, plus a date.
//   * **BARE** — none of the above. The finding.
//   * **UNJUDGEABLE** — a row this scanner cannot classify. Own bucket, size
//     reported, never folded into pass.
//
// ---------------------------------------------------------------------------
// THE TWO STRENGTHS, SAID PLAINLY BECAUSE THEY ARE VERY DIFFERENT
// ---------------------------------------------------------------------------
// The manager's condition was that annotation alone must not satisfy this, or
// the fix for every red becomes pasting a plausible command.
//
//   * **For VERIFIED rows the check is end-to-end: the command is executed and
//     its output compared to the figure.** A plausible-looking command that
//     returns the wrong number fails. This is real.
//   * **For PINNED rows the check is weaker and is NOT equivalent**: the cited
//     revision must resolve through `git rev-parse --verify`, and any file the
//     command names must exist and be tracked. **A command that resolves but
//     would print something else passes this tier.** The two tiers are counted
//     and reported separately for exactly that reason, and PINNED is never
//     described as verified.
//
// **A cited revision that does not resolve is its own failure**, reported by
// name, because a fabricated sha is the cheapest possible fake annotation.
//
// ---------------------------------------------------------------------------
// THE INHERITED DEBT, DECLARED RATHER THAN EXEMPTED
// ---------------------------------------------------------------------------
// `DECLARED_BARE` is the bare count on the day this was written. **The check's
// job is not to make it zero — it is to stop it becoming one more.** It fails
// when the number GROWS, and the number is a single integer rather than a list
// of blessed lines, specifically so nobody can add exemptions one at a time.
// That is `DECISIONS.md`'s *declared expected-failures list, not an allowlist*
// applied here: lowering it is the work, raising it needs a sentence saying why.
//
// ---------------------------------------------------------------------------
// BROKEN ON PURPOSE, EVERY RUN
// ---------------------------------------------------------------------------
// Section 5 injects a synthetic bare figure into the scanned text on EVERY run
// and asserts it lands in BARE. It is not an env flag, because a sabotage that
// has to be remembered is a sabotage nobody runs. `FIG_CANARY=off` disables it
// and must itself make section 5 fail.
//
// **THREE SABOTAGES RUN 2026-10-02, AND TWO OF THEM WERE REAL RATHER THAN
// SIMULATED** — a flag that fakes a condition proves less than the condition:
//
//   1. `FIG_CANARY=off` — section 5 failed, as designed. (synthetic)
//   2. **A genuine bare row written into `docs/ticked-without-proof-2026-09-25.md`**
//      — `| SABOTAGE a real bare figure | **4242** |`. BARE moved **192 -> 194**
//      and section 4 went red. Row removed, file restored from `HEAD`, confirmed
//      byte-identical, and the clean run returned 7/7.
//   3. **A genuine fabricated revision in the same file** — `@ \`deadbeefcafe1\``.
//      Section 3 named it and went red. Removed with the above.
//   4. **RE-RUN AFTER SECTION 4 CHANGED SHAPE — `docs/gotchas.md` 95.** Widening
//      the scan turned the bare assertion from ONE TOTAL into a PER-DOCUMENT
//      comparison, which is exactly the relaxation that orphans a canary. So the
//      real sabotage was run again against the new shape: a bare row added to
//      `docs/silences.md` moved it **31 -> 32** and section 4 went red **naming
//      that document**. Reverted, 7/7 returned. **Re-run in the same edit as the
//      shape change, per 95's rule, because the last time that rule was skipped
//      the sabotaged run went green 7/0.**
//
// **What 2 and 3 prove that a flag could not: the scan reads the DOCUMENTS, not
// its own fixtures.** Same discipline as the queue check, whose sabotage was
// editing the table it reads rather than flipping a variable in code.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// PER-DOCUMENT DECLARATIONS, AND THE REASON THEY ARE NOT ONE TOTAL
// ---------------------------------------------------------------------------
// **A single total lets a rise in one file hide behind a fall in another** —
// pin six figures in one document, let seven go bare in another, and the total
// improves while the repo gets worse. That is the population fault one level up
// from the one this file catches, so every document declares its own floor and
// its own bare count and is asserted separately.
//
// `floor` guards THAT document's parser. A shared floor across five documents is
// meaningless: four could stop parsing entirely and the fifth would carry it.
//
// Measured 2026-10-02 at commit 9901b16.
//
// **THE FIRST VERSION OF THIS TABLE SPLIT THE OLD 192 TOTAL INTO GUESSED PARTS —
// 173 and 19 — AND THE MEASURED SPLIT IS 122 AND 69.** Corrected before it was
// committed, by running the per-document report rather than reasoning about it.
// **That is the same fault one level down: a total is not evidence about its
// parts, and splitting one by eye manufactures two wrong numbers out of one right
// one.** It is also exactly why the manager asked for per-file declarations.
const DOCS = [
  // doc, discovery floor, declared bare
  { path: "docs/open-items-read-as-a-stranger-2026-09-25.md", floor: 120, bare: 122 },
  { path: "docs/ticked-without-proof-2026-09-25.md", floor: 30, bare: 69 },

  // **docs/silences.md: 31 figures, 31 bare, ONE HUNDRED PER CENT** — and this is
  // the sharpest finding of the night rather than one more red. **The document
  // whose entire subject is which checks can tell a pass from a did-not-run does
  // not carry a command or a revision for a single one of its own numbers.**
  // Not a classifier artifact: the command pattern was widened to thirteen command
  // names and the figure did not move, because of 29 figure-bearing rows exactly
  // **1 carries a command and 2 carry a revision, and NO ROW CARRIES BOTH.**
  { path: "docs/silences.md", floor: 20, bare: 31 },

  { path: "PROJECT-STATE.md", floor: 10, bare: 17 },

  // **FOR-ANDREW.md declares 0 and that is NOT a clean bill.** This scanner reads
  // TABLE ROWS, and FOR-ANDREW.md states its figures in prose, so they are
  // invisible to it. A zero here means "nothing in scope", never "nothing wrong" —
  // which is the distinction `docs/silences.md` exists to make, turned on this
  // file. Widening to prose would need a different parser and is not pretended at.
  { path: "FOR-ANDREW.md", floor: 0, bare: 0 },
];

const CANARY_ON = process.env.FIG_CANARY !== "off";
const CANARY_ROW = "| CANARY — a figure with no command and no revision | **999999** |";

const sh = (c, t = 60000) => {
  try { return execFileSync("bash", ["-c", c], { encoding: "utf8", maxBuffer: 1 << 26, timeout: t }).trim(); }
  catch { return null; }
};

// Only these shapes are ever executed, and never with a shell metacharacter.
// A command containing an ellipsis is TRUNCATED PROSE, not a command.
const RUNNABLE = (c) =>
  !/[…]/.test(c)
  && !/[;&|<>$(){}`]/.test(c.replace(/\| *wc -l\s*$/, ""))
  && /^(git (grep|log|rev-list|ls-files)|grep)\s+\S/.test(c.trim())
  && /\S{6}/.test(c);

const FIG = /\*\*([0-9][0-9,]*)\*\*/g;
const CMD = /`((?:git|grep|node|sed)\b[^`]{4,300})`/g;
const SHA = /`([0-9a-f]{7,40})`/g;
const REASON = /UNRE-TAKEABLE|unre-takeable|unrepeatable by construction|dated snapshot|judgement, not a count|tool is gone|instrument is gone|no tree|self-invalidating/i;
const DATE = /20\d\d-\d\d-\d\d/;
const FILE_IN_CMD = /\b((?:app|docs|scripts|tests|supabase|receipts)\/[A-Za-z0-9_.\/-]+)/;

function scan(extraRows = []) {
  const rows = [];
  for (const d of DOCS) {
    const lines = readFileSync(d.path, "utf8").replace(/\r\n/g, "\n").split("\n");
    lines.forEach((line, i) => { if (/^\|/.test(line)) rows.push({ doc: d.path, line: i + 1, text: line }); });
  }
  for (const t of extraRows) rows.push({ doc: "(canary)", line: 0, text: t });

  const out = { verified: [], pinned: [], accounted: [], bare: [], unjudgeable: [], badRev: [], total: 0 };
  // halfPinned is a REPORT, not a pass bucket: a row with a revision but no
  // command (or the reverse) is still bare by gotchas 94, which requires both.
  // It is counted because the missing half is cheap to add and a reader deserves
  // to know which bare figures are one edit from being pinned.
  out.halfPinned = [];

  for (const r of rows) {
    FIG.lastIndex = 0;
    const figs = [];
    let m;
    while ((m = FIG.exec(r.text))) if (!/^20\d\d$/.test(m[1])) figs.push(m[1].replace(/,/g, ""));
    if (!figs.length) continue;

    CMD.lastIndex = 0;
    const cmds = [];
    while ((m = CMD.exec(r.text))) cmds.push(m[1].trim());
    SHA.lastIndex = 0;
    const shas = [];
    while ((m = SHA.exec(r.text))) shas.push(m[1]);

    // a cited sha that does not resolve is its own failure
    for (const s of shas) {
      if (sh(`git rev-parse --verify --quiet ${s}^{commit}`) === null) {
        out.badRev.push(`${r.doc}:${r.line} cites ${s}, which does not resolve`);
      }
    }

    const hasReason = REASON.test(r.text);
    const hasDate = DATE.test(r.text);
    const revOk = shas.some((s) => sh(`git rev-parse --verify --quiet ${s}^{commit}`) !== null);

    // try to VERIFY end-to-end
    let verifiedFig = null, ranOne = false, truncated = false;
    for (const c of cmds) {
      if (/[…]/.test(c)) { truncated = true; continue; }
      if (!RUNNABLE(c)) continue;
      ranOne = true;
      const got = sh(c);
      if (got !== null && figs.includes(got.trim())) { verifiedFig = { cmd: c, got: got.trim() }; break; }
    }

    for (const f of figs) {
      out.total++;
      if (verifiedFig) { out.verified.push({ ...r, f, ...verifiedFig }); continue; }
      if (cmds.length && (revOk || hasDate)) {
        const named = (r.text.match(FILE_IN_CMD) || [])[1];
        if (named && sh(`git ls-files --error-unmatch "${named}"`) === null) {
          out.unjudgeable.push(`${r.doc}:${r.line} **${f}** names ${named}, which is not a tracked file`);
        } else out.pinned.push({ ...r, f });
        continue;
      }
      if (hasReason && hasDate) { out.accounted.push({ ...r, f }); continue; }
      if (hasReason) { out.accounted.push({ ...r, f }); continue; }
      if (truncated || (ranOne && !verifiedFig)) {
        out.unjudgeable.push(`${r.doc}:${r.line} **${f}** carries a command this file cannot judge (truncated, or it ran and matched nothing)`);
        continue;
      }
      out.bare.push({ ...r, f });
      // still bare, but say which are one edit away
      if (cmds.length || revOk) {
        out.halfPinned.push(`${r.doc.replace("docs/", "")}:${r.line} **${f}** has ${cmds.length ? "a command but no revision" : "a revision but no command"}`);
      }
    }
  }
  return out;
}

test("every recorded figure carries its command or names why it cannot", async (t) => {
  const res = scan(CANARY_ON ? [CANARY_ROW] : []);

  const per = (p) => ({
    total: res.verified.concat(res.pinned, res.accounted, res.bare).filter((x) => x.doc === p).length,
    bare: res.bare.filter((x) => x.doc === p).length,
  });

  await t.test("1 · EVERY document cleared its OWN discovery floor", () => {
    const short = DOCS
      .map((d) => ({ d, got: per(d.path).total }))
      .filter((x) => x.got < x.d.floor)
      .map((x) => `${x.d.path}: found ${x.got}, floor ${x.d.floor}`);
    assert.deepEqual(
      short, [],
      "a document is below its own discovery floor. FEW OR ZERO IS A BROKEN PARSER, "
      + "NEVER A CLEAN BILL — that document then reports zero bare figures and reads "
      + "as all-clear. **The floor is per document on purpose: one shared floor "
      + "across five means four could stop parsing entirely and the fifth would "
      + "carry them.** Check the `| ... |` row shape and the `**123**` figure shape "
      + "before touching a floor.",
    );
  });

  await t.test("2 · REPORT — the five buckets, and UNJUDGEABLE is never folded into pass", () => {
    console.log(`\n   FIGURES ACCOUNTED FOR — ${DOCS.length} documents, each declared separately`);
    console.log(`     VERIFIED      ${String(res.verified.length).padStart(4)}  command ran, output equals the figure`);
    console.log(`     PINNED        ${String(res.pinned.length).padStart(4)}  command + a revision that resolves (NOT verified)`);
    console.log(`     ACCOUNTED     ${String(res.accounted.length).padStart(4)}  names why it cannot be re-taken`);
    console.log(`     BARE          ${String(res.bare.length).padStart(4)}`);
    console.log(`     UNJUDGEABLE   ${String(res.unjudgeable.length).padStart(4)}  reported, never passed`);
    console.log(`     bad revisions ${String(res.badRev.length).padStart(4)}`);
    console.log(`     half-pinned   ${String(res.halfPinned.length).padStart(4)}  still BARE; one edit from pinned`);
    console.log(`     (canary: ${CANARY_ON ? "on" : "OFF"})`);
    console.log(`\n     per document            found/floor      bare/declared`);
    for (const d of DOCS) {
      const p = per(d.path);
      const pct = p.total ? Math.round((p.bare / p.total) * 100) : 0;
      console.log(`       ${d.path.replace("docs/", "").slice(0, 38).padEnd(40)} ${String(p.total).padStart(4)}/${String(d.floor).padEnd(5)} ${String(p.bare).padStart(4)}/${String(d.bare).padEnd(5)} ${pct}% bare`);
    }
    for (const v of res.verified) console.log(`       VERIFIED ${v.doc.replace("docs/", "")}:${v.line} **${v.f}** <- ${v.cmd.slice(0, 66)}`);
    assert.ok(true);
  });

  await t.test("3 · no cited revision is fabricated", () => {
    assert.deepEqual(
      res.badRev, [],
      "a figure cites a revision that does not resolve. A fabricated sha is the "
      + "cheapest possible fake annotation, which is why it is its own failure.",
    );
  });

  await t.test("4 · NO document's bare count has grown — asserted per document, never as a total", () => {
    const grown = DOCS
      .map((d) => ({ d, got: per(d.path).bare }))
      .filter((x) => x.got > x.d.bare)
      .map((x) => `${x.d.path}: ${x.got} bare, declared ${x.d.bare} (+${x.got - x.d.bare})`);
    assert.deepEqual(
      grown, [],
      "a document's bare count grew. A figure with no command, no revision and no "
      + "stated reason is a memory (gotchas 94). These are inherited debt and the "
      + "check's job is to stop one more: pin the new figure, or state why it cannot "
      + "be re-taken. Raising a declared number needs a sentence saying why, in the "
      + "same edit.\n  **Asserted PER DOCUMENT rather than as a total, because a "
      + "single total lets a rise in one file hide behind a fall in another** — pin "
      + "six here, let seven go bare there, and the total improves while the repo "
      + "gets worse.",
    );
  });

  await t.test("5 · the canary is injected on every run and lands in BARE", () => {
    const hit = res.bare.some((b) => b.doc === "(canary)" && b.f === "999999");
    if (!CANARY_ON) {
      assert.fail("FIG_CANARY=off — the sabotage is disabled, so this run proves "
        + "nothing about whether the scan can still detect a bare figure. That is "
        + "why this fails rather than skips.");
    }
    assert.ok(
      hit,
      "the synthetic bare figure was NOT classified bare, so the scan can no "
      + "longer detect the thing it exists to detect. Every count above is "
      + "worthless until this passes.",
    );
  });

  await t.test("6 · UNJUDGEABLE is surfaced by name, not counted as passing", () => {
    assert.ok(Array.isArray(res.unjudgeable));
    if (res.unjudgeable.length) {
      console.log(`\n   UNJUDGEABLE — ${res.unjudgeable.length}, listed so they are not mistaken for passes:`);
      res.unjudgeable.slice(0, 12).forEach((u) => console.log("     " + u));
    }
    // deliberately not an assertion on zero: this bucket is a REPORT, and
    // asserting zero would push the next session to delete rows to clear it.
  });
});
