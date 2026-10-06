// ROADMAP 6.4a — THE LAST LIST OF JOBS THIS DEVICE LOADED, KEPT FOR THE DAY THE
// SIGNAL IS NOT THERE.
//
// A detailer reloads a tab in a driveway, or the phone drops a sleeping tab and
// loads it again, and every one of those starts the app from nothing. Today's
// state lives in the screen, so it is gone; this keeps the list where a reload
// can reach it. One entry per business, plus a pointer to the latest, because
// the offline page has no session to ask "which business".
//
// **IT PUTS CUSTOMER NAMES, PHONES AND ADDRESSES IN `localStorage`** — the one
// real cost, ruled on 2026-10-06 (DECISIONS.md): a detailer's own phone, their
// own customers, kept only until they sign out. Sign-out is the one place it is
// cleared (lib/signout.js calls `forgetJobs`), so it has to stay the one door.
// Never write a keyed secret here; this is bookings and nothing else.

import { localDate, localTime, time12 } from "./format.js";
import { appIntlLocale } from "./appI18n.js";

const PREFIX = "dp.jobs.";
const LAST = `${PREFIX}last`;

// What fetch() says when there is no network: Chrome, Firefox, Safari.
const NETWORK_FAILURE = /failed to fetch|networkerror|load failed|network request failed/i;
export const isNetworkFailure = (message) => NETWORK_FAILURE.test(message || "");

export function saveJobs(business, bookings) {
  try {
    localStorage.setItem(PREFIX + business.id, JSON.stringify({
      at: new Date().toISOString(), id: business.id, name: business.name,
      tz: business.timezone, bookings,
    }));
    localStorage.setItem(LAST, business.id);
  } catch { /* private window or full: the list simply is not kept */ }
}

export function readJobs(businessId) {
  try {
    const v = JSON.parse(localStorage.getItem(PREFIX + businessId) || "null");
    return v && Array.isArray(v.bookings) && v.at ? v : null;
  } catch { return null; }
}

export const readLastJobs = () => {
  try { return readJobs(localStorage.getItem(LAST)); } catch { return null; }
};

export function forgetJobs() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* nothing to clear */ }
}

// "3:37 PM" for a list saved today, "Oct 5, 3:37 PM" for an older one: a list
// that is days old must not read as though it were this afternoon's.
export function asOfLabel(iso, tz, today) {
  const d = new Date(iso);
  const time = time12(localTime(iso, tz));
  if (localDate(iso, tz) === today) return time;
  return `${d.toLocaleDateString(appIntlLocale(), { timeZone: tz, month: "short", day: "numeric" })}, ${time}`;
}
