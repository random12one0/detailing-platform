// ROADMAP 3.4f — the job record's "email did not arrive" line (S1) and the
// built-in "Booking confirmed" text (D1). Credential-free: one import of the
// production rule and four filesystem reads. No network, no database.
//
// Run: node --test tests/job-mail-warning.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { jobMailWarning, UNDELIVERABLE } from "../app/src/lib/mailWarning.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const today = "2026-10-10";
const on = (status, extra = {}) =>
  jobMailWarning({ status, ...extra }, { bookingDate: today, today });

// Every stored status in `email_sends` (the table's check constraint), and
// whether a job's line is drawn for it. Declared with an EQUALITY on the
// population so an eighth status cannot arrive unjudged.
const EXPECT = {
  delivered: false, sent: false, bounced: true, complained: true,
  failed: true, refused: true, skipped: true, // skipped only as F6, below
};

test("the population is the table's seven statuses", () => {
  const sql = read("supabase/migrations/20260916010000_every_email_leaves_a_row.sql");
  const m = sql.match(/status\s+in\s*\(([^)]*)\)/i);
  assert.ok(m, "could not find the status check in the migration");
  const statuses = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
  assert.deepEqual(statuses, Object.keys(EXPECT).sort());
});

test("each status draws (or does not draw) the line", () => {
  for (const [status, drawn] of Object.entries(EXPECT)) {
    const extra = status === "skipped" ? { detail: UNDELIVERABLE } : {};
    assert.equal(Boolean(on(status, extra)), drawn, status);
  }
});

test("a skip that is not a made-up address draws nothing (F7, F8)", () => {
  assert.equal(on("skipped", { detail: "email is not switched on for this deployment" }), null);
  assert.equal(on("skipped", { detail: "Not sent: the business has no mailing address" }), null);
});

test("our side never says the address is wrong; their side always does", () => {
  assert.doesNotMatch(on("refused"), /address with them/);
  assert.match(on("refused"), /our side/);
  assert.match(on("bounced"), /Check the address/);
  assert.match(on("complained"), /spam/);
});

test("it clears itself: no row, a good row, or a job whose day has passed", () => {
  assert.equal(jobMailWarning(null, { bookingDate: today, today }), null);
  assert.equal(on("delivered"), null);
  assert.equal(jobMailWarning({ status: "bounced" }, { bookingDate: "2026-10-09", today }), null);
  assert.ok(jobMailWarning({ status: "bounced" }, { bookingDate: "2026-10-11", today }));
});

test("the made-up-address detail is the one send-email actually writes", () => {
  assert.ok(read("supabase/functions/send-email/index.ts").includes(`"${UNDELIVERABLE}"`));
});

test("every sentence has its Spanish key (a missing one falls back silently)", () => {
  const es = read("app/src/lib/strings/appEs.js");
  const statuses = ["bounced", "failed", "refused", "complained"];
  for (const s of statuses) assert.ok(es.includes(JSON.stringify(on(s))), s);
});

test("D1: the Booking confirmed text ships, in English and Spanish, with fillable tokens", () => {
  const src = read("app/src/lib/templates.js");
  const block = src.slice(src.indexOf('key: "booking_confirmed"'));
  const body = block.match(/body: "([^"]+)"/)?.[1];
  assert.ok(body, "no booking_confirmed template");
  const known = [...src.matchAll(/\["(\{\{[a-z_]+\}\})",/g)].map((m) => m[1]);
  assert.ok(known.length >= 10, "placeholder list not found");
  for (const tok of body.match(/\{\{[a-z_]+\}\}/g)) assert.ok(known.includes(tok), tok);
  const es = read("app/src/lib/strings/appEs.js");
  assert.ok(es.includes(JSON.stringify(body)), "Spanish key missing for the body");
});

test("both callers offer templates a business was seeded without", () => {
  assert.match(read("app/src/screens/more/MessageTemplates.jsx"), /missingDefaults\(data \?\? \[\]\)/);
  assert.match(read("app/src/components/BookingDetail.jsx"), /missingDefaults\(rows\)/);
});
