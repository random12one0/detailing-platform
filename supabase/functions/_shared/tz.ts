// Timezone-aware date helpers, generalized from the old Pacific-only module:
// every function takes the business's IANA timezone. The edge runtime's own
// clock is UTC, so a naive `new Date(y, mo-1, d, hh, mi)` would silently be
// hours off from the intended business-local instant.

const partsOf = (tz: string, d: Date, opts: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;

// Convert a business-local wall-clock (y, mo, d, hh, mi) into the correct
// absolute instant, accounting for that zone's DST.
export function localToDate(tz: string, y: number, mo: number, d: number, hh: number, mi: number): Date {
  const utcGuess = new Date(Date.UTC(y, mo - 1, d, hh, mi));
  const p = partsOf(tz, utcGuess, {
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
  return new Date(utcGuess.getTime() + (utcGuess.getTime() - asIfUtc));
}

// "YYYY-MM-DD" for an instant, in the business's zone.
export function dateStrIn(tz: string, d: Date = new Date()): string {
  const p = partsOf(tz, d, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

// "HH:MM" for an instant, in the business's zone.
export function timeStrIn(tz: string, d: Date): string {
  const p = partsOf(tz, d, { hour12: false, hour: "2-digit", minute: "2-digit" });
  return `${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

export function hourIn(tz: string, d: Date = new Date()): number {
  const p = partsOf(tz, d, { hour12: false, hour: "2-digit" });
  return p.hour === "24" ? 0 : Number(p.hour);
}

// Combine "YYYY-MM-DD" + "HH:MM[:SS]" (business-local) into an instant.
export function localDateTimeToInstant(tz: string, dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [hh, mi] = timeStr.split(":").map(Number);
  return localToDate(tz, y, mo, d, hh, mi);
}

// Weekday (0=Sunday..6=Saturday) of a "YYYY-MM-DD" — a pure calendar fact,
// independent of timezone as long as we never round-trip through UTC.
export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}
