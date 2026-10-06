// ROADMAP 9.14 — REVENUE MINUS COSTS, AND THE ONE CASE THAT MUST NOT RENDER.
//
// 9.14's failing-looks-like is specific: *"a confident net figure computed from
// an empty cost list, which would overstate the platform's profit by the whole
// of its costs and look completely normal on screen."*
//
// So the rule this file exists to enforce is one line:
//
//   **WHEN NO COSTS WERE ENTERED FOR THE PERIOD, `net_cents` IS `null`.**
//
// Not zero, not the revenue, not a number with a warning beside it — **absent**.
// A screen cannot accidentally print a profit it was never given. A flag alone
// would not be enough: a flag can be ignored by one careless render, and the
// thing being guarded is a figure that "looks completely normal". Removing the
// number removes the mistake.
//
// ---------------------------------------------------------------------------
// WHY THIS IS A `.js` FILE IN `_shared/` AND NOT TYPESCRIPT IN THE FUNCTION
// ---------------------------------------------------------------------------
// There is no Deno on this machine and the deploy bundler does not type-check,
// so **nothing in `supabase/` is currently checked by anything** —
// `_shared/email.ts` records that, and records a shipped type error that cost a
// colour in every detailer's email. Logic that must be right therefore has to
// be runnable by the one runtime this repo CAN run: node, from `tests/`.
//
// `_shared/brandColor.js` is the precedent — a plain `.js` module in this same
// directory, imported by Deno as `./brandColor.js` and exercised from node.
// `tests/platform-net.test.mjs` imports this file directly and runs the empty
// case for real, rather than reading the source and hoping.
//
// ---------------------------------------------------------------------------
// IT TAKES ROWS AND RETURNS FIGURES. IT READS NOTHING.
// ---------------------------------------------------------------------------
// No database client, no fetch, no clock. The caller does the two queries; this
// decides what they mean. That is what makes the empty case testable without a
// database, which matters because the migration behind it has not been applied
// and will not be until Andrew says so.

/**
 * The first day of the month a date falls in, as `YYYY-MM-DD`.
 *
 * `platform_costs.period_month` is constrained to the first of the month in the
 * database; this is the same normalisation on the way in, so a caller passing
 * "some day in March" and a caller passing "1 March" ask the same question.
 */
export function monthStart(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) throw new TypeError("monthStart: not a date");
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/**
 * The first day of the month AFTER the one `periodMonth` names.
 *
 * The exclusive upper bound for "paid inside this period". It lives here rather
 * than in the edge function for the same reason `platformNet` does: **a month
 * rollover is the classic off-by-one** — December must become January of the
 * next year — and the edge function cannot be executed on this machine, so
 * arithmetic left there is arithmetic nobody can check.
 *
 * `Date.UTC` is given a 1-based month deliberately, which is the 0-based month
 * PLUS ONE, i.e. the next month; and it is allowed to overflow from 12 to the
 * following January, which is specified behaviour rather than luck.
 */
export function nextMonthStart(periodMonth) {
  if (typeof periodMonth !== "string" || !/^\d{4}-\d{2}-01$/.test(periodMonth)) {
    throw new TypeError(`nextMonthStart: expected YYYY-MM-01, got ${periodMonth}`);
  }
  const year = Number(periodMonth.slice(0, 4));
  const month1Based = Number(periodMonth.slice(5, 7));
  return monthStart(new Date(Date.UTC(year, month1Based, 1)));
}

/**
 * Sum `amount_cents` over rows, rejecting anything that is not an integer.
 *
 * **A non-integer here is a throw rather than a coercion.** `Number("12.5")`
 * and `Number(null)` both produce something a `reduce` will happily add, and
 * the result is a money figure that is wrong by a rounding rather than
 * obviously broken. Cents are integers everywhere in this repo; a float
 * arriving means a caller read the wrong column.
 */
function sumCents(rows, where) {
  let total = 0;
  for (const r of rows) {
    const v = r?.amount_cents;
    if (!Number.isInteger(v)) {
      throw new TypeError(`${where}: amount_cents must be an integer, got ${JSON.stringify(v)}`);
    }
    total += v;
  }
  return total;
}

/**
 * ROADMAP 9.14 — the one read, as a pure reduction.
 *
 * @param {object} input
 * @param {{amount_cents:number}[]} input.invoiceRows  paid platform invoices in the period
 * @param {{amount_cents:number, category?:string}[]} input.costRows  hand-entered costs for the period
 * @param {string} input.periodMonth  `YYYY-MM-01`, the period these rows are for
 * @returns {{period_month:string, revenue_cents:number, cost_cents:number|null,
 *            net_cents:number|null, costs_entered:boolean, cost_count:number,
 *            by_category:Record<string,number>|null}}
 */
export function platformNet({ invoiceRows, costRows, periodMonth }) {
  if (!Array.isArray(invoiceRows)) throw new TypeError("platformNet: invoiceRows must be an array");
  if (!Array.isArray(costRows)) throw new TypeError("platformNet: costRows must be an array");
  if (typeof periodMonth !== "string" || !/^\d{4}-\d{2}-01$/.test(periodMonth)) {
    // A period that is not the first of a month would not match the stored
    // rows, and the honest failure is here rather than a silent zero later.
    throw new TypeError(`platformNet: periodMonth must be YYYY-MM-01, got ${periodMonth}`);
  }

  const revenue_cents = sumCents(invoiceRows, "invoiceRows");

  // THE WHOLE POINT OF THE FILE. No rows means nobody has typed this month's
  // costs in. It does NOT mean they were zero — see the migration header for
  // why a true zero cannot occur here and what would change that.
  const costs_entered = costRows.length > 0;

  if (!costs_entered) {
    return {
      period_month: periodMonth,
      revenue_cents,
      // NULL, NOT ZERO. A zero cost would make `net` equal revenue, which is
      // the exact overstatement 9.14 names.
      cost_cents: null,
      net_cents: null,
      costs_entered: false,
      cost_count: 0,
      by_category: null,
    };
  }

  const cost_cents = sumCents(costRows, "costRows");
  const by_category = {};
  for (const r of costRows) {
    const k = typeof r.category === "string" && r.category ? r.category : "other";
    by_category[k] = (by_category[k] ?? 0) + r.amount_cents;
  }

  return {
    period_month: periodMonth,
    revenue_cents,
    cost_cents,
    // Negative is a real answer and is not clamped: a month that cost more than
    // it earned is the single most important thing this screen could say, and a
    // `Math.max(0, …)` here would hide it.
    net_cents: revenue_cents - cost_cents,
    costs_entered: true,
    cost_count: costRows.length,
    by_category,
  };
}
