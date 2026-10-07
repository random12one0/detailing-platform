// ROADMAP 4.6a's last finding — THE TAP-TARGET SWEEP MUST NOT PRESS A DOOR THAT
// LEAVES THE DASHBOARD, AND THE LIST OF SUCH DOORS MUST BE THE TRUE ONE.
//
//   node --test tests/sweep-tap-targets-leaving-door.test.mjs
//
// Credential-free, no browser: two source reads. `scripts/sweep-tap-targets.mjs`
// keeps a `LEAVES` set of gear-row keys it will not press (the platform door does
// `window.location.href = "/admin"`, so there is no dashboard screen behind it).
// That exemption can rot two ways the sweep itself cannot see:
//   * a listed key stops navigating away  -> the sweep silently skips a real screen;
//   * another row starts navigating away  -> the old no-subjects finding returns,
//     or worse, the walk is carried off the dashboard mid-run.
// This holds the set equal to what GearMenu.jsx actually does, both ways.
//
// WHAT IT CANNOT SEE: whether a row's navigation lives somewhere other than the
// `if (key === "…") { window.location.href` shape in GearMenu.jsx (a router
// `navigate()` call, say). That shape is the only one there today; a second one
// would need this reader widened, and the first sign would be the old finding.

import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const SWEEP = readFileSync("scripts/sweep-tap-targets.mjs", "utf8");
const GEAR = readFileSync("app/src/components/GearMenu.jsx", "utf8");

/** The keys the sweep will not press. */
export const exemptKeys = (src) => {
  const m = src.match(/const LEAVES = new Set\(\[([^\]]*)\]\)/);
  assert.ok(m, "the sweep no longer declares LEAVES in the shape this reads");
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]).sort();
};
/** The gear-row keys the product navigates away for. */
export const leavingKeys = (src) =>
  [...src.matchAll(/if \(key === "(\w+)"\) \{ window\.location\.href\s*=/g)].map((x) => x[1]).sort();

test("the sweep's leaving-door exemption is the product's leaving doors", async (t) => {
  await t.test("1 · the two lists are equal, and are not empty", () => {
    const real = leavingKeys(GEAR);
    assert.ok(real.length >= 1, "GearMenu has no leaving door at all; the shape moved, or the door was removed");
    assert.deepEqual(exemptKeys(SWEEP), real);
  });

  await t.test("2 · SABOTAGE — a new leaving row, or the platform door ceasing to leave, is seen", () => {
    const added = GEAR.replace(`if (key === "tour")`, `if (key === "billing") { window.location.href = "/billing"; return; }\n              if (key === "tour")`);
    assert.notDeepEqual(exemptKeys(SWEEP), leavingKeys(added), "a new leaving row went unnoticed");
    const removed = GEAR.replace(`window.location.href = "/admin"`, `setOpen(key)`);
    assert.notDeepEqual(exemptKeys(SWEEP), leavingKeys(removed), "the platform door stopping was unnoticed");
  });

  await t.test("3 · every gear row carries the data-settings-key the sweep reads it by", () => {
    assert.match(GEAR, /className=\{`nav-row[^`]*`\} key=\{key\} data-settings-key=\{key\}/);
    assert.match(SWEEP, /getAttribute\("data-settings-key"\)/);
  });

  await t.test("4 · the exemption is checked BEFORE the press, and counted rather than dropped", () => {
    const at = (re) => SWEEP.search(re);
    assert.ok(at(/if \(leaves\(i\)\) continue;/) > 0 && at(/if \(leaves\(i\)\) continue;/) < at(/await btn\.click\(\);/));
    assert.match(SWEEP, /expectedSettings \+= n - leftOut\.length/);
    assert.match(SWEEP, /doors_that_leave_the_dashboard/);
  });
});
