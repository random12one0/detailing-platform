// Where "which app should this open in?" is decided — once, here.
//
// The app used to assume. Navigate always went to Google Maps, whatever the
// person actually uses; the calendar button always handed back an .ics.
// Both are fine defaults and both are wrong for somebody. This module
// detects a sensible default from the device and then gets out of the way:
// the owner's choice, once made, wins everywhere.
//
// These are DEVICE preferences, not business settings — the same owner on a
// phone and a laptop can want different answers, and a staff member's choice
// is nobody else's business. So they live in localStorage, not the database.

const KEY = "dp-platform-prefs";

export const PLATFORMS = { IOS: "ios", ANDROID: "android", OTHER: "other" };

export function detectPlatform() {
  if (typeof navigator === "undefined") return PLATFORMS.OTHER;
  const ua = navigator.userAgent || "";
  // iPadOS 13+ reports as Macintosh; a touch point count separates a real
  // iPad from a desktop Mac.
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return PLATFORMS.IOS;
  if (/Android/.test(ua)) return PLATFORMS.ANDROID;
  return PLATFORMS.OTHER;
}

// What we pick for someone who has never opened Preferences. Apple Maps and
// Apple Calendar only make sense on Apple hardware; everywhere else the
// Google equivalents are the safe bet, and a plain file download is the
// answer that works with no account at all.
export function defaultPrefs(platform = detectPlatform()) {
  if (platform === PLATFORMS.IOS) return { maps: "apple", calendar: "ics", contacts: "vcf" };
  if (platform === PLATFORMS.ANDROID) return { maps: "google", calendar: "google", contacts: "vcf" };
  return { maps: "google", calendar: "ics", contacts: "vcf" };
}

export function loadPrefs() {
  const base = defaultPrefs();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { ...base, ...saved };
  } catch {
    // A private window, cleared storage, or storage disabled entirely.
    return base;
  }
}

export function savePrefs(prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* not fatal */ }
}

// --- Links -----------------------------------------------------------------

export function mapsUrlFor(address, maps = loadPrefs().maps) {
  const q = encodeURIComponent(address || "");
  if (maps === "apple") return `https://maps.apple.com/?q=${q}`;
  // Waze has no "search" deep link that also navigates, so hand it the query
  // and let it resolve — navigate=yes starts the route once it matches.
  if (maps === "waze") return `https://waze.com/ul?q=${q}&navigate=yes`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

const stampUTC = (iso) =>
  new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Google Calendar takes a pre-filled event in a URL. Apple Calendar has no
// such thing — it consumes .ics — so "apple" and "ics" both hand back the
// file, which is the correct answer and not a shortcut.
export function calendarUrlFor(booking, icsHref, calendar = loadPrefs().calendar) {
  if (calendar !== "google") return icsHref;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${booking.customer_name || "Booking"}${booking.service_name ? ` — ${booking.service_name}` : ""}`,
    dates: `${stampUTC(booking.start_at)}/${stampUTC(booking.end_at)}`,
    details: [booking.customer_phone, booking.customer_notes].filter(Boolean).join("\n"),
    location: booking.customer_address || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// --- Contacts --------------------------------------------------------------

// vCard 3.0, which is what both iOS and Android read. Line folding is not
// needed at these lengths; escaping commas and semicolons is.
const esc = (v) => String(v || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export function buildVCard({ name, phone, email, address, org }) {
  const parts = String(name || "").trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop() : "";
  const first = parts.join(" ");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(last)};${esc(first)};;;`,
    `FN:${esc(name)}`,
    org ? `ORG:${esc(org)}` : null,
    phone ? `TEL;TYPE=CELL:${esc(phone)}` : null,
    email ? `EMAIL;TYPE=INTERNET:${esc(email)}` : null,
    address ? `ADR;TYPE=HOME:;;${esc(address)};;;;` : null,
    "END:VCARD",
  ].filter(Boolean).join("\r\n");
}

// Hands the card to the OS. On iOS Safari this opens the contact card
// directly; on Android it downloads a .vcf that Contacts imports. There is
// no web API that writes to the address book, so a file is the only route.
export function saveContact(contact) {
  const blob = new Blob([buildVCard(contact)], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(contact.name || "contact").replace(/[^\w\s-]/g, "")}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
