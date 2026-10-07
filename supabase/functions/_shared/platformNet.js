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

// ---------------------------------------------------------------------------
// THE WRITE: one hand-typed bill, checked before it reaches the table.
// ---------------------------------------------------------------------------
// Lives here, not in `platform-admin`, for the same reason as everything above:
// this is the only place node can execute it. Every refusal is a sentence a
// person can act on, because the screen shows it as-is.

// ---------------------------------------------------------------------------
// "THE COSTS TABLE IS NOT THERE" IS A FACT, AND THE SCREEN SHOULD BE ABLE TO SAY
// IT AS ONE. Both the read and the write answer it with a sentence of its own
// rather than the generic failure, so a migration that has not run reads as
// "not set up yet" and not as a fault in the platform. 42P01 is Postgres's
// undefined_table; PGRST205 is PostgREST's table-not-in-schema-cache.
// ---------------------------------------------------------------------------

/** True when a Supabase error means the platform_costs table does not exist. */
export function costsTableMissing(error) {
  return ["42P01", "PGRST205"].includes(error?.code ?? "");
}

export const COSTS_MISSING_READ = "Costs cannot be shown yet: the costs table has not been set up.";
export const COSTS_MISSING_WRITE = "Costs cannot be saved yet: the costs table has not been set up. Nothing was saved.";

/** The table's own CHECK list. tests/platform-net.test.mjs holds the two equal. */
export const COST_CATEGORIES = ["hosting", "database", "email", "domain", "other"];

const INT4_MAX = 2147483647; // `amount_cents integer` — Postgres int4

/**
 * Validate a cost entry from the request body.
 * @returns {{ok:true, row:{period_month:string, category:string, amount_cents:number, note:string|null}}
 *          | {ok:false, error:string}}
 */
export function costEntry(body) {
  const b = body ?? {};

  // INTEGER CENTS OR NOTHING. No `Number()`, no rounding: "12.50", 12.5 and
  // "1250" are all refused, because a screen that sent dollars or a string has
  // a bug, and quietly fixing it here is how $12.50 gets stored as 13 cents.
  const amount = b.amount_cents;
  if (typeof amount !== "number" || !Number.isInteger(amount)) {
    return { ok: false, error: "The amount must be a whole number of cents, like 1250 for $12.50." };
  }
  if (amount < 0) return { ok: false, error: "The amount cannot be below zero." };
  if (amount > INT4_MAX) {
    return { ok: false, error: "That amount is too large. One bill can be at most $21,474,836.47." };
  }

  if (!COST_CATEGORIES.includes(b.category)) {
    return { ok: false, error: "Pick what the bill is for: hosting, database, email, domain or other." };
  }

  // A month, as YYYY-MM or any YYYY-MM-DD inside it; stored as the first.
  const p = typeof b.period_month === "string" ? b.period_month.trim() : "";
  if (!p) return { ok: false, error: "Pick the month this bill belongs to." };
  const m = p.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  const month = m ? Number(m[2]) : 0;
  const day = m?.[3] ? Number(m[3]) : 1;
  if (!m || month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, error: "The month has to be written like 2026-10." };
  }
  const period_month = `${m[1]}-${m[2]}-01`;

  let note = null;
  if (b.note != null) {
    if (typeof b.note !== "string") return { ok: false, error: "The note has to be text." };
    note = b.note.trim() || null;
    if (note && note.length > 300) return { ok: false, error: "The note can be at most 300 characters." };
  }

  return { ok: true, row: { period_month, category: b.category, amount_cents: amount, note } };
}
