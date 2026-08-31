// Time ranges for the Money screen. Roadmap 2.7, W6 — the owner asked for
// week / month / six months / year / lifetime and was explicit about not
// wanting anything invented: "whatever is the standard online for the
// different amount of ranges."
//
// So the conventions here are borrowed, not designed:
//   · A PERIOD is a bounded [start, end] pair of business-local dates. Every
//     figure on that screen is "money in this period", so there is one
//     definition of the period and nothing computes its own.
//   · The comparison is always the SAME PERIOD, one step back — this week vs
//     last week, this year vs last year. That is what every dashboard means
//     by "vs previous", and it is what makes the delta honest: comparing a
//     part-finished week against a whole one is the classic wrong number.
//   · Six months and a year are ROLLING off the current month, not calendar
//     halves and not fiscal years. A detailer has no fiscal year.
//   · The week starts on Sunday, matching both calendars in this product.
//
// Kept out of format.js on purpose: that file is one-line formatters with no
// state, and this is a small calendar.

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const lastOfMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const shortMonth = (y, m) => new Date(y, m, 1).toLocaleDateString("en-US", { month: "short" });

// The five he named, in the order he named them. `key` is what gets stored.
export const PERIOD_KINDS = [
  ["week", "Week"],
  ["month", "Month"],
  ["6m", "6 months"],
  ["year", "Year"],
  ["all", "Lifetime"],
];

// How many buckets the chart draws, per kind. Six is what the screen already
// drew for months and it is what fits a phone at 392 without the labels
// touching; a year gets five because five year-labels are wider than six
// month-labels.
export const CHART_BUCKETS = { week: 6, month: 6, "6m": 6, year: 5, all: 6 };

// The period `offset` steps back from the one containing `today`.
// offset 0 = the current one, -1 = the one before it.
export function periodAt(kind, today, offset = 0) {
  const t = parse(today);
  const y = t.getFullYear(), m = t.getMonth();

  if (kind === "week") {
    // Sunday-start, matching .cal-head and .bk-dow.
    const start = new Date(y, m, t.getDate() - t.getDay() + offset * 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const sameMonth = start.getMonth() === end.getMonth();
    return {
      start: ymd(start), end: ymd(end),
      label: sameMonth
        ? `${shortMonth(start.getFullYear(), start.getMonth())} ${start.getDate()}–${end.getDate()}`
        : `${shortMonth(start.getFullYear(), start.getMonth())} ${start.getDate()} – ${shortMonth(end.getFullYear(), end.getMonth())} ${end.getDate()}`,
      tick: String(start.getDate()),
    };
  }

  if (kind === "month") {
    const d = new Date(y, m + offset, 1);
    return {
      start: ymd(d),
      end: ymd(new Date(d.getFullYear(), d.getMonth(), lastOfMonth(d.getFullYear(), d.getMonth()))),
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      tick: shortMonth(d.getFullYear(), d.getMonth()),
    };
  }

  if (kind === "6m") {
    // Rolling: the six months ENDING with the anchor month.
    const endM = new Date(y, m + offset * 6, 1);
    const startM = new Date(endM.getFullYear(), endM.getMonth() - 5, 1);
    return {
      start: ymd(startM),
      end: ymd(new Date(endM.getFullYear(), endM.getMonth(), lastOfMonth(endM.getFullYear(), endM.getMonth()))),
      label: `${shortMonth(startM.getFullYear(), startM.getMonth())} ${startM.getFullYear()} – ${shortMonth(endM.getFullYear(), endM.getMonth())} ${endM.getFullYear()}`,
      tick: `${shortMonth(startM.getFullYear(), startM.getMonth())} ${String(startM.getFullYear()).slice(2)}`,
    };
  }

  if (kind === "year") {
    const yy = y + offset;
    return { start: `${yy}-01-01`, end: `${yy}-12-31`, label: String(yy), tick: String(yy) };
  }

  // Lifetime. It does not step — there is only one of it — and it reaches
  // back TEN YEARS, not to `businesses.created_at`.
  //
  // created_at was tried first and it read $0.00 on a business with three
  // years of takings on the screen behind it. The row is created when the
  // detailer signs up; their HISTORY can be older, because bookings get
  // seeded, imported and back-dated. The account's birthday is not the
  // business's. Ten years is the same reach the Calendar's "Everything"
  // filter already uses, so the two screens agree about what "all" means.
  return { start: ymd(new Date(y - 10, m, t.getDate())), end: ymd(t), label: "All time", tick: String(y) };
}

// The chart's buckets: the N periods ending at the selected one, oldest
// first. Clicking one steps to it, which is what the month bars already did.
export function bucketsFor(kind, today, offset) {
  const n = CHART_BUCKETS[kind] ?? 6;
  // Lifetime charts by YEAR: every other kind charts itself, but "the last
  // six lifetimes" is not a thing. Its bars carry no offset because there is
  // nowhere for a lifetime to step to.
  if (kind === "all") {
    return Array.from({ length: n }, (_, i) => ({
      ...periodAt("year", today, i - (n - 1)), offset: null,
    }));
  }
  return Array.from({ length: n }, (_, i) => {
    const o = offset - (n - 1 - i);
    return { ...periodAt(kind, today, o), offset: o };
  });
}

export const inPeriod = (dateStr, p) => dateStr >= p.start && dateStr <= p.end;
