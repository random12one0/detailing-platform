// ROADMAP 9.12a plan step 3 — what the new Money place says. Credential-free, no
// browser: it IMPORTS app/src/lib/officeMoney.js and runs it.
//
//   node --test tests/office-money.test.mjs
//   BREAK=guess node --test tests/office-money.test.mjs    (§ 1 must go red)
//   BREAK=late node --test tests/office-money.test.mjs     (§ 3 must go red)
//   BREAK=cancel node --test tests/office-money.test.mjs   (§ 4 must go red)
//   BREAK=blank node --test tests/office-money.test.mjs    (§ 6 must go red: an emptied price box saves as 0 again)
//
// BREAK is an env var, not a flag (docs/gotchas.md 104). Each break rewrites the
// module's source in memory and asserts the rewrite LANDED (gotchas 102).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COST_CATEGORIES, platformNet } from "../supabase/functions/_shared/platformNet.js";

const LIB = new URL("../app/src/lib/", import.meta.url);
const BREAK = process.env.BREAK || "";
const swap = (text, from, to) => {
  const out = text.replace(from, to);
  assert.notEqual(out, text, `BREAK=${BREAK} did not land: ${from} not found`);
  return out;
};
const asModule = (text) => "data:text/javascript;base64," + Buffer.from(text).toString("base64");
let src = readFileSync(new URL("officeMoney.js", LIB), "utf8")
  .replace(/from "\.\/([\w]+\.js)"/g, (_, f) => `from "${LIB.href}${f}"`);
if (BREAK === "guess") src = swap(src, "kept: entered ? Number(net.net_cents) : null,", "kept: Number(net.revenue_cents ?? 0) - Number(net.cost_cents ?? 0),");
if (BREAK === "late") src = swap(src, 'if (s.status === "past_due") { late.cents += c; late.n++; continue; }', "");
if (BREAK === "cancel") src = swap(src, " && !r.subscription.cancel_at_period_end", "");
if (BREAK === "blank") src = swap(src, 'String(v).trim() === "" ? NaN : Number(v)', "Number(v)");
const M = await import(asModule(src));

// The server's own reduction makes the answers, so the test asks what the screen
// does with the shape it will really be sent.
const net = (inv, costs) => platformNet({
  invoiceRows: inv.map((c) => ({ amount_cents: c })), costRows: costs, periodMonth: "2026-10-01",
});

test("1. no bill typed in means no 'kept' figure and no kept step, never revenue passed off as profit", () => {
  const k = M.keptOf(net([6000, 6000], []));
  assert.equal(k.in, 12000);
  assert.equal(k.kept, null, "kept must be null when no bill was entered");
  assert.equal(k.out, null);
  assert.deepEqual(k.missing, ["hosting", "database", "email", "domain"]);
  const steps = M.stepsOf(k);
  assert.equal(steps.some((s) => s.kind === "kept"), false);
  assert.equal(steps.at(-1).kind, "unentered");
});

test("2. bills typed in: kept is in minus them, each bill is a step, missing ones are named", () => {
  const k = M.keptOf(net([12000], [{ amount_cents: 1900, category: "hosting" }, { amount_cents: 2500, category: "database" }, { amount_cents: 300, category: "other" }]));
  assert.equal(k.kept, 12000 - 4700);
  assert.equal(k.out, 4700);
  assert.deepEqual(k.missing, ["email", "domain"]);
  assert.deepEqual(k.bills.map((b) => b.kind), ["hosting", "database", "email", "domain", "other"]);
  const steps = M.stepsOf(k);
  assert.deepEqual(steps.map((s) => [s.key, s.cents]), [["in", 12000], ["hosting", -1900], ["database", -2500], ["other", -300], ["kept", 7300]]);
  assert.equal(M.keptOf({ error: "x" }).failed, true, "a failed read is its own state, not an empty month");
});

const row = (sub, over = {}) => ({ id: Math.random().toString(36), name: "R", is_demo: false, subscription: sub, ...over });
const sub = (over) => ({ status: "active", recurring_cents: 6000, bill_interval: "month", cancel_at_period_end: false, current_period_end: null, ...over });

test("3. income by plan: yearly per month, a failed card apart and NOT in the total, fixtures out", () => {
  const p = M.byPlan([
    row(sub({})), row(sub({ status: "trialing" })),
    row(sub({ bill_interval: "year", recurring_cents: 60000 })),
    row(sub({ status: "past_due" })),
    row(sub({ status: "canceled" })),
    row(sub({}), { is_demo: true }),
    row(null),
  ]);
  assert.equal(p.parts[0].cents, 12000);
  assert.equal(p.parts[1].cents, 5000);
  assert.equal(p.total, 17000, "the total is what is actually being paid, a declined card is not in it");
  assert.equal(p.paying, 3);
  assert.deepEqual([p.late.n, p.late.cents], [1, 6000]);
});

test("4. coming in: renewals inside 30 days, full charge, cancelling and late left out", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  const at = (d) => new Date(now.getTime() + d * 864e5).toISOString();
  const c = M.comingIn([
    row(sub({ current_period_end: at(3) })),
    row(sub({ current_period_end: at(20), bill_interval: "year", recurring_cents: 60000 })),
    row(sub({ current_period_end: at(10), cancel_at_period_end: true })),
    row(sub({ current_period_end: at(5), status: "past_due" })),
    row(sub({ current_period_end: at(40) })),
    row(sub({ current_period_end: at(-1) })),
    row(sub({ current_period_end: at(2) }), { is_demo: true }),
  ], 30, now);
  assert.deepEqual(c.pins.map((p) => p.cents), [6000, 60000]);
  assert.equal(c.total, 66000);
  assert.equal(c.pins[1].yearly, true);
  assert.deepEqual(c.late.map((p) => p.day), [5], "the failed card renewing on day 5 is drawn late, apart from the total");
});

test("5. the bill kinds are the server's, and the form sends whole cents or nothing", () => {
  assert.deepEqual(M.BILL_KINDS, COST_CATEGORIES);
  assert.equal(M.centsOf("12.50"), 1250);
  assert.equal(M.centsOf("$1,019"), 101900);
  assert.equal(M.centsOf("0"), 0);
  for (const bad of ["", "abc", "-3", "1.234", "1e3"]) assert.equal(M.centsOf(bad), null, bad);
});

test("6. the price editor saves back EVERY figure it read, and a blank box is never a $0 price", () => {
  // The table's shape as supabase/functions/_shared/platformBilling.ts PRICES has it.
  const T = { website: { setup: 999, monthly: 60, annual: 600, monthToMonth: 75 }, bookingOnly: { monthly: 35 },
    founding: { setup: 499, monthly: 40, annual: 400, monthToMonth: 50 }, term: { months: 12, exitFeeShare: 0.5 } };
  const rows = M.priceRows(T);
  assert.equal(rows.length, 11);
  const draft = Object.fromEntries(rows.map((r) => [r.path.join("."), String(r.raw)]));
  assert.deepEqual(M.tableOf(draft), T, "a draft nobody touched saves the same table");
  assert.deepEqual(rows.map((r) => r.value).slice(-2), ["12 months", "50% of what is left"]);
  // The setup fee is the one figure the server lets be 0, so a blank one must not become 0.
  const sent = JSON.parse(JSON.stringify(M.tableOf({ ...draft, "website.setup": " " })));
  assert.equal(sent.website.setup, null, "a blank box must go as null, which pricesFrom refuses");
});
