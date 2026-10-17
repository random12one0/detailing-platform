// ROADMAP 97.23 — promo codes are stored in capitals (`Promos.jsx`), but
// `resolvePromo` looked them up exactly as typed, so "summer10" never matched.
//
//   node --test tests/promo-code-case.test.mjs
//   PROMO_CASE_BREAK=as-typed node tests/promo-code-case.test.mjs   # must go red (the original defect)
//
// Credential-free, no network: the REAL `resolvePromo` from pricing.ts against a
// fake promo_codes table that matches `.eq` exactly, the way Postgres does.
// The break is an ENV VAR, not a flag: `node --test` swallows extra arguments (gotcha 104).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const BREAK = process.env.PROMO_CASE_BREAK || "";
const FIX = 'code = String(code ?? "").trim().toUpperCase();';
let src = readFileSync("supabase/functions/_shared/pricing.ts", "utf8");
assert.equal(src.split(FIX).length, 2, "the upper-casing line is not in resolvePromo exactly once");
if (BREAK === "as-typed") src = src.replace(FIX, "");
else if (BREAK) throw new Error(`Unknown PROMO_CASE_BREAK=${BREAK}`);
const { resolvePromo } = await import("data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(src)).toString("base64"));

const ROWS = [{ business_id: "b1", code: "SUMMER10", is_active: true, expires_at: null, usage_limit: 0, times_used: 0 }];
const db = {
  from: () => {
    const f = [];
    const q = {
      select: () => q, or: () => q,
      eq: (k, v) => (f.push([k, v]), q),
      maybeSingle: async () => ({ data: ROWS.find((r) => f.every(([k, v]) => r[k] === v)) ?? null, error: null }),
    };
    return q;
  },
};

for (const typed of ["SUMMER10", "summer10", "Summer10", "  summer10 "]) {
  test(`"${typed}" finds SUMMER10`, async () => {
    assert.equal((await resolvePromo(db, "b1", typed))?.code, "SUMMER10");
  });
}
test("an unknown code is still refused", async () => {
  assert.equal(await resolvePromo(db, "b1", "nope10"), null);
});
test("an empty or blank code is no promo", async () => {
  assert.equal(await resolvePromo(db, "b1", ""), null);
  assert.equal(await resolvePromo(db, "b1", "   "), null);
  assert.equal(await resolvePromo(db, "b1", null), null);
});
test("another business's code is not found", async () => {
  assert.equal(await resolvePromo(db, "b2", "summer10"), null);
});
