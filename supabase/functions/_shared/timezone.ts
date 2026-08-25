// Pacific-timezone-aware Date helpers.
//
// The edge function runtime's own clock is UTC (confirmed live: Intl resolves
// to "UTC", getTimezoneOffset() === 0). Business hours, "today", and the
// booking calendar are all defined in America/Los_Angeles. A naive
// `new Date(y, mo - 1, d, hh, mi)` is interpreted by the runtime as UTC, not
// Pacific, so it's silently 7-8 hours off (depending on DST) from the
// intended Pacific instant — and since Pacific evenings (~5pm on) fall on the
// NEXT UTC calendar day, any same-day-vs-"today" comparison done with
// `.toDateString()` breaks specifically during the back half of business
// hours. These helpers make every such comparison explicitly Pacific-aware.

export const TIMEZONE = "America/Los_Angeles";

const partsOf = (d: Date, opts: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, ...opts }).formatToParts(d).map((p) => [p.type, p.value]),
  ) as Record<string, string>;

// Convert a Pacific-local wall-clock (y, mo, d, hh, mi) into the correct
// absolute instant, accounting for PST/PDT.
export function pacificToDate(y: number, mo: number, d: number, hh: number, mi: number): Date {
  const utcGuess = new Date(Date.UTC(y, mo - 1, d, hh, mi));
  const p = partsOf(utcGuess, {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const asIfUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    p.hour === "24" ? 0 : Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  const offsetMs = utcGuess.getTime() - asIfUtc;
  return new Date(utcGuess.getTime() + offsetMs);
}

// "YYYY-MM-DD" for a given instant (default: right now), in Pacific.
export function pacificDateStr(d: Date = new Date()): string {
  const p = partsOf(d, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}
