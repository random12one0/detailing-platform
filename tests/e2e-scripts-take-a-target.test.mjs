// ROADMAP 101.6 (audit R2-01): e2e-receipt-trail.mjs and e2e-browser-features.mjs
// can be pointed at a copy of the app other than localhost:5173, as the audit
// does with e2e-booking.mjs (BASE + --to=), and an unreachable copy is an
// explicit SKIP with a non-zero exit, never a pass.
//
// Credential-free and spends nothing: every child is stopped by a guard before
// any browser, payment or send. The Supabase values are dummies on a host that
// is never contacted. Run: node --test tests/e2e-scripts-take-a-target.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const SCRIPTS = ["scripts/e2e-receipt-trail.mjs", "scripts/e2e-browser-features.mjs"];
const DEAD = "http://127.0.0.1:9";   // nothing listens on the discard port

// Empty strings win over the root .env (tests/_env.mjs fills only what is absent).
const ENV = {
  SUPABASE_URL: "https://test-copy.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "x", SUPABASE_ANON_KEY: "x",
  DEMO_OWNER_PW: "x", DEMO_STAFF_PW: "x", ALLOW_REAL_MAIL: "", BASE: DEAD,
};
const run = (script, args = [], env = {}) => {
  const r = spawnSync(process.execPath, [script, ...args],
    { cwd: root, timeout: 60000, encoding: "utf8", env: { ...process.env, ...ENV, ...env } });
  return { code: r.status, out: `${r.stdout}\n${r.stderr}` };
};

for (const script of SCRIPTS) {
  test(`${script}: no platform-project ref in the source (the audit refuses any script that names it)`, () => {
    assert.ok(!readFileSync(new URL(`../${script}`, import.meta.url), "utf8").includes("kguqylyzgyzfktkfnhjb"));
  });

  test(`${script}: drives the copy BASE names, and an unreachable one is a SKIP, not a pass`, () => {
    const r = run(script, ["--to=probe@fixture.test"]);
    assert.equal(r.code, 2, r.out);
    assert.match(r.out, /SKIPPED — nothing is serving http:\/\/127\.0\.0\.1:9\b/, r.out);
    assert.match(r.out, /This is not a pass/, r.out);
  });

  test(`${script}: still refuses the real business's project`, () => {
    const r = run(script, ["--to=probe@fixture.test"], { SUPABASE_URL: "https://adtlnvihwrcqcasqcjwd.supabase.co" });
    assert.equal(r.code, 2, r.out);
    assert.match(r.out, /REFUSED — .* real business's project/, r.out);
  });
}

test("e2e-receipt-trail.mjs: without --to= real mail is still opt-in", () => {
  const r = run("scripts/e2e-receipt-trail.mjs");
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /REFUSED TO SEND REAL MAIL/, r.out);
});
