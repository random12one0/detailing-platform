// ROADMAP 97.12 (S-M2) — EVERY SERVICE-ROLE READ OF A BOOKING'S LINES KEEPS ONLY THE BOOKING'S OWN BUSINESS'S.
//
//   node --test tests/booking-lines-own-business.test.mjs
//
// Credential-free, filesystem reads only. The database half of this item is
// `20261017000000_booking_lines_same_business.sql` (proved in
// `tests/booking-lines-same-business-sql.test.mjs`); this is the code half, which also covers the time before
// Andrew applies it.
//
// THE POPULATION IS DISCOVERED, NOT LISTED: every edge function whose select embeds `booking_services(` or
// `booking_add_ons(` is found by scanning `supabase/functions/`, and the count is DECLARED with an equality, so a
// sixth embed is a red here rather than a function nobody checked. Each one must (1) import `ownLines`, (2) select
// `business_id` inside every such embed, since `ownLines` compares it, and (3) pass the fetched row through
// `ownLines` before anything reads it. Direct reads `.from("booking_*")` must carry `.eq("business_id", …)`.
//
// `ownLines` itself is run, from its real source text with the types stripped, against a booking holding a
// foreign line. The canary removes the call from the receipt's REAL source and requires the check to catch it.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";

const FN = "supabase/functions";
const EXPECTED_EMBEDDERS = ["accept-quote", "booking-ics", "get-booking-receipt", "respond-to-booking", "send-invoice"];
const read = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const fns = readdirSync(FN).filter((d) => !d.startsWith("_") && existsSync(`${FN}/${d}/index.ts`));

const EMBED = /\b(booking_services|booking_add_ons)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;

// The judgment, as a function of the source text, so the canary below runs the same rule.
export function problems(src) {
  const out = [];
  if (!/import \{[^}]*\bownLines\b[^}]*\} from "\.\.\/_shared\/tenant\.ts"/.test(src)) out.push("does not import ownLines");
  for (const m of src.matchAll(EMBED)) {
    if (!/(^|[\s,(])business_id\s*(,|$)/.test(m[2])) out.push(`the ${m[1]} embed does not select business_id: ${m[0]}`);
  }
  // The row comes back as `found` (or `bookingRes.data`) and only `ownLines(...)` of it is called `booking`.
  if (!/const booking = (?:bookingRes\.data && )?ownLines\((?:found|bookingRes\.data)\);/.test(src)) out.push("the fetched row is not passed through ownLines");
  if (/const \{ data: booking\b/.test(src)) out.push("the raw row is still bound to `booking`");
  return out;
}

test("1 · every function that embeds a booking's services or add-ons is found, and the count is exactly the declared one", () => {
  const found = fns.filter((d) => [...read(`${FN}/${d}/index.ts`).matchAll(EMBED)].length > 0).sort();
  assert.deepEqual(found, EXPECTED_EMBEDDERS, "an embedder appeared or disappeared — add it here AND pass its row through ownLines");
});

for (const d of EXPECTED_EMBEDDERS) {
  test(`2 · ${d} keeps only the booking's own business's lines`, () => {
    assert.deepEqual(problems(read(`${FN}/${d}/index.ts`)), []);
  });
}

test("3 · every direct read of booking_services, booking_add_ons or booking_line_items is scoped to a business", () => {
  const reads = [];
  for (const d of [...fns, "_shared"]) {
    const files = d === "_shared" ? readdirSync(`${FN}/_shared`).filter((f) => f.endsWith(".ts")).map((f) => `${FN}/_shared/${f}`) : [`${FN}/${d}/index.ts`];
    for (const f of files) {
      const src = read(f);
      for (const m of src.matchAll(/\.from\("(booking_services|booking_add_ons|booking_line_items)"\)([\s\S]{0,400})/g)) {
        const chain = m[2].split(";")[0];
        if (/^\s*\.insert\(/.test(chain)) continue; // a write; the business_id is the server's own
        reads.push({ f, table: m[1], scoped: /\.eq\("business_id",/.test(chain) });
      }
    }
  }
  assert.ok(reads.length >= 3, `discovery floor: expected at least 3 direct reads, found ${reads.length}`);
  assert.deepEqual(reads.filter((r) => !r.scoped), [], "a direct read with no business filter");
});

test("4 · ownLines, run from its real source: a foreign line is dropped, the business_id column is removed, nothing else changes", () => {
  const src = read(`${FN}/_shared/tenant.ts`);
  const m = /export function ownLines[\s\S]*?\n}\n/.exec(src);
  assert.ok(m, "ownLines not found in _shared/tenant.ts");
  const js = stripTypeScriptTypes(m[0].replace(/^export /, ""));
  const ownLines = new Function(`${js}; return ownLines;`)();
  const booking = {
    id: "b1", business_id: "B", total_price: 120,
    services: [{ business_id: "B", name_at_booking: "Full detail" }, { business_id: "A", name_at_booking: "Injected wash" }],
    add_ons: [{ business_id: "A", add_on: { name: "Injected" } }, { business_id: "B", add_on: { name: "Pet hair" } }],
  };
  const out = ownLines(booking);
  assert.deepEqual(out.services, [{ name_at_booking: "Full detail" }]);
  assert.deepEqual(out.add_ons, [{ add_on: { name: "Pet hair" } }]);
  assert.equal(out.total_price, 120);
  assert.equal(out.business_id, "B", "the booking's own business_id is the server's to read and must stay");
  assert.ok(!("add_ons" in ownLines({ business_id: "B", services: [] })), "a booking with no add-on embed grew one");
});

test("5 · canary: the receipt's real source with the ownLines call removed, or business_id dropped from an embed, is caught", () => {
  const real = read(`${FN}/get-booking-receipt/index.ts`);
  const noCall = real.replace("const booking = ownLines(found);", "const booking = found;");
  assert.notEqual(noCall, real, "the canary did not apply");
  assert.ok(problems(noCall).some((p) => /not passed through ownLines/.test(p)), "the check missed the removed call");
  const noCol = real.replace("booking_add_ons(business_id, ", "booking_add_ons(");
  assert.notEqual(noCol, real, "the canary did not apply");
  assert.ok(problems(noCol).some((p) => /booking_add_ons embed does not select business_id/.test(p)), "the check missed the dropped column");
});
