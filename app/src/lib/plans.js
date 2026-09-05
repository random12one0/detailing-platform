// The plans arithmetic, with no React and no browser in it.
//
// WHY IT IS ITS OWN FILE — the same reason `client-list.js`, `setup.js` and
// `permissions.js` are, and it applies harder here. Three of the things below
// decide something a person acts on: how many visits somebody is OWED, when
// the next one falls due, and what a plan costs in words. The owed figure is
// the one number this whole feature exists to print, and a number a screen
// computes inline is a number nothing can ever check.
//
// `tests/plans.test.mjs` imports this file directly.
//
// THE ONE RULE THAT SPANS TWO LANGUAGES: `addPeriod` below must land on the
// same date Postgres's `+ interval` does, because `accrue_plan_visits()` in
// `20260904002000_plans.sql` writes the grants and this file predicts the next
// one. Postgres clamps a month overflow (31 Jan + 1 month = 28 Feb) and so
// does this. If they disagree, the screen says a visit is due on a day the
// database will never grant.

// --- Dates ------------------------------------------------------------------
// Calendar dates, not instants, so everything is built in UTC — the same
// argument `client-list.js` makes: building them in local time makes the
// answer depend on the machine running it.

export function addPeriod(date, count, unit) {
  const [y, m, d] = date.split("-").map(Number);
  if (unit === "week") {
    const t = new Date(Date.UTC(y, m - 1, d + count * 7));
    return t.toISOString().slice(0, 10);
  }
  const months = unit === "year" ? count * 12 : count;
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  // Clamp, the way Postgres does: the last day of the target month if the
  // original day does not exist in it.
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

// --- Words ------------------------------------------------------------------

// The cadence as a detailer says it. Named intervals get their name; anything
// else is counted out. A plan with no cadence is a discount membership, and
// saying so is the honest answer rather than leaving the line blank.
export function cadenceWords(plan) {
  const n = plan?.cadence_count, u = plan?.cadence_unit;
  if (!n || !u) return "No set schedule";
  if (n === 1) return { week: "Weekly", month: "Monthly", year: "Yearly" }[u];
  if (n === 2 && u === "week") return "Every 2 weeks";
  if (n === 3 && u === "month") return "Quarterly";
  return `Every ${n} ${u}s`;
}

// A plan's price, expressed the way the detailer chose to express it. All
// FOUR shapes are in the sample and forcing one would exclude real
// businesses — see the migration headers.
//
// `total` arrived after the owner asked whether a detailer is locked into a
// kind of plan (2026-09-04). A prepaid block — "$1,999 for the year" — had to
// be entered as a monthly price until then, and the screen printed
// "$1999.00 a month", which is neither what the detailer means nor what the
// customer pays.
export function priceWords(kind, amount, money) {
  const n = Number(amount) || 0;
  if (kind === "percent_off") return `${n}% off`;
  if (kind === "per_visit") return `${money(n)} a visit`;
  if (kind === "total") return `${money(n)} up front`;
  return `${money(n)} a month`;
}

// The commitment, if there is one. Separate from the price on purpose: a
// prepaid year is usually twelve months, but a prepaid block of ten visits
// has no end date at all, and "paid up front" is a fact about the money while
// a term is a fact about the commitment. Null is the ordinary answer — six of
// ten sampled detailers advertise no contract as a selling point.
export function termWords(plan) {
  const m = Number(plan?.term_months) || 0;
  if (!m) return null;
  if (m === 12) return "1-year term";
  if (m % 12 === 0) return `${m / 12}-year term`;
  return `${m}-month term`;
}

// What a plan grants each time the cadence comes round.
export function visitWords(plan) {
  const v = Number(plan?.visits_per_period) || 1;
  return v === 1 ? "1 visit" : `${v} visits`;
}

export const STATUS_WORDS = { active: "Active", paused: "Paused", ended: "Ended" };

// --- The ledger -------------------------------------------------------------

// Everything one member's row needs to print, from the two halves the schema
// keeps apart: grants are rows in `plan_visits`, uses are that member's
// bookings. See the migration header for why used is not a ledger row.
//
// `visits` and `bookings` are the WHOLE business's, filtered here, so a screen
// makes two reads rather than two per member.
export function ledgerFor(member, plan, visits, bookings) {
  const mine = (visits ?? []).filter((v) => v.member_id === member.id);
  const granted = mine.reduce((s, v) => s + (Number(v.delta) || 0), 0);
  // A CANCELLED VISIT COMES BACK, with no rule of its own — this is the whole
  // reason used lives on the booking. `deleted_at` is the soft delete every
  // read in this codebase already honours.
  const used = (bookings ?? []).filter(
    (b) => b.plan_member_id === member.id && b.status !== "cancelled" && !b.deleted_at,
  ).length;
  const lastDue = mine.reduce((a, v) => (!a || v.due_on > a ? v.due_on : a), null);
  return {
    granted,
    used,
    // Can go negative, and that is a true statement rather than a defect: they
    // have had more than the plan promised. The migration's auto-link ceiling
    // is the usual cause and the fix is an 'adjusted' row.
    owed: granted - used,
    lastDue,
    nextDue: nextDueOn(member, plan, lastDue),
  };
}

// When the next visit falls due. One period after the last grant, or
// `accrue_from` if nothing has been granted yet. Null where the plan has no
// rhythm, or the member is not active — a paused plan has no next date, which
// is the point of pausing it.
export function nextDueOn(member, plan, lastDue) {
  if (!plan?.cadence_unit || member?.status !== "active") return null;
  if (!lastDue) return member.accrue_from;
  return addPeriod(lastDue, plan.cadence_count, plan.cadence_unit);
}

// THE ONE LIST THIS FEATURE EXISTS FOR. Housecall Pro calls it Unscheduled
// Visits and it is the most valuable thing on their plans dashboard, for
// exactly the reason this product's own research opened with: THE SALE AND THE
// SCHEDULE ARE TWO SEPARATE ACTS. Nobody in the sample books the visits at
// sign-up, so somebody has to be told who is owed one.
//
// Owed but NOT BOOKED — a visit already on the calendar is not this screen's
// problem, and that falls out for free because booking one is what writes
// `plan_member_id`.
export function visitsOwed(members, plansById, visits, bookings) {
  return (members ?? [])
    .filter((m) => m.status === "active")
    .map((m) => ({ member: m, plan: plansById.get(m.plan_id), ...ledgerFor(m, plansById.get(m.plan_id), visits, bookings) }))
    .filter((r) => r.owed > 0)
    // Longest overdue first: the person waiting on two visits since March is
    // the one the detailer should ring, not the one who came due this morning.
    .sort((a, b) => (b.owed - a.owed) || String(a.lastDue ?? "").localeCompare(String(b.lastDue ?? "")));
}
