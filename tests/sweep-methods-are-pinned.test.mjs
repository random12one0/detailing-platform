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
function commitScope(ids) {
  const raw = sh(`git log --format=%H%x1f%s%x1f%b%x1e`);
  const commits = raw.split("\x1e").map((c) => c.trim()).filter(Boolean).map((c) => {
    const [sha, subj, body] = c.split("\x1f");
    return { sha, subj: subj || "", msg: `${subj || ""}\n${body || ""}` };
  });
  const bound = CANARY === "scope"
    ? (id) => new RegExp(id.replace(".", "\\."))            // SABOTAGE: unbounded
    : (id) => new RegExp(`(^|[^0-9.])${id.replace(".", "\\.")}([^0-9.]|$)`);
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
const TAKEN_AT = "3398470";          // the commit these were measured at
const DECLARED = {
  numberedOpenItems: 66,
  // 339 under THIS scope. The prose sweep recorded 534, which is unreproducible
  // — 434 unique / 853 summed at its own revision. 339 is not a correction of
  // 534: it is a DIFFERENT, pinned question (digit/dot-bounded, counted once
  // per commit, no date floor). Both figures stand with their own dates.
  commitsNamingAnItem: 339,
  itemsWithACommit: 66,
  // 37 criteria / 276 fragments. The prose sweep's criteria figure was 36 and
  // reproduced exactly at its own revision; 37 is 36 plus 14.31. Its fragment
  // figure was 247 and does not reproduce under any faithful reading.
  quoteCriteria: 37,
  quoteFragments: 276,
};
// A floor, not an equality: guards the PARSER, never the backlog.
const ITEM_FLOOR = 40;
const COMMIT_FLOOR = 100;

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
      commitsNamingAnItem: scope.naming.length,
      itemsWithACommit: new Set(scope.naming.flatMap((c) => c.items)).size,
      quoteCriteria: qs.criteria,
      quoteFragments: qs.fragments,
    };
    console.log(`\n   PINNED SWEEP FIGURES — taken by this file, declared at ${TAKEN_AT}`);
    for (const k of Object.keys(DECLARED)) {
      const flag = got[k] === DECLARED[k] ? "" : `   <-- MOVED from ${DECLARED[k]}`;
      console.log(`     ${k.padEnd(22)} ${String(got[k]).padStart(5)}${flag}`);
    }
    console.log(`     (canary: ${CANARY || "off"})`);
    assert.ok(true);
  });

  await t.test("3 · the declared figures still hold", () => {
    const got = {
      numberedOpenItems: ids.length,
      commitsNamingAnItem: scope.naming.length,
      itemsWithACommit: new Set(scope.naming.flatMap((c) => c.items)).size,
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

  await t.test("4 · every id is matched with digit/dot boundaries, so 1.3 is not 11.3", () => {
    const re = /(^|[^0-9.])1\.3([^0-9.]|$)/;
    assert.equal(re.test("11.3 — something"), false, "1.3 must not match inside 11.3");
    assert.equal(re.test("fixes 1.3 today"), true, "1.3 must match as its own token");
    assert.equal(re.test("1.30 is different"), false, "1.3 must not match inside 1.30");
  });
});
