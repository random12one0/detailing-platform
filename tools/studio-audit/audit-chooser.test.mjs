import test from "node:test";
import assert from "node:assert/strict";
import { choose, room, order, settingsOf, parsePlan, tierFor, effortFor, PROVIDERS, FIXED } from "./audit-chooser.mjs";

const NOW = Date.parse("2026-10-22T20:00:00Z");
const fresh = (five, week) => ({ at: new Date(NOW - 60000).toISOString(), fiveHour: { pct: five, resetsAt: NOW / 1000 + 3600 }, week: { pct: week, resetsAt: NOW / 1000 + 86400 } });
const ctx = (over = {}) => ({ s: settingsOf({ ai: over.ai || {} }), depth: over.depth || "medium", now: NOW, today: over.today || "2026-10-22",
  usage: over.usage || { claude: fresh(10, 20), codex: fresh(10, 20) }, down: over.down || {}, progress: over.progress || 0, plan: over.plan || null });
const audit = (kind = "security", extra = {}) => ({ role: "audit", kind, ...extra });

test("two auditors: Claude and ChatGPT", () => {
  assert.deepEqual(PROVIDERS, ["claude", "codex"]);
  assert.ok(FIXED.every((f) => f.id === "auto" || /^(claude|codex):/.test(f.id)), "every fixed choice is Claude or ChatGPT");
});
test("while Max lasts Claude finds, strong model on security", () => {
  const r = choose(audit("security"), ctx());
  assert.equal(r.provider, "claude"); assert.equal(r.model, "opus"); assert.equal(r.effort, "high");
});
test("after Max ends ChatGPT finds first; after its free plan ends it goes last", () => {
  assert.equal(choose(audit(), ctx({ today: "2026-10-26" })).provider, "codex");
  assert.deepEqual(order(settingsOf({ ai: {} }), "2027-02-01", {}, NOW), ["claude", "codex"]);
  assert.deepEqual(order(settingsOf({ ai: { prefer: "codex" } }), "2026-10-22", {}, NOW), ["codex", "claude"], "his preference goes first");
  assert.deepEqual(order(settingsOf({ ai: { prefer: "nobody" } }), "2026-10-22", {}, NOW), ["claude", "codex"], "an unknown preference is the plans' order");
});
test("stop lines: Claude past 80% of week stops; ChatGPT takes it; all out = wait with a reset time", () => {
  const c = ctx({ usage: { claude: fresh(10, 81), codex: fresh(10, 20) } });
  assert.equal(choose(audit(), c).provider, "codex");
  const all = ctx({ usage: { claude: fresh(95, 20), codex: fresh(10, 85) } });
  const w = choose(audit(), all);
  assert.equal(w.ok, false); assert.equal(w.wait, true); assert.ok(w.until > NOW, "it knows when to try again");
});
test("a run 80% done finishes past the stop lines, but not past a real limit", () => {
  const c = ctx({ progress: 0.85, usage: { claude: fresh(95, 95), codex: fresh(95, 95) } });
  assert.equal(choose(audit(), c).provider, "claude");
  const d = ctx({ progress: 0.85, down: { claude: { until: NOW + 1000 } }, usage: { claude: fresh(95, 95), codex: fresh(95, 95) }, ai: { codex: false } });
  assert.equal(choose(audit(), d).ok, false);
});
test("a stale reading counts as unknown, not as full", () => {
  const old = { ...fresh(99, 99), at: new Date(NOW - 3 * 3600000).toISOString() };
  assert.equal(room("claude", ctx({ usage: { claude: old } })).ok, true);
});
test("second check goes to a different company; same company only with another model", () => {
  const chk = { role: "check", kind: "security", severity: "blocker", finder: { provider: "claude", model: "opus" } };
  assert.notEqual(choose(chk, ctx()).provider, "claude");
  const onlyClaude = ctx({ ai: { codex: false } });
  const r = choose(chk, onlyClaude);
  assert.equal(r.provider, "claude"); assert.equal(r.model, "claude-sonnet-5-5");
});
test("a fixed choice waits for its AI instead of switching", () => {
  const c = ctx({ ai: { kind: { security: "codex:gpt-6.1-sol" } }, usage: { claude: fresh(1, 1), codex: fresh(99, 1) } });
  const r = choose(audit("security"), c);
  assert.equal(r.ok, false); assert.match(r.why, /fixed choice/);
  assert.equal(choose(audit("security"), ctx({ ai: { kind: { security: "codex:gpt-6.1-sol" } } })).model, "gpt-6.1-sol");
});
test("depth: quick is middle strength at medium effort; deep is strongest; Codex never above high", () => {
  assert.equal(tierFor(audit("security"), "quick"), 2);
  assert.equal(tierFor(audit("looks"), "deep"), 3);
  const q = choose(audit("security"), ctx({ depth: "quick" }));
  assert.equal(q.model, "claude-sonnet-5-5"); assert.equal(q.effort, "medium");
  const d = choose(audit("security"), ctx({ depth: "deep", usage: { claude: fresh(99, 99), codex: fresh(1, 1) } }));
  assert.equal(d.provider, "codex"); assert.equal(d.effort, "high");
  assert.equal(effortFor("claude", audit(), "deep", settingsOf({}), { fiveHour: 75, week: 10 }), "high", "past 70% xhigh is held at high");
});
test("the planner's suggestion is used only for an AI with room", () => {
  const plan = { security: { provider: "codex", model: "gpt-6.1-sol", why: "cheap sweep" } };
  assert.equal(choose(audit("security"), ctx({ plan })).provider, "codex");
  assert.equal(choose(audit("security"), ctx({ plan, down: { codex: { until: NOW + 60000 } } })).provider, "claude");
  assert.equal(parsePlan('ok {"code":{"provider":"codex","model":"gpt-6.1-sol","why":"x"},"bad":{"provider":"x"}}').code.provider, "codex");
  assert.equal(parsePlan("no json"), null);
});
test("gap rule: Claude far more used than ChatGPT -> ChatGPT goes first", () => {
  assert.equal(choose(audit(), ctx({ usage: { claude: fresh(60, 70), codex: fresh(5, 10) } })).provider, "codex");
});
test("a job on the main checkout goes to Claude only (ChatGPT has no key-file guard)", () => {
  const r = choose({ role: "audit", kind: "code", noCodex: true }, ctx({ ai: { kind: { code: "codex:gpt-6.1-sol" } } }));
  assert.equal(r.provider, "claude");
  assert.equal(choose({ role: "audit", kind: "code", noCodex: true }, ctx({ ai: { claude: false } })).ok, false);
});
