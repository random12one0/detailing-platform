// ROADMAP 97.72 — EVERY SERVICE-ROLE READ THAT FOLLOWS A ROW'S `customer_id` ALSO ASKS FOR THAT ROW'S BUSINESS.
//
//   node --test tests/customer-reads-own-business.test.mjs
//
// Credential-free, filesystem reads only. The database half is `20261017020000_customer_same_business.sql`
// (proved in `tests/customer-same-business-sql.test.mjs`); this is the code half, which also covers the time
// before Andrew applies it.
//
// THE POPULATION IS DISCOVERED, NOT LISTED: every `.from("customers")` SELECT in `supabase/functions/` whose
// chain filters `.eq("id", <something>.customer_id)` — a customer reached by following another row's pointer.
// The count is DECLARED with an equality, so a third one is a red here rather than a read nobody checked. Each
// must also carry `.eq("business_id", <the same row>.business_id)`. The edge functions run as the service role,
// so no policy scopes these reads; the filter is the only thing that does.
//
// NOT COUNTED, ON PURPOSE: `unsubscribe` reads a customer by the id in the customer's OWN link (that id is the
// credential, there is no other row to follow), and `resend-webhook` UPDATES the customer named by an
// `email_sends` row, which the browser cannot write (20260916010000).
//
// The canary removes the business filter from the sweep's REAL source and requires the check to catch it.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const FN = "supabase/functions";
const EXPECTED = ["plan-link", "send-owner-reminders"];
const read = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const fns = readdirSync(FN).filter((d) => !d.startsWith("_") && existsSync(`${FN}/${d}/index.ts`));

// Every customer read that follows a row's pointer, as { row, scoped } — the judgment, as a function of the
// source text, so the canary below runs the same rule.
export function followed(src) {
  const out = [];
  for (const m of src.matchAll(/\.from\("customers"\)([\s\S]{0,300})/g)) {
    const chain = m[1].split(/;|\n\s*\n|,\n\s*supabase\./)[0];
    if (!/^\s*\.select\(/.test(chain)) continue;
    const ptr = /\.eq\("id", (\w+(?:!)?)\.customer_id\)/.exec(chain);
    if (!ptr) continue;
    const row = ptr[1].replace("!", "");
    out.push({ row, scoped: new RegExp(`\\.eq\\("business_id", ${row}!?\\.business_id\\)`).test(chain) });
  }
  return out;
}

test("1 · every function that reads a customer by another row's customer_id is found, and the count is exactly the declared one", () => {
  const found = fns.filter((d) => followed(read(`${FN}/${d}/index.ts`)).length > 0).sort();
  assert.deepEqual(found, EXPECTED, "a reader appeared or disappeared — add it here AND scope it to the row's business");
  const shared = readdirSync(`${FN}/_shared`).filter((f) => f.endsWith(".ts")).filter((f) => followed(read(`${FN}/_shared/${f}`)).length);
  assert.deepEqual(shared, [], "a shared helper follows a customer_id — add it to this check");
});

for (const d of EXPECTED) {
  test(`2 · ${d} reads the customer by id AND the row's own business`, () => {
    const reads = followed(read(`${FN}/${d}/index.ts`));
    assert.equal(reads.length, 1, `${d}: expected exactly one followed customer read, found ${reads.length}`);
    assert.deepEqual(reads.filter((r) => !r.scoped), [], `${d}: a customer read with no business filter`);
  });
}

test("3 · the reminder sweep's read is the MAINTENANCE DEADLINE's: id and business both come from `d`", () => {
  const src = read(`${FN}/send-owner-reminders/index.ts`);
  assert.match(src, /\.eq\("id", d\.customer_id\)\.eq\("business_id", d\.business_id\)\.maybeSingle\(\)/);
  // and the deadline row that `d` is actually selects business_id, or the filter compares against undefined
  assert.match(src, /from\("maintenance_deadlines"\)\s*\.select\("id, business_id, customer_id,/);
});

test("4 · canary: the sweep's real source with the business filter removed is caught", () => {
  const real = read(`${FN}/send-owner-reminders/index.ts`);
  const broken = real.replace(`.eq("business_id", d.business_id).maybeSingle()`, ".maybeSingle()");
  assert.notEqual(broken, real, "the canary did not apply");
  assert.deepEqual(followed(broken), [{ row: "d", scoped: false }], "the check missed the removed filter");
});
