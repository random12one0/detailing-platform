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

// The zone's offset from UTC at an instant, in ms (Los Angeles in summer: -7h).
function offsetAt(tz: string, ms: number): number {
  const p = partsOf(tz, new Date(ms), {
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
  return asIfUtc - ms;
}

// Convert a business-local wall-clock (y, mo, d, hh, mi) into the correct
// absolute instant, accounting for that zone's DST.
//
// ROADMAP 97.1 — this used to read the offset ONCE, at the wall time taken as
// UTC, which on a clock-change Sunday lands on the other side of the change:
// 08:00 on 2026-03-08 in Los Angeles was saved as 9:00 AM. A zone is on at most
// two offsets around any one day, so try both and keep the one the zone is
// really on at the resulting instant. An hour that happens twice (01:30 in
// November) gets the earlier one; an hour that never happens (02:30 in March)
// is moved forward by the gap, to 03:30, as phones and calendars do.
// `tests/tz-clock-change.test.mjs` holds all 24 hours of both Sundays.
export function localToDate(tz: string, y: number, mo: number, d: number, hh: number, mi: number): Date {
  const wall = Date.UTC(y, mo - 1, d, hh, mi);
  const before = offsetAt(tz, wall - 86_400_000);
  const after = offsetAt(tz, wall + 86_400_000);
  for (const o of before > after ? [before, after] : [after, before]) {
    if (offsetAt(tz, wall - o) === o) return new Date(wall - o);
  }
  return new Date(wall - before);
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
