// ROADMAP 14.30 — A DECLARED, NAMED EXCEPTION IS NOT AN ALLOWLIST.
//
// `bk-bar-clearance` reports `fail` over failures that are all one thing Andrew
// ruled on: the 320px day cells at 36-37px (`FOR-ANDREW.md` § "DECIDED · The day
// squares stay as they are"), whose red STAYS ON PURPOSE. Red over a hold carries
// no information — the eighth failure would read like the seventh — so the
// receipt keeps TWO numbers: failures that are on a declared list, and failures
// that are not. The verdict is decided by the second only. The receipt itself
// still says `fail`, so the hold stays visible.
//
// **NAMES, NOT A TALLY.** Each entry names a target and a question, and carries
// the floor the hold covers (`smallestAtLeast`). A day cell that gets better and
// a new control that gets worse cannot cancel: the new one is a different
// target or question, or its smallest hit area is under the floor, and it lands
// in `unexpected`. A count of "seven" would let them trade places.
//
// **IT NEVER HIDES ANYTHING.** Every record is returned in exactly one of
// `expected` or `unexpected`; nothing is dropped. A declared entry that matched
// nothing this run comes back in `missing` — the day the hold can be retired is
// the day the cells are fixed, and the receipt should say so rather than keep
// declaring a failure that no longer happens.

export const EXPECTED_FAILURES = [
  {
    target: "320x844 step 5",
    name: "legal",
    smallestAtLeast: 36,
    hold: "FOR-ANDREW.md: DECIDED · The day squares stay as they are (2026-09-24). Seven 44px cells need 308px and the column is 288, so no spacing change can fix it.",
  },
  {
    target: "320x844 long-plan step 5",
    name: "legal",
    smallestAtLeast: 36,
    hold: "the same hold, on the sweep that puts a 60-character plan name on the wire",
  },
  {
    target: "320x844 long-tenant step 5",
    name: "legal",
    smallestAtLeast: 36,
    hold: "the same hold, on the sweep that puts a long service, plan and business name on the wire",
  },
];

/** The smallest hit area a `legal` record names, or null when it names none. */
const smallestOf = (r) => {
  const m = String(r.detail ?? "").match(/smallest (\d+)px/);
  return m ? Number(m[1]) : null;
};

/**
 * @param {{target:string, name:string, detail?:string}[]} records every failure, structured
 * @param {typeof EXPECTED_FAILURES} declared
 * @returns {{expected: object[], unexpected: object[], missing: object[]}}
 */
export function classifyFailures(records, declared = EXPECTED_FAILURES) {
  const expected = [], unexpected = [];
  const hit = new Set();
  for (const r of records) {
    const i = declared.findIndex((e) =>
      e.target === r.target && e.name === r.name
      && (e.smallestAtLeast == null || (smallestOf(r) !== null && smallestOf(r) >= e.smallestAtLeast)));
    if (i >= 0) { expected.push(r); hit.add(i); } else unexpected.push(r);
  }
  return { expected, unexpected, missing: declared.filter((_, i) => !hit.has(i)) };
}
