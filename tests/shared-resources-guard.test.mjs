// ROADMAP 14.17 — the guard's logic, credential-free. The live half is
// `node scripts/shared-resources-guard.mjs`. These aim at the PRODUCTION module
// (scripts/lib/sharedResources.mjs), so a sabotage there bites here.
import test from "node:test";
import assert from "node:assert/strict";
import { BLIND, diffSnapshots, render } from "../scripts/lib/sharedResources.mjs";

const base = {
  "rate_hits/address-suggest/ab12cd34/2026-10-10T17:00:00+00:00": 12,
  "email/2026-10-10/claimed": 8,
  "email/2026-10-10/refused": 0,
  "demo/bookings": 40,
  "demo/customers": 31,
  "demo/bookings.status": "aaaa",
};

test("a counter that moved and was not declared is named", () => {
  const d = diffSnapshots(base, { ...base, "demo/bookings": 41, "email/2026-10-10/claimed": 9 }, ["demo/bookings"]);
  assert.deepEqual(d.unexplained.map((m) => m.name), ["email/2026-10-10/claimed"]);
  assert.match(render(d, ["demo/bookings"]), /MOVED, AND NOT BY THIS SESSION[\s\S]*email\/2026-10-10\/claimed: 8 -> 9 \(\+1\)/);
});

test("a prefix declares its whole family, and nothing outside it", () => {
  const d = diffSnapshots(base, { ...base, "demo/bookings": 41, "demo/bookings.status": "bbbb", "demo/customers": 32 }, ["demo/bookings"]);
  assert.deepEqual(d.unexplained.map((m) => m.name), ["demo/customers"]);
});

test("a deleted bucket row is a movement, not silence", () => {
  const { [Object.keys(base)[0]]: _gone, ...rest } = base;
  const d = diffSnapshots(base, rest, []);
  assert.equal(d.unexplained.length, 1);
  assert.match(render(d), /GONE \(deleted or pruned\)/);
});

test("a new rate window and a status-only change are both seen", () => {
  const d = diffSnapshots(base, { ...base, "rate_hits/address-suggest/ab12cd34/2026-10-10T18:00:00+00:00": 1, "demo/bookings.status": "cccc" }, []);
  assert.equal(d.unexplained.length, 2);
});

test("the probe cron's bucket is named as background, not hidden and not blamed", () => {
  const d = diffSnapshots(base, { ...base, "rate_hits/available-slots:no-address/all/2026-10-10T17:00:00+00:00": 1 }, []);
  assert.equal(d.unexplained.length, 0);
  assert.equal(d.unclaimed.length, 1);
  assert.match(render(d), /probe-live-site/);
});

test("EVERY verdict, clean or not, carries the blind list with the 14.15 ceiling in it", () => {
  assert.ok(BLIND.length >= 6);
  for (const out of [render(diffSnapshots(base, base, [])), render(diffSnapshots(base, { ...base, "demo/bookings": 41 }, []))]) {
    assert.match(out, /CANNOT SEE:/);
    assert.match(out, /platform ceiling ABOVE address-suggest \(ROADMAP 14\.15\)/);
    assert.match(out, /Resend's account-wide/);
  }
});

test("a clean run never says 'no collision' as a verdict", () => {
  const out = render(diffSnapshots(base, base, []));
  assert.match(out, /VERDICT: NOTHING UNDECLARED MOVED/);
  assert.match(out, /NOT "no collision"/);
  assert.doesNotMatch(out, /VERDICT: (CLEAN|NO COLLISION)/i);
});
