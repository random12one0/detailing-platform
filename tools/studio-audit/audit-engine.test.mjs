import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openStore } from "./audit-store.mjs";
import { createEngine, checkRefs, parseRef, checkerFor, untilFrom, providerOf } from "./audit-engine.mjs";
import * as L from "./lib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));

test("refs: real lines pass, invented ones are caught", () => {
  assert.deepEqual(parseRef("a/b.ts:3-9"), { file: "a/b.ts", from: 3, to: 9 });
  const r = checkRefs(["audit-store.mjs:1", "audit-store.mjs:99999", "nope.ts:1", "not a ref"], HERE);
  assert.deepEqual(r.good, ["audit-store.mjs:1"]);
  assert.equal(r.bad.length, 3);
  assert.equal(checkerFor("opus", {}), "claude-sonnet-5-5");
  assert.equal(checkerFor("claude-sonnet-5-5", {}), "opus");
});

test("engine: a whole run with a fake AI", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-engine-"));
  const store = openStore(path.join(dir, "a.db"));
  // map items so areaBrief has something; buildMap needs staging, so the run is made by hand here
  const eng = createEngine({ store, HERE, REPO: HERE, C: { audit: { parallel: 3, capUsd: 5 } }, readStream: L.readAnyStream, plainStep: L.plainStep,
    agentCmd: `node "${path.join(HERE, "test-fixtures", "fake-agent.mjs")}"` });
  try {
    const run = store.newRun({ title: "test", scope: { areas: ["Booking", "Money"] }, kinds: ["code"], cap_usd: 5 });
    store.addCell({ run_id: run.id, area: "Booking", kind: "code", model: "opus" });
    store.addCell({ run_id: run.id, area: "Money", kind: "code", model: "opus" });
    store.setRun(run.id, { status: "running", started_at: new Date().toISOString() });
    eng.pump();
    for (let i = 0; i < 200 && store.run(run.id).status === "running"; i++) { await new Promise((r) => setTimeout(r, 150)); eng.pump(); }
    const r = store.run(run.id);
    assert.equal(r.status, "done");
    const f = Object.fromEntries(store.findings(run.id).map((x) => [x.title, x]));
    assert.equal(f["REAL thing"].status, "confirmed");
    assert.equal(f["REAL thing"].severity, "blocker", "the checker may correct severity");
    assert.equal(f["INVENTED lines"].status, "rejected");
    assert.equal(f["INVENTED lines"].second_check.by, "engine");
    assert.equal(f["DUP of roadmap"].status, "duplicate");
    assert.equal(f["DUP of roadmap"].duplicate_of, "97.1");
    assert.equal(f["FALSE alarm"].status, "rejected");
    assert.equal(f["An idea"].status, "confirmed", "an idea needs no file:line");
    const cells = Object.fromEntries(store.cells(run.id).map((c) => [c.area, c]));
    assert.equal(cells.Booking.status, "findings");
    assert.equal(cells.Money.status, "shelved", "no findings.json twice = shelved");
    assert.equal(cells.Money.attempts, 2);
    assert.ok(r.cost_usd > 0.05 && r.cost_usd < 0.2, `cost added up: ${r.cost_usd}`);
  } finally { eng.close(); store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("engine: nothing new starts past the cap", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-cap-"));
  const store = openStore(path.join(dir, "a.db"));
  const eng = createEngine({ store, HERE, REPO: HERE, C: { audit: { parallel: 2 } }, readStream: L.readAnyStream, plainStep: L.plainStep,
    agentCmd: `node "${path.join(HERE, "test-fixtures", "fake-agent.mjs")}"` });
  try {
    const run = store.newRun({ title: "cap", scope: {}, kinds: ["code"], cap_usd: 1 });
    store.addCell({ run_id: run.id, area: "Booking", kind: "code" });
    store.setRun(run.id, { status: "running", cost_usd: 1.5 });
    eng.pump();
    assert.equal(eng.active(), 0);
    assert.equal(store.run(run.id).status, "stopped");
    assert.match(store.run(run.id).note, /\$1 spending limit/);
  } finally { eng.close(); store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("engine: re-check only what the belt ticked, and believe the code, not the tick", async () => {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const dir = mkdtempSync(path.join(tmpdir(), "audit-recheck-"));
  const repo = path.join(dir, "repo"); mkdirSync(repo);
  writeFileSync(path.join(repo, "ROADMAP.md"), "- [x] **100.1 — a (audit R1-01).**\n- [x] **100.2 — b (audit R1-02).**\n- [ ] **100.3 — c (audit R1-03).**\n");
  const store = openStore(path.join(dir, "a.db"));
  const eng = createEngine({ store, HERE, REPO: repo, C: { audit: { parallel: 2 } }, readStream: L.readAnyStream, plainStep: L.plainStep,
    agentCmd: `node "${path.join(HERE, "test-fixtures", "fake-agent.mjs")}"` });
  try {
    const r0 = store.newRun({ title: "old", scope: {}, kinds: ["code"] }); store.setRun(r0.id, { status: "done" });
    const mk = (title, rid) => store.addFinding({ run_id: r0.id, category: "defect", severity: "before", title, files: ["x.ts:1"], finder_role: "code", finder_model: "opus", status: "sent", roadmap_id: rid });
    const a = mk("REALLY FIXED thing", "100.1"), b = mk("still broken thing", "100.2"), c = mk("not ticked yet", "100.3");
    assert.deepEqual(eng.tickedSent().map((f) => f.id).sort(), [a, b].sort());
    const r = await eng.recheck();
    assert.equal(r.ok, true);
    for (let i = 0; i < 100 && store.latestRun().status === "running"; i++) { await new Promise((x) => setTimeout(x, 150)); eng.pump(); }
    assert.equal(store.latestRun().status, "done");
    assert.equal(store.finding(a).status, "rechecked");
    assert.equal(store.finding(b).status, "sent", "a tick the code does not back up goes back to sent");
    assert.match(store.finding(b).second_check.recheck.why, /same code/);
    assert.equal(store.finding(c).status, "sent", "unticked: left alone");
    assert.equal(eng.tickedSent().length, 0, "each is re-checked once");
  } finally { eng.close(); store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("engine: a problem found again in a LATER run is not asked again; distinct ones in one run are kept", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-again-"));
  const store = openStore(path.join(dir, "a.db"));
  const eng = createEngine({ store, HERE, REPO: HERE, C: { audit: { parallel: 3, capUsd: 50 } }, readStream: L.readAnyStream, plainStep: L.plainStep,
    agentCmd: `node "${path.join(HERE, "test-fixtures", "fake-agent.mjs")}"` });
  const runOnce = async (title) => {
    const run = store.newRun({ title, scope: {}, kinds: ["code"], cap_usd: 50 });
    store.addCell({ run_id: run.id, area: "Booking", kind: "code", model: "opus" });
    store.setRun(run.id, { status: "running" });
    eng.pump();
    for (let i = 0; i < 200 && store.run(run.id).status === "running"; i++) { await new Promise((r) => setTimeout(r, 150)); eng.pump(); }
    return run;
  };
  try {
    const r1 = await runOnce("first");
    assert.equal(store.findings(r1.id).length, 5, "five distinct findings in one run, even three within a few lines of one file");
    const r2 = await runOnce("second");
    assert.equal(store.findings(r2.id).length, 0, "the same five are recognised, not asked again");
    assert.ok(store.events(r2.id, 0).some((e) => e.kind === "again"));
  } finally { eng.close(); store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("engine: no AI with room = the run waits and says why; it carries on by itself when one has room", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-wait-"));
  const store = openStore(path.join(dir, "a.db"));
  const at = () => new Date().toISOString();
  let claudeWeek = 95;   // past his 80% stop
  const eng = createEngine({ store, HERE, REPO: HERE, notify: () => {}, C: { audit: { parallel: 2, capUsd: 50, ai: { codex: false, aiPick: false } } }, readStream: L.readAnyStream, plainStep: L.plainStep,
    agentCmd: `node "${path.join(HERE, "test-fixtures", "fake-agent.mjs")}"`,
    readings: () => ({ usage: { claude: { at: at(), fiveHour: { pct: 5 }, week: { pct: claudeWeek, resetsAt: Date.now() / 1000 + 3600 } } }, down: {} }) });
  try {
    const run = store.newRun({ title: "w", scope: { depth: "quick" }, kinds: ["code"], cap_usd: 50 });
    store.addCell({ run_id: run.id, area: "Booking", kind: "code" });
    store.setRun(run.id, { status: "running" });
    eng.pump();
    assert.equal(store.run(run.id).status, "waiting");
    assert.match(store.run(run.id).note, /80%/);
    assert.equal(eng.active(), 0, "nothing started past his stop line");
    claudeWeek = 40;
    for (let i = 0; i < 200 && store.run(run.id).status !== "done"; i++) { eng.pump(); await new Promise((r) => setTimeout(r, 150)); }
    assert.equal(store.run(run.id).status, "done");
    const cell = store.cells(run.id)[0];
    assert.equal(cell.model, "claude-sonnet-5-5", "quick depth: middle-strength model");
    assert.ok(store.events(run.id, 0).some((e) => e.kind === "resume"));
  } finally { eng.close(); store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("engine: a finding is second-checked by a different AI company than the one that found it", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-cross-"));
  const store = openStore(path.join(dir, "a.db"));
  const at = () => new Date().toISOString();
  // a run audits its own copy (never the main checkout, which only Claude may read): a throwaway git folder here
  const { execFileSync } = await import("node:child_process"); const { mkdirSync, copyFileSync } = await import("node:fs");
  const copy = path.join(dir, "copy"); mkdirSync(copy); execFileSync("git", ["init", "-q", copy]); copyFileSync(path.join(HERE, "audit-store.mjs"), path.join(copy, "audit-store.mjs"));
  const eng = createEngine({ store, HERE, REPO: path.join(dir, "main"), C: { audit: { parallel: 2, capUsd: 50, ai: { aiPick: false } } }, readStream: L.readAnyStream, plainStep: L.plainStep,
    agentCmd: `node "${path.join(HERE, "test-fixtures", "fake-agent.mjs")}"`,
    readings: () => ({ usage: { claude: { at: at(), fiveHour: { pct: 5 }, week: { pct: 5 } }, codex: { at: at(), fiveHour: { pct: 5 }, week: { pct: 5 } } }, down: {} }) });
  try {
    const run = store.newRun({ title: "x", scope: { checkout: copy }, kinds: ["code"], cap_usd: 50 });
    store.addCell({ run_id: run.id, area: "Booking", kind: "code" });
    store.setRun(run.id, { status: "running" });
    for (let i = 0; i < 200 && store.run(run.id).status !== "done"; i++) { eng.pump(); await new Promise((r) => setTimeout(r, 150)); }
    const checked = store.findings(run.id).filter((f) => f.second_check?.by && f.second_check.by !== "engine");
    assert.ok(checked.length >= 2);
    // which company finds depends on the date (Claude first only until claudeMaxUntil), so assert the rule itself: the checker's company is not the finder's
    for (const f of checked) assert.notEqual(providerOf(f.second_check.by), providerOf(f.finder_model), `${f.title}: found by ${f.finder_model}, checked by ${f.second_check.by}`);
  } finally { eng.close(); store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("engine: on the main checkout (no audit copy) only Claude is used, whatever the settings say", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-main-"));
  const store = openStore(path.join(dir, "a.db"));
  const at = () => new Date().toISOString();
  const eng = createEngine({ store, HERE, REPO: HERE, C: { audit: { parallel: 2, capUsd: 50, ai: { aiPick: false, kind: { code: "codex:gpt-6.1-sol", check: "codex:gpt-6.1-sol" } } } }, readStream: L.readAnyStream, plainStep: L.plainStep,
    agentCmd: `node "${path.join(HERE, "test-fixtures", "fake-agent.mjs")}"`,
    readings: () => ({ usage: { claude: { at: at(), fiveHour: { pct: 5 }, week: { pct: 5 } }, codex: { at: at(), fiveHour: { pct: 5 }, week: { pct: 5 } } }, down: {} }) });
  try {
    const run = store.newRun({ title: "m", scope: {}, kinds: ["code"], cap_usd: 50 });
    store.addCell({ run_id: run.id, area: "Booking", kind: "code" });
    store.setRun(run.id, { status: "running" });
    for (let i = 0; i < 200 && store.run(run.id).status !== "done"; i++) { eng.pump(); await new Promise((r) => setTimeout(r, 150)); }
    assert.equal(store.cells(run.id)[0].model, "opus");
    for (const f of store.findings(run.id).filter((x) => x.second_check?.by && x.second_check.by !== "engine")) assert.doesNotMatch(f.second_check.by, /^gpt/);
  } finally { eng.close(); store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("engine: ChatGPT out of its limit puts the square back (not a failed try) and rests ChatGPT until the time it named", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-limit-"));
  const store = openStore(path.join(dir, "a.db"));
  const at = () => new Date().toISOString();
  const { execFileSync } = await import("node:child_process"); const { mkdirSync } = await import("node:fs");
  const copy = path.join(dir, "copy"); mkdirSync(copy); execFileSync("git", ["init", "-q", copy]);
  const eng = createEngine({ store, HERE, REPO: path.join(dir, "main"), C: { audit: { parallel: 1, capUsd: 50, ai: { aiPick: false, kind: { code: "codex:gpt-6.1-sol" } } } }, readStream: L.readAnyStream, plainStep: L.plainStep,
    agentCmd: `node "${path.join(HERE, "test-fixtures", "fake-agent.mjs")}"`,
    readings: () => ({ usage: { codex: { at: at(), fiveHour: { pct: 5 }, week: { pct: 5 } } }, down: store.get("aiDown") || {} }) });
  try {
    const run = store.newRun({ title: "l", scope: { checkout: copy }, kinds: ["code"], cap_usd: 50 });
    store.addCell({ run_id: run.id, area: "Money", kind: "code" });
    store.setRun(run.id, { status: "running" });
    for (let i = 0; i < 60 && store.run(run.id).status === "running"; i++) { eng.pump(); await new Promise((r) => setTimeout(r, 150)); }
    const c = store.cells(run.id)[0];
    assert.equal(c.status, "todo", "back in the queue, not shelved");
    assert.equal(c.attempts, 0, "the limit was not counted as a try");
    assert.ok(store.get("aiDown").codex.until > Date.now(), "ChatGPT rests");
    assert.equal(store.run(run.id).status, "waiting", "his fixed choice waits for ChatGPT");
  } finally { eng.close(); store.close(); rmSync(dir, { recursive: true, force: true }); }
});
test("untilFrom reads the time a limit message names", () => {
  const now = new Date(2026, 9, 23, 0, 40).getTime();
  assert.equal(new Date(untilFrom("try again at 1:50 AM.", now)).getHours(), 1);
  assert.ok(untilFrom("try again at 1:50 AM.", now) - now < 2 * 3600000);
  assert.equal(untilFrom("no time here", now), null);
});
