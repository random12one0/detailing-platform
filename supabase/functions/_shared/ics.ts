// iCalendar (.ics) generation — ONE implementation, used by the customer's
// receipt link and the owner's add-to-calendar button.
//
// The approach is the old app's (small, dependency-free, RFC-5545 line
// shape), with three fixes:
//   * PRODID carries the platform, not a hardcoded business name.
//   * Times are stamped DTSTART;TZID=<the business's IANA zone> instead of
//     floating. A floating time is interpreted in the VIEWER's timezone, so
//     the old file put a 10am Los Angeles job at 10am wherever the customer
//     happened to be — wrong for anyone out of state.
//   * A minimal VTIMEZONE carrying the UTC offset actually in effect at the
//     event is included, so clients that don't know the IANA name still
//     resolve the correct instant (Phoenix included — the offset is read
//     from the zone at that date, never assumed to shift).

import { PLATFORM_DOMAIN } from "./config.ts";

const pad = (n: number) => String(n).padStart(2, "0");

const escapeICS = (str: string) =>
  String(str ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

// "YYYYMMDDTHHMMSS" for an instant, expressed in the given zone.
function localStamp(tz: string, at: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(at).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  const hh = p.hour === "24" ? "00" : p.hour;
  return `${p.year}${p.month}${p.day}T${hh}${p.minute}${p.second}`;
}

// "+HHMM" / "-HHMM": the offset in effect for this zone AT this instant.
// Read from the tz database, so a non-DST zone like Phoenix reports the same
// value year-round and a DST zone reports the seasonally correct one.
function utcOffset(tz: string, at: Date): string {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return "+0000";
  return `${m[1]}${m[2]}${m[3]}`;
}

// Short label ("PDT", "MST") for the VTIMEZONE component name.
function zoneAbbrev(tz: string, at: Date): string {
  const v = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "";
  return /^[A-Z]{2,5}$/.test(v) ? v : tz.split("/").pop()!.replace(/_/g, "");
}

export interface IcsEvent {
  uid: string;             // stable per booking (+ audience suffix)
  timezone: string;        // the business's IANA zone
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  organizerName?: string;
  organizerEmail?: string | null;
}

export function buildIcs(ev: IcsEvent): string {
  const now = new Date();
  const dtStamp = `${localStamp("UTC", now)}Z`;
  const offset = utcOffset(ev.timezone, ev.start);
  const abbrev = zoneAbbrev(ev.timezone, ev.start);
  // Label the component honestly: a zone is on daylight time when its offset
  // at the event differs from its January offset. Phoenix never differs, so
  // it always reports STANDARD.
  const januaryOffset = utcOffset(ev.timezone, new Date(Date.UTC(ev.start.getUTCFullYear(), 0, 15)));
  const component = offset === januaryOffset ? "STANDARD" : "DAYLIGHT";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${PLATFORM_DOMAIN}//Booking//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    // Minimal, offset-accurate zone definition for clients that don't carry
    // the IANA database themselves.
    "BEGIN:VTIMEZONE",
    `TZID:${ev.timezone}`,
    `BEGIN:${component}`,
    "DTSTART:19700101T000000",
    `TZOFFSETFROM:${offset}`,
    `TZOFFSETTO:${offset}`,
    `TZNAME:${abbrev}`,
    `END:${component}`,
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${ev.uid}@${PLATFORM_DOMAIN}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=${ev.timezone}:${localStamp(ev.timezone, ev.start)}`,
    `DTEND;TZID=${ev.timezone}:${localStamp(ev.timezone, ev.end)}`,
    `SUMMARY:${escapeICS(ev.summary)}`,
    ev.location ? `LOCATION:${escapeICS(ev.location)}` : "",
    ev.description ? `DESCRIPTION:${escapeICS(ev.description)}` : "",
    ev.organizerEmail
      ? `ORGANIZER;CN=${escapeICS(ev.organizerName ?? "")}:mailto:${ev.organizerEmail}`
      : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  // RFC 5545 wants CRLF line endings.
  return lines.join("\r\n");
}

export const icsFilename = (customerName: string) =>
  `${String(customerName || "booking").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "booking"}.ics`;
