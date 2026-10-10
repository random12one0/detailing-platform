// ROADMAP 9.12a plan step 4 — what the new System place says. Credential-free, no
// browser: it IMPORTS app/src/lib/officeSystem.js and runs it.
//
//   node --test tests/office-system.test.mjs
//   BREAK=seeded node --test tests/office-system.test.mjs   (§ 1 must go red)
//   BREAK=empty  node --test tests/office-system.test.mjs   (§ 2 must go red)
//   BREAK=badge  node --test tests/office-system.test.mjs   (§ 3 must go red)
//
// BREAK is an env var, not a flag (docs/gotchas.md 104). Each break rewrites the
// module's source in memory and asserts the rewrite LANDED (gotchas 102).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const BREAK = process.env.BREAK || "";
const swap = (text, from, to) => {
  const out = text.replace(from, to);
  assert.notEqual(out, text, `BREAK=${BREAK} did not land: ${from} not found`);
  return out;
};
let src = readFileSync(new URL("../app/src/lib/officeSystem.js", import.meta.url), "utf8");
if (BREAK === "seeded") src = swap(src, ' || h?.detail?.seeded === true) return "never"', ') return "never"');
if (BREAK === "empty") src = swap(src, "if (beats.length === 0) out.push(", "if (false) out.push(");
if (BREAK === "badge") src = swap(src, 'checks.filter((c) => c.state === "bad").length', 'checks.filter((c) => c.state !== "ok").length');
const M = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));

const NOW = Date.parse("2026-10-10T12:00:00Z");
const min = (m) => new Date(NOW - m * 60000).toISOString();
const GB = 1024 ** 3;
const healthy = () => ({
  heartbeats: [
    { job: "send-owner-reminders", ran_at: min(3), stale_after_seconds: 900, detail: {} },
    { job: "restore-drill", ran_at: min(60 * 24 * 5), detail: { tables: 51, accounts: 30 } },
  ],
  watch: { outside: true },
  email: { sent: 10, cap: 100, failed: 0, refused_platform: 0, owner_email: "a@b.c" },
  photo_store: { used_bytes: 2 * GB, total_bytes: 10 * GB, committed_bytes: 1 * GB },
});
const by = (cs, key) => cs.find((c) => c.key === key);

test("1. a seeded heartbeat (watching started, never reported) is NEVER, not ok", () => {
  const s = healthy();
  s.heartbeats.push({ job: "accrue-plan-visits", ran_at: min(1), stale_after_seconds: 86400, detail: { seeded: true } });
  const c = by(M.checksOf(s, NOW), "job:accrue-plan-visits");
  assert.equal(c.state, "never");
  assert.equal(c.at, null, "a never-reported job has no last-checked time");
  assert.equal(c.says, "Has never reported. It runs every day");
  assert.equal(by(M.checksOf(s, NOW), "job:send-owner-reminders").state, "ok");
});

test("2. no heartbeat at all is a loud 'never', never an empty all-clear", () => {
  const s = healthy();
  s.heartbeats = s.heartbeats.filter((h) => h.job === "restore-drill");
  const cs = M.checksOf(s, NOW);
  assert.equal(by(cs, "job:none")?.state, "never");
  assert.ok(M.loudOf(cs).some((c) => c.key === "job:none"));
});

test("3. the badge counts BROKEN only; never-proven and near-limit stay off it", () => {
  const s = healthy();
  s.watch.outside = false;                       // never
  s.email.sent = 90;                             // warn
  assert.equal(M.brokenOf(M.checksOf(s, NOW)), 0);
  s.heartbeats[0].ran_at = min(30);              // 30 min against a 15-min window
  const cs = M.checksOf(s, NOW);
  assert.equal(by(cs, "job:send-owner-reminders").state, "bad");
  assert.equal(M.brokenOf(cs), 1);
  assert.deepEqual(M.loudOf(cs).map((c) => c.state), ["bad", "warn", "never", "never", "never"], "broken first");
});

test("4. a healthy platform: only the two unwired checks are loud, each with no time", () => {
  const cs = M.checksOf(healthy(), NOW);
  assert.deepEqual(M.loudOf(cs).map((c) => c.key), ["stripe", "netlify"]);
  assert.ok(M.loudOf(cs).every((c) => c.at === null && M.ago(c.at, NOW) === "never"));
  assert.ok(cs.filter((c) => c.state !== "never").every((c) => M.ago(c.at, NOW) !== "never"), "every proven check says when");
});

test("5. email and storage thresholds", () => {
  const s = healthy();
  s.email.failed = 2;
  assert.equal(by(M.checksOf(s, NOW), "email").state, "bad");
  s.email = { sent: 0, cap: 100, owner_email: null };
  assert.equal(by(M.checksOf(s, NOW), "email").says, "Nobody is told about signups");
  s.photo_store.used_bytes = 10 * GB;
  assert.equal(by(M.checksOf(s, NOW), "storage").state, "bad");
  s.photo_store = { used_bytes: 1 * GB, total_bytes: 10 * GB, committed_bytes: 14 * GB };
  assert.match(by(M.checksOf(s, NOW), "storage").says, /^Over-promised/);
  s.photo_store = null;
  assert.equal(by(M.checksOf(s, NOW), "storage").state, "never");
});

test("6. an old restore test is a warning; ago() reads in words", () => {
  const s = healthy();
  s.heartbeats[1].ran_at = min(60 * 24 * 120);
  assert.equal(by(M.checksOf(s, NOW), "restore").state, "warn");
  assert.equal(M.ago(min(0), NOW), "just now");
  assert.equal(M.ago(min(14), NOW), "14 min ago");
  assert.equal(M.ago(min(180), NOW), "3 hours ago");
  assert.equal(M.ago(min(60 * 24 * 3), NOW), "3 days ago");
});
