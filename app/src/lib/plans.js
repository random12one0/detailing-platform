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
//
// ROADMAP 8.17 STAGE 1B — EVERY GENERATOR BELOW TAKES A LANGUAGE AND NONE OF
// THEM READS ONE.
//
// These four are the reason the plan pages could not simply be wrapped in
// `t()`: their text is COMPUTED — a cadence, a price shape, a term, a count —
// so there is no sentence to look up. The Spanish lives beside the English
// here rather than in `strings/es.js`, exactly as `duration()` does in
// `format.js`, because a catalogue keyed on English cannot hold a template
// that has a number in the middle of it.
//
// **AND THE LANGUAGE IS AN ARGUMENT, ENGLISH BY DEFAULT.** This module is
// shared with the DETAILER's dashboard (`screens/more/Plans.jsx`,
// `screens/Clients.jsx`) and `dp.lang` is a per-device choice a CUSTOMER makes
// on a booking page. A generator that read the locale itself would turn a
// detailer's own back office Spanish the moment they previewed their page in
// it — the same defect `duration()` is written to avoid, one file over.
// `tests/spanish.test.mjs` § 5 fails on any read of the locale in here.
//
// **NOTHING IN THIS FILE IMPORTS ANYTHING**, and that is deliberate: it is
// the module a tenant's own site can drop in beside `book/core.js`.

// The cadence as a detailer says it. Named intervals get their name; anything
// else is counted out. A plan with no cadence is a discount membership, and
// saying so is the honest answer rather than leaving the line blank.
export function cadenceWords(plan, lang = "en") {
  const n = plan?.cadence_count, u = plan?.cadence_unit;
  const es = lang === "es";
  if (!n || !u) return es ? "Sin horario fijo" : "No set schedule";
  if (n === 1) {
    return es
      ? { week: "Semanal", month: "Mensual", year: "Anual" }[u]
      : { week: "Weekly", month: "Monthly", year: "Yearly" }[u];
  }
  if (n === 2 && u === "week") return es ? "Cada 2 semanas" : "Every 2 weeks";
  if (n === 3 && u === "month") return es ? "Trimestral" : "Quarterly";
  // Spanish pluralises the NOUN, so the unit words are spelled out rather than
  // built by adding an "s" the way the English branch can.
  if (es) return `Cada ${n} ${{ week: "semanas", month: "meses", year: "años" }[u]}`;
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
export function priceWords(kind, amount, money, lang = "en") {
  const n = Number(amount) || 0;
  const es = lang === "es";
  if (kind === "percent_off") return es ? `${n}% de descuento` : `${n}% off`;
  if (kind === "per_visit") return es ? `${money(n)} por visita` : `${money(n)} a visit`;
  if (kind === "total") return es ? `${money(n)} por adelantado` : `${money(n)} up front`;
  return es ? `${money(n)} al mes` : `${money(n)} a month`;
}

// **THE SAME PRICE, SPLIT INTO THE NUMBER AND ITS UNIT — 2026-09-11.**
// `priceWords` returns one string, which is right everywhere a price is a
// sentence and wrong where it is a FIGURE: on the plans page the amount is set
// large so it can be compared at a glance, and at that size "$120.00 a month"
// wraps onto two lines and reads as broken.
//
// Splitting it in the SCREEN would mean cutting the string on a space, which
// is a guess in English and wrong in Spanish ("$120.00 al mes"). It is split
// here, beside the words themselves, so both halves stay one translation's
// business. `priceWords` is unchanged and is still what every sentence uses.
export function priceParts(kind, amount, money, lang = "en") {
  const n = Number(amount) || 0;
  const es = lang === "es";
  if (kind === "percent_off") return { big: `${n}%`, small: es ? "de descuento" : "off" };
  if (kind === "per_visit") return { big: money(n), small: es ? "por visita" : "a visit" };
  if (kind === "total") return { big: money(n), small: es ? "por adelantado" : "up front" };
  return { big: money(n), small: es ? "al mes" : "a month" };
}

// The commitment, if there is one. Separate from the price on purpose: a
// prepaid year is usually twelve months, but a prepaid block of ten visits
// has no end date at all, and "paid up front" is a fact about the money while
// a term is a fact about the commitment. Null is the ordinary answer — six of
// ten sampled detailers advertise no contract as a selling point.
export function termWords(plan, lang = "en") {
  const m = Number(plan?.term_months) || 0;
  if (!m) return null;
  const es = lang === "es";
  if (m === 12) return es ? "Contrato de 1 año" : "1-year term";
  if (m % 12 === 0) {
    return es ? `Contrato de ${m / 12} años` : `${m / 12}-year term`;
  }
  return es ? `Contrato de ${m} meses` : `${m}-month term`;
}

// What a plan grants each time the cadence comes round.
export function visitWords(plan, lang = "en") {
  const v = Number(plan?.visits_per_period) || 1;
  if (lang === "es") return v === 1 ? "1 visita" : `${v} visitas`;
  return v === 1 ? "1 visit" : `${v} visits`;
}

export const STATUS_WORDS = { active: "Active", paused: "Paused", ended: "Ended" };
const STATUS_WORDS_ES = { active: "Activo", paused: "En pausa", ended: "Terminado" };

// **A FUNCTION RATHER THAN A SECOND EXPORTED OBJECT**, so a call site cannot
// index the English one by accident and get a correct-looking wrong answer.
//
// **STAGE 2B IS THE DASHBOARD'S STAGE, so the two call sites that indexed
// `STATUS_WORDS` directly now call this instead.** The note that used to sit
// here said that object stayed exported *because the dashboard reads it
// directly and this stage is not the dashboard's* — which is exactly the
// hazard the paragraph above names, left open on purpose until now. It is
// still exported for `tests/plans.test.mjs`, which asserts the three statuses
// are named; nothing that DRAWS reads it any more.
export function statusWords(status, lang = "en") {
  const table = lang === "es" ? STATUS_WORDS_ES : STATUS_WORDS;
  return table[status] ?? STATUS_WORDS[status] ?? status;
}

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
