// WHAT THE NEW BACK OFFICE'S MONEY PLACE KNOWS, worked out with no React and no
// browser (ROADMAP 9.12a, plan step 3). `tests/office-money.test.mjs` runs it.
//
// EVERY INPUT IS ALREADY ON THE WIRE: `platform_net` sends a month's money in,
// the bills typed in (`by_category`) and `net_cents`; `list` sends each
// detailer's own subscription. Nothing here asks the server for anything new.
//
// THE ONE RULE (9.14): a bill nobody typed in is NOT a free bill. When no bill
// was entered for the month, "kept" is null and nothing may draw it as a figure.

import { monthlyCents } from "./officeDetailers.js";
import { money } from "./format.js";

// The bill kinds the server accepts, in its order. MUST equal COST_CATEGORIES in
// supabase/functions/_shared/platformNet.js; the test holds the two together.
export const BILL_KINDS = ["hosting", "database", "email", "domain", "other"];
// "other" is not a bill every month has, so it is listed only once one is typed in.
const EXPECTED = BILL_KINDS.filter((k) => k !== "other");
export const BILL_NAME = { hosting: "Hosting", database: "Database and storage", email: "Email", domain: "Domain", other: "Other" };

// One month from a `platform_net` answer: what came in, each bill, what was kept,
// and which expected bills are still missing.
export function keptOf(net) {
  if (!net || net.error) return { failed: true };
  const entered = net.costs_entered === true && Number.isInteger(net.net_cents);
  const cats = net.by_category ?? {};
  const bills = BILL_KINDS
    .filter((k) => EXPECTED.includes(k) || cats[k] != null)
    .map((k) => ({ kind: k, name: BILL_NAME[k], cents: cats[k] != null ? Number(cats[k]) : null }));
  return {
    failed: false,
    in: Number(net.revenue_cents ?? 0),
    out: entered ? Number(net.cost_cents ?? 0) : null,
    kept: entered ? Number(net.net_cents) : null,
    bills,
    missing: bills.filter((b) => b.cents === null).map((b) => b.kind),
  };
}

// What the Platform bills profit row prints beside its figure (98.16): with a
// known profit and bills still missing, how many are not entered. A complete
// month gets no note; an empty month (kept null, 9.14) keeps "Not entered" and
// never this note; a failed read gets nothing at all.
export function monthsumNote(k) {
  if (!k || k.failed || k.kept === null) return null;
  const n = (k.missing ?? []).length;
  if (n === 0) return null;
  return `${n} ${n === 1 ? "bill" : "bills"} not entered`;
}

// The step-down chart: Came in, then one step down per bill typed in, then You
// kept. With no bill typed in there is no "kept" step at all, only a marker that
// says the bills are not entered.
export function stepsOf(k) {
  if (!k || k.failed) return [];
  const out = [{ key: "in", label: "Came in", cents: k.in, kind: "total" }];
  for (const b of k.bills) if (b.cents !== null) out.push({ key: b.kind, label: b.name, cents: -b.cents, kind: "bill" });
  out.push(k.kept === null
    ? { key: "unentered", label: "Bills", cents: null, kind: "unentered" }
    : { key: "kept", label: "You kept", cents: k.kept, kind: "kept" });
  return out;
}

const real = (rows) => (rows ?? []).filter((r) => !r.is_demo);
const paying = (s) => s && (s.status === "active" || s.status === "trialing");

// Monthly income split by plan, real detailers only (fixtures are not income).
// A declined card is its own slice and is NOT in the total: it is money that did
// not arrive. Yearly plans count per month, the same division as `monthlyCents`.
export function byPlan(rows) {
  const parts = [
    { key: "month", label: "Monthly plans", cents: 0, n: 0 },
    { key: "year", label: "Yearly plans, per month", cents: 0, n: 0 },
  ];
  const late = { key: "late", label: "Card failed", cents: 0, n: 0 };
  for (const r of real(rows)) {
    const s = r.subscription, c = monthlyCents(r);
    if (c === null) continue;
    if (s.status === "past_due") { late.cents += c; late.n++; continue; }
    if (!paying(s)) continue;
    const p = parts[s.bill_interval === "year" ? 1 : 0];
    p.cents += c; p.n++;
  }
  return { parts, late, total: parts[0].cents + parts[1].cents, paying: parts[0].n + parts[1].n };
}

// What should come in over the next `days`: each paying real subscription that
// renews inside the window and is not set to cancel. The FULL charge, not the
// per-month share, because that is what will land on the day.
// A failed card renewing in the window is `late`: drawn on the timeline (9.12b)
// but NOT in `total`, the same reason `byPlan` keeps it out.
export function comingIn(rows, days = 30, now = new Date()) {
  const t0 = now.getTime(), t1 = t0 + days * 864e5;
  const due = (ok) => real(rows)
    .filter((r) => ok(r.subscription) && !r.subscription.cancel_at_period_end)
    .map((r) => ({ row: r, at: Date.parse(r.subscription.current_period_end), cents: Number(r.subscription.recurring_cents) }))
    .filter((p) => Number.isFinite(p.at) && Number.isFinite(p.cents) && p.at >= t0 && p.at < t1)
    .sort((a, b) => a.at - b.at)
    .map((p) => ({ ...p, day: (p.at - t0) / 864e5, yearly: p.row.subscription.bill_interval === "year" }));
  const pins = due(paying);
  return { pins, late: due((s) => s?.status === "past_due"), total: pins.reduce((a, p) => a + p.cents, 0) };
}

// Dollars typed into the bill form, as integer cents, or null when it is not a
// usable amount. The server checks again (`costEntry`); this only stops the
// button from sending something it will refuse.
export function centsOf(text) {
  const s = String(text ?? "").trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

/* ── what the platform charges, flattened and given its units ─────────────
   Moved here from the old back-office screen (9.12a 6b) so the Money place
   reads ONE copy. The table is two levels deep and mixes three kinds of number, so
   neither `String(v)` nor `money(v)` is right for all of it. THE KEY CARRIES THE
   UNIT — nothing else in the value knows whether 12 is dollars, months or a share.
   Anything unrecognised falls through as a plain number rather than being dressed
   as money, because a wrong unit reads as a real price. */
const WORDS = {
  website: "Website + booking", bookingOnly: "Booking only", founding: "Founding offer",
  standard: "Standard price", unknown: "No plan recorded",
  term: "Contract", annual: "Paid yearly", monthly: "A month", setup: "To set up",
  monthToMonth: "Month to month", months: "Length", exitFeeShare: "Exit fee",
};
export const say = (k) => WORDS[k] ?? k;
export const priceValue = (key, v) => {
  if (typeof v !== "number") return String(v);
  if (key === "months") return `${v} months`;
  if (key === "exitFeeShare") return `${Math.round(v * 100)}% of what is left`;
  return money(v);
};
// ONE WALK, AND THE EDITOR USES IT TOO. A hand-written list of fields beside this
// would be a second place that has to learn about a new price, and the one that
// forgets is the one that silently drops a figure out of the table the day
// somebody saves. So a row carries where it came from (`path`) and what is
// actually stored (`raw`) as well as what it reads as.
export function priceRows(table) {
  const out = [];
  for (const [k, v] of Object.entries(table ?? {})) {
    if (v && typeof v === "object") {
      for (const [k2, v2] of Object.entries(v)) {
        out.push({ path: [k, k2], raw: v2, label: `${say(k)} · ${say(k2)}`, value: priceValue(k2, v2) });
      }
    } else {
      out.push({ path: [k], raw: v, label: say(k), value: priceValue(k, v) });
    }
  }
  return out;
}
// The editor's draft (`"website.setup" -> "999"`, strings while typed) back into
// the nested table `prices` sends. NOTHING IS VALIDATED: the server runs it through
// `pricesFrom`, the function the checkout charges from, and a second opinion here
// is how the two answers drift. EXCEPT ONE THING, which is a conversion and not a
// judgement: `Number("")` is 0, so an emptied box used to save as $0 — and the setup
// fee is the one figure the server allows to be 0, so it was taken silently. A blank
// box goes as NaN (JSON null), which `pricesFrom` refuses with its own sentence.
export function tableOf(draft) {
  const table = {};
  for (const [k, v] of Object.entries(draft)) {
    const [a, b] = k.split(".");
    const n = String(v).trim() === "" ? NaN : Number(v);
    if (b === undefined) table[a] = n;
    else { table[a] = table[a] ?? {}; table[a][b] = n; }
  }
  return table;
}
