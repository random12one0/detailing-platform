// ROADMAP 2.3 — the crude, honest flag: does the picked travel zone's own
// name show up anywhere in the address text. Not distance, not a gate —
// see FOR-ANDREW.md for why real distance pricing is a decision, not a fix.
//
//   node --test tests/zone-address-mismatch.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { zoneAddressMismatch } from "../supabase/functions/_shared/pricing.ts";

test("catches the named example — San Diego address, Long Beach zone", () => {
  assert.equal(
    zoneAddressMismatch("Long Beach", "412 Ocean Blvd, San Diego, CA 92101"),
    true,
  );
});

test("does not flag a real match", () => {
  assert.equal(
    zoneAddressMismatch("Long Beach", "412 Ocean Blvd, Long Beach, CA 90802"),
    false,
  );
});

test("crude on purpose — a correctly-named city does not catch a far street inside it", () => {
  // Long Beach is a real, large city; a street at its far edge, 20 miles
  // from a shop at the near edge, still contains the word "Long Beach" and
  // this check has no way to know it is far. Documented, not a surprise.
  assert.equal(
    zoneAddressMismatch("Long Beach", "9999 Distant Ave, Long Beach, CA 90810"),
    false,
  );
});

test("a zone name with nothing but a distance in it is skipped, not guessed at", () => {
  assert.equal(zoneAddressMismatch("Within 10 miles", "412 Ocean Blvd, San Diego, CA"), false);
  assert.equal(zoneAddressMismatch("Zone 1", "412 Ocean Blvd, San Diego, CA"), false);
});

test("no zone or no address — nothing to compare, never flagged", () => {
  assert.equal(zoneAddressMismatch(null, "412 Ocean Blvd, San Diego, CA"), false);
  assert.equal(zoneAddressMismatch("Long Beach", null), false);
  assert.equal(zoneAddressMismatch("Long Beach", ""), false);
});

test("case and punctuation do not matter", () => {
  assert.equal(zoneAddressMismatch("long beach", "LONG BEACH, CA"), false);
  assert.equal(zoneAddressMismatch("Long Beach!", "long-beach, ca"), false);
});

test("a multi-word zone name matches on any one of its meaningful words", () => {
  // "Downtown Long Beach" — an address that only says "Long Beach" (missing
  // "Downtown") still matches, because ANY meaningful word landing is treated
  // as a real correspondence. Crude in the forgiving direction on purpose:
  // a false "no mismatch" costs nothing extra a customer notices; a false
  // mismatch flag on a real match would train the detailer to ignore the flag.
  assert.equal(zoneAddressMismatch("Downtown Long Beach", "412 Ocean Blvd, Long Beach, CA"), false);
});
