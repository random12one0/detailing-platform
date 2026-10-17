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
//
// RUN, NOT ONLY READ (review of 97.72): the sweep is RUN with a deadline naming another business's customer in
// `tests/reminder-claim.test.mjs` § 4. `plan-link`'s `loadMember` is run here (case 5): its real source, types
// stripped, against a stand-in database holding a membership that names another business's customer.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
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

// The real `loadMember`, run against an in-memory stand-in of the three tables it reads. Returns the customer it
// would put on the plan page.
async function planPageCustomer(src, member, customers) {
  const m = /async function loadMember[\s\S]*?\n}\n/.exec(src);
  assert.ok(m, "loadMember not found in plan-link/index.ts");
  const T = { plan_members: [member], plan_visits: [], bookings: [], customers };
  const from = (t) => {
    const f = [];
    const q = {
      select: () => q, neq: (c, v) => (f.push((r) => r[c] !== v), q), is: (c, v) => (f.push((r) => (r[c] ?? null) === v), q),
      eq: (c, v) => (f.push((r) => r[c] === v), q),
      maybeSingle: () => Promise.resolve({ data: T[t].find((r) => f.every((x) => x(r))) ?? null }),
      then: (ok, no) => Promise.resolve({ data: T[t].filter((r) => f.every((x) => x(r))) }).then(ok, no),
    };
    return q;
  };
  const loadMember = new Function("supabase", `${stripTypeScriptTypes(m[0])}; return loadMember;`)({ from });
  const out = await loadMember(member.id);
  assert.ok(out, "loadMember found no member, so the customer read was never reached");
  return out.customer;
}
const MEMBER = (customer_id) => ({ id: "m-1", business_id: "biz-A", customer_id, plan: { name: "Monthly" } });
const CUSTOMERS = [
  { id: "cu-own", business_id: "biz-A", name: "Pat", email: "pat@example.test" },
  { id: "cu-foreign", business_id: "biz-B", name: "Sam", email: "stranger@example.test" },
];

test("5 · plan-link, RUN: a membership naming another business's customer shows nobody; its own customer still shows", async () => {
  const src = read(`${FN}/plan-link/index.ts`);
  assert.equal(await planPageCustomer(src, MEMBER("cu-foreign"), CUSTOMERS), null, "the plan page named another business's customer");
  const own = await planPageCustomer(src, MEMBER("cu-own"), CUSTOMERS);
  assert.ok(own && own.email === "pat@example.test", `the member's own customer was lost: ${JSON.stringify(own)}`);
  // sabotage: the same function with its business filter removed must hand over the stranger
  const broken = src.replace(`.eq("business_id", member.business_id)`, "");
  assert.notEqual(broken, src, "the sabotage did not apply");
  const leaked = await planPageCustomer(broken, MEMBER("cu-foreign"), CUSTOMERS);
  assert.equal(leaked?.email, "stranger@example.test", "without the filter the stranger was not returned, so case 5 cannot see the filter");
});
