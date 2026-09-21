// ROADMAP 2.8 FOLLOW-UP — the unverified-address flag (and, since ROADMAP
// 2.3, the crude zone-mismatch flag) never reaches the unanswered-request
// nudge or the owner's own evening-before reminder, because `emailDataFor()`
// in send-owner-reminders/index.ts never mapped `address_source` or
// `travel_zone_address_mismatch` onto the object it hands to
// `ownerWhereRow()`. 2.8's own writeup claimed this was covered — "the
// unanswered-request nudge got it too, via one shared ownerWhereRow()
// helper" — and said it was proven on a real screen. The proof only
// exercised a PICKED address, where the row is correctly blank either way,
// so the gap was never actually exercised by that proof.
//
// A pure structural check, not a Deno-runtime import: send-owner-
// reminders/index.ts calls `Deno.serve(...)` at module scope and imports a
// `jsr:` specifier, so it cannot be loaded under Node. Same shape as
// customer-reminder.test.mjs § 2 — assert the SHAPE of the shared function
// rather than a spelling, and confirm the slice was actually found before
// trusting a negative.
//
//   node --test tests/owner-reminder-address-flag.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(
  new URL("../supabase/functions/send-owner-reminders/index.ts", import.meta.url),
  "utf8",
);

const from = src.indexOf("async function emailDataFor");
const next = src.indexOf("\nasync function", from + 10);
const body = from < 0 ? "" : src.slice(from, next > 0 ? next : src.length);

test("emailDataFor was actually found", () => {
  assert.ok(from > 0 && body.length > 200, `slice length ${body.length} — every check below measures nothing`);
});

test("emailDataFor maps address_source onto the shared email data", () => {
  assert.match(
    body,
    /addressSource:\s*b\.address_source/,
    "without this, ownerWhereRow() always sees addressSource as undefined on the owner reminder and the stale-request nudge, so the unverified-address note can never render on either",
  );
});

test("emailDataFor maps travel_zone_address_mismatch onto the shared email data", () => {
  assert.match(
    body,
    /travelZoneAddressMismatch:\s*b\.travel_zone_address_mismatch/,
    "same gap, ROADMAP 2.3's flag",
  );
});
