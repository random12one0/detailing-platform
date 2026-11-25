import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openStore } from "./audit-store.mjs";

test("store: run → cells → findings → summary loop counts", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audit-store-"));
  const s = openStore(path.join(dir, "a.db"));
  try {
    const r = s.newRun({ title: "Booking", scope: { areas: ["Booking"] }, kinds: ["code"] });
    assert.equal(r.id, "run-1");
    assert.deepEqual(r.scope, { areas: ["Booking"] });
    const c = s.addCell({ run_id: r.id, area: "Booking", kind: "code" });
    s.setCell(c, { status: "findings" });
    const a = s.addFinding({ run_id: r.id, cell_id: c, category: "defect", severity: "blocker", title: "x", files: ["a.ts:1"] });
    const b = s.addFinding({ run_id: r.id, cell_id: c, category: "defect", severity: "before", title: "y" });
    assert.equal(a, "R1-01"); assert.equal(b, "R1-02");
    assert.deepEqual(s.finding(a).files, ["a.ts:1"]);
    s.setFinding(a, { status: "confirmed" });
    s.setFinding(b, { status: "rejected" });
    s.addEvidence({ run_id: r.id, cell_id: c, finding_id: a, kind: "file", ref: "a.ts:1" });
    assert.equal(s.evidenceFor(a).length, 1);
    s.event(r.id, c, "step", "reading a.ts");
    assert.equal(s.events(r.id, 0).length, 1);
    const sum = s.summary();
    assert.deepEqual(sum.loop, { found: 2, passed: 1, sent: 0, rechecked: 0 });
    assert.equal(sum.waiting.blocker, 1);
    assert.equal(sum.waiting.before, 0);
    s.setFinding(a, { status: "sent", roadmap_id: "100.1" });
    assert.equal(s.summary().loop.sent, 1);
    assert.equal(s.summary().waiting.blocker, 0);
    s.set("bench", { caught: 8, of: 10 });
    assert.deepEqual(s.get("bench"), { caught: 8, of: 10 });
  } finally { s.close(); rmSync(dir, { recursive: true, force: true }); }
});
