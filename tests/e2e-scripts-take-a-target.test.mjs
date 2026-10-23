// ROADMAP 101.6 (audit R2-01): e2e-receipt-trail.mjs and e2e-browser-features.mjs
// can be pointed at a copy of the app other than localhost:5173, as the audit
// does with e2e-booking.mjs (BASE + --to=), and an unreachable copy is an
// explicit SKIP with a non-zero exit, never a pass.
//
// 101.6 follow-up: their database guard is an ALLOW-LIST (the platform's dev
// project, the belt audit's test copy, a local one) and refuses EVERY other
// project. 101.6 had turned it into a deny-list of the one real-business ref;
// the "unknown project" tests below fail if either script goes back to that.
//
// Credential-free and spends nothing: every child is stopped by a guard before
// any browser, payment or send. The Supabase values are dummies and no database
// is contacted: the app check (BASE, a dead port) stops each allowed run first.
// Run: node --test tests/e2e-scripts-take-a-target.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const SCRIPTS = ["scripts/e2e-receipt-trail.mjs", "scripts/e2e-browser-features.mjs"];
const DEAD = "http://127.0.0.1:9";   // nothing listens on the discard port

// Empty strings win over the root .env (tests/_env.mjs fills only what is absent).
const ENV = {
  SUPABASE_URL: "http://127.0.0.1:9", SUPABASE_SERVICE_ROLE_KEY: "x", SUPABASE_ANON_KEY: "x",
  DEMO_OWNER_PW: "x", DEMO_STAFF_PW: "x", ALLOW_REAL_MAIL: "", BASE: DEAD,
};
const run = (script, args = [], env = {}) => {
  const r = spawnSync(process.execPath, [script, ...args],
    { cwd: root, timeout: 60000, encoding: "utf8", env: { ...process.env, ...ENV, ...env } });
  return { code: r.status, out: `${r.stdout}\n${r.stderr}` };
};

const ALLOWED = [
  "https://kguqylyzgyzfktkfnhjb.supabase.co",   // the platform's development project
  "https://txskfjumploppqajbmxx.supabase.co",   // the belt audit's test copy
  "http://127.0.0.1:54321", "http://localhost:54321",
];
const UNKNOWN = [
  "https://abcdefghijklmnopqrst.supabase.co",   // a project nobody named
  "https://test-copy.supabase.co",
  "https://evil.example/kguqylyzgyzfktkfnhjb.supabase.co",   // the ref, but not as the host
  "https://kguqylyzgyzfktkfnhjb.supabase.co.evil.example",
  "not a url",
];

for (const script of SCRIPTS) {
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

  for (const url of UNKNOWN) {
    test(`${script}: refuses a project it was not told about (${url}) — allow-list, not deny-list`, () => {
      const r = run(script, ["--to=probe@fixture.test"], { SUPABASE_URL: url });
      assert.equal(r.code, 2, r.out);
      assert.match(r.out, /REFUSED — .* not one this script may use/, r.out);
      assert.doesNotMatch(r.out, /SKIPPED — nothing is serving/, r.out);
    });
  }

  for (const url of ALLOWED) {
    test(`${script}: lets ${url} through the database guard (stops at the app check)`, () => {
      const r = run(script, ["--to=probe@fixture.test"], { SUPABASE_URL: url });
      assert.equal(r.code, 2, r.out);
      assert.doesNotMatch(r.out, /REFUSED/, r.out);
      assert.match(r.out, /SKIPPED — nothing is serving/, r.out);
    });
  }
}

test("e2e-receipt-trail.mjs: without --to= real mail is still opt-in", () => {
  const r = run("scripts/e2e-receipt-trail.mjs");
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /REFUSED TO SEND REAL MAIL/, r.out);
});
