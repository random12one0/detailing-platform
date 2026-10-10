// ROADMAP 4.6a's last finding — THE TAP-TARGET SWEEP MUST NOT PRESS A DOOR THAT
// LEAVES THE DASHBOARD, AND THE LIST OF SUCH DOORS MUST BE THE TRUE ONE.
//
//   node --test tests/sweep-tap-targets-leaving-door.test.mjs
//
// Credential-free, no browser: two source reads. `scripts/sweep-tap-targets.mjs`
// keeps a `LEAVES` set of gear-row keys it will not press (the platform door did
// `window.location.href = "/admin"`, so there was no dashboard screen behind it).
// Since ROADMAP 99.3a that row is gone and BOTH lists are empty; test 1 proves the
// reader still finds a door by planting one, so an empty answer is not a blind one.
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
  await t.test("1 · the two lists are equal, and the reader can see a door when there is one", () => {
    assert.deepEqual(exemptKeys(SWEEP), leavingKeys(GEAR));
    const planted = GEAR.replace(`onClick={() => setOpen(key)}>`, `onClick={() => { if (key === "billing") { window.location.href = "/billing"; return; } setOpen(key); }}>`);
    assert.notEqual(planted, GEAR, "the plant did not land; the onClick shape moved");
    assert.deepEqual(leavingKeys(planted), ["billing"], "the reader is blind to the leaving-door shape");
  });

  await t.test("2 · SABOTAGE — a new leaving row, or a listed key that no longer leaves, is seen", () => {
    const added = GEAR.replace(`onClick={() => setOpen(key)}>`, `onClick={() => { if (key === "billing") { window.location.href = "/billing"; return; } setOpen(key); }}>`);
    assert.notDeepEqual(exemptKeys(SWEEP), leavingKeys(added), "a new leaving row went unnoticed");
    const stale = SWEEP.replace("const LEAVES = new Set([]);", 'const LEAVES = new Set(["platform"]);');
    assert.notEqual(stale, SWEEP, "the plant did not land; LEAVES moved");
    assert.notDeepEqual(exemptKeys(stale), leavingKeys(GEAR), "a listed key that no longer leaves was unnoticed");
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
