// ROADMAP 6.1 — WHICH RESTORE-DRILL RECEIPTS MAY PUT A DATE IN THE BACK OFFICE.
// Credential-free: reads the real receipt on disk and never writes anything.
// A date on that screen says "the records came back"; a receipt that does not
// prove it must be refused, and the real one must not be.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { whyNotProved, restoreRow, NEVER_STALE, PROJECT, BACKUPS_REPO } from "../scripts/restore-date.mjs";

const real = JSON.parse(readFileSync(new URL("../receipts/restore-drill.json", import.meta.url), "utf8"));
const bent = (f) => { const r = structuredClone(real); f(r); return r; };

test("the real receipt proves a restore, despite the drill's own status", () => {
  assert.equal(real.status, "fail", "the drill fails on Supabase's posture line; this test is about that case");
  assert.deepEqual(whyNotProved(real), []);
});

test("the row carries the receipt's date and counts, and can never alarm", () => {
  const row = restoreRow(real);
  assert.equal(row.ran_at, real.finished_at);
  assert.equal(row.detail.tables, real.completed_targets);
  assert.equal(row.stale_after_seconds, NEVER_STALE);
});

// 6.1b + 98.8: a nightly restored outside Supabase may write the date, but
// ONLY when the receipt carries the copy's verified origin — the backups repo,
// a nightly tag, the downloaded bytes' sha256 equal to GitHub's own, and
// decrypted with the key. These are the shapes restore-nightly.mjs writes.
const DIGEST = "sha256:" + "a247c964ed3c57ada4b230369452ee791559097443d60d049832b81563eb5098";
const nightly = (f = () => {}) => bent((r) => {
  r.check_id = "restore-nightly";
  r.dimensions.provenance = { kind: "nightly-release", repo: BACKUPS_REPO, tag: "backup-2026-10-13",
    asset: "dump-2026-10-13.pgc.age", github_digest: DIGEST, sha256: DIGEST, decrypted: true };
  f(r);
});

test("a nightly fetched from the backups repo, matching GitHub's digest and decrypted, counts", () => {
  assert.deepEqual(whyNotProved(nightly()), []);
});

// Planted untrusted sources. The first is the 98.8 defect itself: the invented
// fixture dump, saved under a nightly's name and passed back through --dump,
// labelled with the platform's project the way the held 6.1b script did.
const untrusted = {
  "the invented dump, named like a nightly, labelled as the platform": (r) => {
    r.dimensions.project = PROJECT;
    r.dimensions.provenance = { kind: "file", name: "backup-2026-10-13.pgc", sha256: DIGEST };
  },
  "the fixture self-test": (r) => { r.dimensions.project = "fixture"; r.dimensions.provenance = { kind: "fixture" }; },
  "no provenance at all (the held 6.1b receipt)": (r) => { delete r.dimensions.provenance; },
  "a caller who wrote kind=nightly-release over a file": (r) => { r.dimensions.provenance = { kind: "nightly-release", name: "backup-2026-10-13.pgc", sha256: DIGEST }; },
  "another repository": (r) => { r.dimensions.provenance.repo = "someone-else/detailing-platform-backups"; },
  "a tag that is not a nightly": (r) => { r.dimensions.provenance.tag = "backup-latest"; },
  "bytes that do not match GitHub's digest": (r) => { r.dimensions.provenance.sha256 = "sha256:" + "0".repeat(64); },
  "GitHub reported no digest": (r) => { r.dimensions.provenance.github_digest = null; },
  "never decrypted": (r) => { r.dimensions.provenance.decrypted = false; },
  "a nightly restore of another project": (r) => { r.dimensions.project = "adtlnvihwrcqcasqcjwd"; },
};
for (const [name, f] of Object.entries(untrusted)) {
  test(`refused for the date: ${name}`, () => assert.ok(whyNotProved(nightly(f)).length > 0));
}

const refusals = {
  "a restore mismatch": (r) => r.failures.push("restore mismatch — bookings: 12 rows, expected 13"),
  "a failure nobody recognises": (r) => r.failures.push("something new went wrong"),
  "the canary not caught": (r) => { r.canary.observed_failure = false; },
  "a sabotage run": (r) => r.warnings.unshift("run with --break=canary; this receipt is a sabotage, not a result"),
  "a table not compared": (r) => { r.completed_targets -= 1; },
  "zero tables": (r) => { r.discovered_targets = r.attempted_targets = r.completed_targets = 0; },
  "another project": (r) => { r.dimensions.project = "adtlnvihwrcqcasqcjwd"; },
  "no finish date": (r) => { delete r.finished_at; },
};
for (const [name, f] of Object.entries(refusals)) {
  test(`refused: ${name}`, () => assert.ok(whyNotProved(bent(f)).length > 0));
}
