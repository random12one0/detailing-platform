// Client-side .ics (iCalendar) generation + download — no server round-trip,
// no external library. Shared by the customer receipt page and the owner's
// own "Add to Apple Calendar" button so both build the exact same file shape.
const pad = (n) => String(n).padStart(2, "0");

const icsStamp = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  const [hh = 0, mm = 0] = (timeStr || "00:00").split(":").map(Number);
  if (!y || !m || !d) return null;
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
};

const escapeICS = (str = "") =>
  String(str).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

// booking: needs id, booking_date, start_time, end_time.
export function downloadBookingIcs(booking, { summary, location, description, uidSuffix = "" }) {
  const dtStart = icsStamp(booking.booking_date, booking.start_time);
  const dtEnd = icsStamp(booking.booking_date, booking.end_time) || dtStart;
  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Andrews Auto Detail//Booking//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:booking-${booking.id}${uidSuffix}@andrewsauto`,
    `DTSTAMP:${dtStamp}`,
    dtStart ? `DTSTART:${dtStart}` : "",
    dtEnd ? `DTEND:${dtEnd}` : "",
    `SUMMARY:${escapeICS(summary)}`,
    location ? `LOCATION:${escapeICS(location)}` : "",
    description ? `DESCRIPTION:${escapeICS(description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `booking-${booking.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
