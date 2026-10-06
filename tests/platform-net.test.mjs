// ROADMAP 9.14 — A PERIOD WITH NO COSTS ENTERED CANNOT PRODUCE A PROFIT.
//
// Run: node --test tests/platform-net.test.mjs
//      Credential-free. Imports one module and runs it. No network, no
//      database, no filesystem beyond two source reads.
//
// ---------------------------------------------------------------------------
// WHY THIS IS A REAL TEST AND NOT A SOURCE SCAN
// ---------------------------------------------------------------------------
// 9.14's failing-looks-like is *"a confident net figure computed from an empty
// cost list, which would overstate the platform's profit by the whole of its
// costs and look completely normal on screen."*
//
// **Nothing in `supabase/` is type-checked or runnable on this machine** —
// there is no Deno, the deploy bundler does not type-check, and
// `_shared/email.ts` records a type error that shipped and put the literal word
// `undefined` into every detailer's email as a colour. So a rule that matters
// cannot live in an edge function and be called tested.
//
// It lives in `_shared/platformNet.js`, a plain `.js` module in the pattern
// `_shared/brandColor.js` already set, and **this file imports it and executes
// it.** The empty-cost case is asserted on a returned value, not on the
// presence of a line of source.
//
// ---------------------------------------------------------------------------
// WHAT IT CANNOT DO
// ---------------------------------------------------------------------------
// It proves the arithmetic and the empty case. It proves nothing about the two
// queries that feed it, because those need the deployed function and the
// applied migration — and **neither has happened**: `platform_costs` does not
// exist in the live database and `platform-admin` is running an older copy.
// `scripts/migration-drift.mjs` and `scripts/deployed-inventory.mjs` are what
// answer those, and both say no today. Sections 7 and 8 below check the wiring
// by reading the source, and say so in their names rather than implying more.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  monthStart,
  nextMonthStart,
  platformNet,
} from "../supabase/functions/_shared/platformNet.js";

const MIGRATION = "supabase/migrations/20261006020000_hand_entered_platform_costs.sql";
const FUNCTION = "supabase/functions/platform-admin/index.ts";

const CANARY = process.env.PLATFORM_NET_CANARY === "1";

test("ROADMAP 9.14 — revenue minus costs, and the empty-cost case", async (t) => {
  await t.test("1 · THE ITEM'S OWN FAILURE MODE — no costs entered yields NO net figure", () => {
    const r = platformNet({
      invoiceRows: [{ amount_cents: 29900 }, { amount_cents: 4900 }],
      costRows: [],
      periodMonth: "2026-03-01",
    });
    assert.equal(r.costs_entered, false, "an empty cost list means costs were not entered");
    assert.equal(
      r.net_cents, null,
      "**net_cents MUST be null, not 0 and not the revenue.** A zero cost makes "
      + "net equal revenue, which is exactly the overstatement 9.14 names: it "
      + "would report the platform's entire income as profit and look completely "
      + "normal. A flag alone is not enough — one careless render ignores a flag, "
      + "and cannot render a number it was never given.",
    );
    assert.equal(r.cost_cents, null, "cost_cents must be absent too, for the same reason");
    assert.equal(r.revenue_cents, 34800, "revenue is still reported — it IS known");
    assert.equal(r.by_category, null);
    assert.equal(r.cost_count, 0);
  });

  await t.test("2 · with costs entered, the net is the subtraction", () => {
    const r = platformNet({
      invoiceRows: [{ amount_cents: 29900 }, { amount_cents: 4900 }],
      costRows: [
        { amount_cents: 1900, category: "hosting" },
        { amount_cents: 2500, category: "database" },
        { amount_cents: 1200, category: "email" },
        { amount_cents: 1400, category: "domain" },
      ],
      periodMonth: "2026-03-01",
    });
    assert.equal(r.costs_entered, true);
    assert.equal(r.revenue_cents, 34800);
    assert.equal(r.cost_cents, 7000);
    assert.equal(r.net_cents, 27800, "34800 - 7000");
    assert.equal(r.cost_count, 4);
    assert.deepEqual(r.by_category, { hosting: 1900, database: 2500, email: 1200, domain: 1400 });
  });

  await t.test("3 · a LOSS is reported as a loss and never clamped to zero", () => {
    const r = platformNet({
      invoiceRows: [{ amount_cents: 4900 }],
      costRows: [{ amount_cents: 12000, category: "hosting" }],
      periodMonth: "2026-03-01",
    });
    assert.equal(
      r.net_cents, -7100,
      "a month that cost more than it earned is the single most important thing "
      + "this screen can say. A Math.max(0, …) anywhere here would hide it, and "
      + "the hiding would look like a very thin profit.",
    );
  });

  await t.test("4 · one entered cost of zero is NOT the same as none entered", () => {
    const r = platformNet({
      invoiceRows: [{ amount_cents: 5000 }],
      costRows: [{ amount_cents: 0, category: "other" }],
      periodMonth: "2026-03-01",
    });
    assert.equal(r.costs_entered, true, "a row exists, so somebody typed something");
    assert.equal(r.cost_cents, 0);
    assert.equal(
      r.net_cents, 5000,
      "**this is the known-empty case and it is allowed to produce a figure**, "
      + "because a person asserted it. The unknown case in section 1 is not. "
      + "That distinction is the whole of 9.14's done-when.",
    );
  });

  await t.test("5 · the period boundary, including the December rollover", () => {
    assert.equal(monthStart("2026-03-17T22:10:00Z"), "2026-03-01");
    assert.equal(monthStart(new Date(Date.UTC(2026, 0, 1))), "2026-01-01");
    assert.equal(nextMonthStart("2026-03-01"), "2026-04-01");
    assert.equal(
      nextMonthStart("2026-12-01"), "2027-01-01",
      "DECEMBER MUST ROLL INTO THE NEXT YEAR. This is the off-by-one that would "
      + "otherwise put December's revenue in a period the query never asks for, "
      + "and it is here rather than in the edge function precisely because the "
      + "edge function cannot be run on this machine.",
    );
    assert.equal(nextMonthStart("2026-01-01"), "2026-02-01");
  });

  await t.test("6 · bad input throws rather than returning a plausible number", () => {
    assert.throws(() => platformNet({
      invoiceRows: [{ amount_cents: 12.5 }], costRows: [], periodMonth: "2026-03-01",
    }), /integer/, "a non-integer cent value means a caller read the wrong column");
    assert.throws(() => platformNet({
      invoiceRows: [{}], costRows: [], periodMonth: "2026-03-01",
    }), /integer/, "a missing amount_cents must not count as zero");
    assert.throws(() => platformNet({
      invoiceRows: [], costRows: [], periodMonth: "2026-03-15",
    }), /YYYY-MM-01/, "a period that is not the first of a month matches no stored row");
    assert.throws(() => nextMonthStart("March"), /YYYY-MM-01/);
  });

  await t.test("7 · SOURCE CHECK — the migration locks the table both ways", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    assert.match(sql, /create table if not exists public\.platform_costs/);
    assert.match(sql, /amount_cents\s+integer not null check \(amount_cents >= 0\)/,
      "money is cents as an integer, as every other money column here is");
    assert.match(sql, /enable row level security/);
    assert.match(sql, /force row level security/);
    assert.match(sql, /revoke all on public\.platform_costs from anon, authenticated/,
      "RLS with zero policies AND a revoke — both halves. "
      + "20260921000000_revoke_locked_table_grants.sql found ten tables with the "
      + "first and not the second, and records that `anon` held INSERT on the "
      + "audit trail until it ran.");
    assert.doesNotMatch(sql, /create policy/,
      "zero policies by design: a detailer's browser never reaches this table, "
      + "so there is no row for a policy to choose between");
    assert.doesNotMatch(sql, /drop (table|column)/i, "migrations here are append-only");
    assert.match(sql, /date_trunc\('month', period_month\)/,
      "the period is pinned to the first of the month in the database, so two "
      + "callers writing 'March' differently cannot create two periods");
  });

  await t.test("8 · SOURCE CHECK — the read is gated and uses invoiced money, not MRR", () => {
    const src = readFileSync(FUNCTION, "utf8");
    const i = src.indexOf('action === "platform_net"');
    assert.ok(i > 0, "the platform_net action must exist on platform-admin");
    // The admin gate is ahead of every action in this function; assert it is
    // still ahead of THIS one rather than assuming the file never gets reordered.
    assert.ok(
      src.indexOf("if (!admin) return json({ error: \"Not found\" }, 404);") < i,
      "the platform_admins gate must come BEFORE this action. Platform costs are "
      + "Andrew's alone and the table has no RLS policy to fall back on.",
    );
    const block = src.slice(i, i + 2200);
    assert.match(block, /from\("platform_invoices"\)/,
      "revenue must come from invoiced money");
    assert.match(block, /\.eq\("status", "paid"\)/,
      "only PAID invoices are revenue — an open or void one is not money that arrived");
    assert.doesNotMatch(block, /mrr_cents/,
      "**REVENUE IS NOT MRR.** mrr_cents is a snapshot of what recurs NOW; using "
      + "it as a past period's revenue is wrong for every month but the current "
      + "one, and wrong in the direction that flatters.");
    assert.match(block, /if \(inv\.error\)/,
      "a failed read must not become 'costs not entered' — that is a different "
      + "sentence on the screen and the wrong one");
    assert.match(block, /if \(costs\.error\)/, "same for the cost read");
  });

  await t.test("9 · the canary is wired", () => {
    if (!CANARY) return assert.ok(true);
    // Reached only under the canary: prove the empty case assertion can fail by
    // asserting the OPPOSITE of section 1 on the same call.
    const r = platformNet({ invoiceRows: [{ amount_cents: 100 }], costRows: [], periodMonth: "2026-03-01" });
    assert.equal(
      r.net_cents, 100,
      "PLATFORM_NET_CANARY=1 — this asserts the FAULT 9.14 describes (net equal "
      + "to revenue with no costs entered). It must FAIL, which proves section 1 "
      + "is testing a real behaviour and not a tautology.",
    );
  });
});
