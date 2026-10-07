// ROADMAP 4.1 — THE AUDIT HISTORY, RUN IN MEMORY.
//
//   node --test tests/action-log.test.mjs
//
// Credential-free, no network, no database, no Deno. It loads
// supabase/functions/_shared/actionLog.ts (import-free, so Node 24 strips the types)
// and hands it fake rows and a fake client.
//
// WHAT IT PROVES, and what it does not. That the rows owed for a job change are the
// right rows: the right action named, the changed field before and after and nothing
// else (no customer name, phone or address), the actor and business from the member,
// nothing written when nothing moved, and a failed write reported and never thrown.
// That the migration declares the table locked and append-only, and that
// `update-booking` calls the helper on both its paths, read as text.
//
// THIS FILE READS THE SQL AS TEXT; it does not run it. `tests/action-log-sql.test.mjs` executes the
// migration on a throwaway in-process Postgres (PGlite) and shows the append-only trigger refuse.
// It does not prove the deployed `update-booking` writes the row, because that
// function is not published, and it does not type-check the TypeScript, because no
// compiler is installed here (Node only strips the types). Each of those is the
// first thing a publish shows.
//
// BREAK IT ON PURPOSE: § 5 rebuilds the helper with ONE guard removed at a time and
// asserts the matching probe goes red. A check nobody has seen fail is how this repo
// shipped six that tested nothing.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as real from "../supabase/functions/_shared/actionLog.ts";

const HELPER = "supabase/functions/_shared/actionLog.ts";
const MIGRATION = "supabase/migrations/20261006050000_action_log.sql";
const FUNCTION = "supabase/functions/update-booking/index.ts";

const member = { userId: "u-owner", businessId: "b-1", role: "owner" };
const ID = "11111111-1111-4111-8111-111111111111";
const PII = { customer_name: "Tom Okafor", customer_phone: "555-0100", address: "12 Elm St", customer_email: "tom@example.com" };
const row = (over = {}) => ({ id: ID, status: "confirmed", payment_status: "unpaid", deleted_at: null, ...PII, ...over });

// One probe per property. Each returns true when the property HOLDS, so a sabotaged
// build is expected to turn exactly the matching ones false.
async function probes(mod) {
  const P = {};
  P.complete = mod.rowsFor(member, ID, row(), row({ status: "completed" })).map((r) => r.action).join() === "job.complete";
  P.cancelNoShow = [["cancelled", "job.cancel"], ["no_show", "job.no_show"], ["confirmed", "job.reopen"]]
    .every(([to, a]) => mod.rowsFor(member, ID, row({ status: "completed" }), row({ status: to }))[0]?.action === a);
  const one = mod.rowsFor(member, ID, row(), row({ status: "completed" }));
  P.beforeAfter = one.length === 1 && one[0].before.status === "confirmed" && one[0].after.status === "completed";
  P.nothingMoved = mod.rowsFor(member, ID, row(), row({ customer_name: "A different edit" })).length === 0;
  P.waive = mod.rowsFor(member, ID, row(), row({ payment_status: "waived" }))[0]?.action === "payment.waive"
    && mod.rowsFor(member, ID, row(), row({ payment_status: "waived" }))[0]?.before.payment_status === "unpaid";
  const all = JSON.stringify([...one, ...mod.rowsFor(member, ID, row(), row({ deleted_at: "2026-10-06T00:00:00Z" }))]);
  P.noPersonalData = !/Okafor|555-0100|Elm St|tom@example/.test(all);
  P.actor = one[0]?.actor_id === "u-owner" && one[0]?.business_id === "b-1" && one[0]?.actor_role === "owner"
    && one[0]?.subject_table === "bookings" && one[0]?.subject_id === ID;
  const del = mod.rowsFor(member, ID, row(), row({ deleted_at: "2026-10-06T00:00:00Z" }));
  P.delete = del.length === 1 && del[0].action === "job.delete" && del[0].before.deleted_at === null;
  // The write itself, against a fake client.
  const seen = [];
  const db = (error) => ({ from: (t) => ({ insert: async (rows) => { seen.push([t, rows]); return { error }; } }) });
  const silence = console.error; console.error = () => {};
  try {
    seen.length = 0;
    const ok = await mod.recordActions(db(null), member, ID, row(), row({ status: "cancelled" }));
    P.writes = ok === true && seen.length === 1 && seen[0][0] === "action_log" && seen[0][1].length === 1;
    seen.length = 0;
    const none = await mod.recordActions(db(null), member, ID, row(), row({ customer_name: "x" }));
    P.writesNothingWhenNothingMoved = none === true && seen.length === 0;
    P.reportsFailure = (await mod.recordActions(db({ message: "boom" }), member, ID, row(), row({ status: "cancelled" }))) === false;
    const throwing = { from: () => ({ insert: async () => { throw new Error("network"); } }) };
    P.neverThrows = (await mod.recordActions(throwing, member, ID, row(), row({ status: "cancelled" }))) === false;
  } finally { console.error = silence; }
  return P;
}

test("1 · every property holds on the real helper", async () => {
  const P = await probes(real);
  const red = Object.entries(P).filter(([, v]) => v !== true).map(([k]) => k);
  assert.deepEqual(red, [], "properties that do not hold: " + red.join(", "));
  assert.ok(Object.keys(P).length >= 10, "the probe list shrank");
});

test("2 · the migration declares the table locked, append-only and free of personal data", () => {
  const sql = readFileSync(MIGRATION, "utf8").replace(/^\s*--.*$/gm, "");
  assert.match(sql, /create table if not exists public\.action_log/);
  assert.match(sql, /alter table public\.action_log enable row level security/);
  assert.match(sql, /alter table public\.action_log force row level security/);
  assert.ok(!/create policy/i.test(sql), "a policy would open the table to a browser");
  assert.match(sql, /revoke all on public\.action_log from anon, authenticated/);
  assert.match(sql, /before update or delete on public\.action_log/);
  assert.match(sql, /before truncate on public\.action_log/);
  assert.match(sql, /before\s+jsonb not null/);
  assert.match(sql, /after\s+jsonb not null/);
  assert.ok(!/references\s/i.test(sql), "a foreign key would fire the delete guard when a business is removed");
  assert.ok(!/customer|phone|address|email/i.test(sql), "the table must not have a column for personal data");
});

const wiring = (src) => ({
  imported: /import \{ recordActions \} from "\.\.\/_shared\/actionLog\.ts"/.test(src),
  calls: (src.match(/await recordActions\(supabase, member, bookingId, current, (deleted|data)\)/g) ?? []).length,
  reported: (src.match(/audit_recorded: false/g) ?? []).length,
});

test("3 · update-booking writes the row on both paths and reports one that did not store", () => {
  const w = wiring(readFileSync(FUNCTION, "utf8"));
  assert.equal(w.imported, true);
  assert.equal(w.calls, 2, "the delete path and the update path");
  assert.equal(w.reported, 2);
});

test("4 · canary: the wiring reader sees a call removed and a report removed", () => {
  const src = readFileSync(FUNCTION, "utf8");
  assert.equal(wiring(src.replace("await recordActions(supabase, member, bookingId, current, deleted)", "true")).calls, 1);
  assert.equal(wiring(src.replace("await recordActions(supabase, member, bookingId, current, data)", "true")).calls, 1);
  assert.equal(wiring(src.replace(/\.\.\.\(audited \? \{\} : \{ audit_recorded: false \}\)/, "")).reported, 1);
});

// ── 5 · break it on purpose ─────────────────────────────────────────────────
const dir = mkdtempSync(path.join(tmpdir(), "action-log-"));
let n = 0;
async function build(from, to) {
  const src = readFileSync(HELPER, "utf8");
  assert.equal(src.split(from).length, 2, "the sabotage did not apply: " + from);
  const file = path.join(dir, `actionLog-${++n}.ts`);
  writeFileSync(file, src.replace(from, () => to));
  return import(pathToFileURL(file).href);
}
const SABOTAGE = [
  ["before takes the new value", "before: { status: current.status ?? null }", "before: { status: after.status ?? null }", ["beforeAfter"]],
  ["logs a change that did not happen", "if (!same(current.status, after.status)) {", "if (true) {", ["nothingMoved"]],
  ["actor not taken from the member", "actor_id: member.userId,", 'actor_id: "someone",', ["actor"]],
  ["copies the booking into the row", "before: { status: current.status ?? null }", "before: { ...current }", ["noPersonalData"]],
  ["a failed insert reads as success", 'console.error("action_log insert failed:", error); return false;', 'console.error("action_log insert failed:", error); return true;', ["reportsFailure"]],
  ["a thrown insert escapes", "} catch (e) {\n    console.error(\"action_log insert threw:\", e);\n    return false;\n  }", "} finally { }", ["neverThrows"]],
  ["writes when nothing moved", "if (rows.length === 0) return true;", "", ["writesNothingWhenNothingMoved"]],
  ["a waiver is not named", '"payment.waive"', '"payment.set"', ["waive"]],
];

test("5 · each guard, removed alone, turns its own probe red", async () => {
  for (const [name, from, to, expect] of SABOTAGE) {
    let mod;
    try { mod = await build(from, to); } catch (e) { if (/sabotage did not apply/.test(String(e.message))) throw e; mod = null; }
    const P = mod ? await probes(mod).catch(() => null) : null;
    if (P === null) {
      // A sabotage that makes the module throw has made `neverThrows` true to its name: the probe itself saw it.
      assert.ok(expect.includes("neverThrows"), `${name}: the build threw but was not expected to`);
      continue;
    }
    const red = Object.entries(P).filter(([, v]) => v !== true).map(([k]) => k);
    for (const e of expect) assert.ok(red.includes(e), `${name}: expected "${e}" to go red, red was [${red.join(", ")}]`);
  }
});
