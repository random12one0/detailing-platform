// Personalized customer text messages for the owner to send from his own phone.
// The admin copies these to the clipboard (and/or prefills an sms: link) so a new
// customer gets a warm, on-brand confirmation with their name already filled in.
import { formatDate, formatTime } from "@/lib/format";

const firstNameOf = (fullName) => {
  const n = String(fullName || "").trim();
  if (!n) return "there";
  return n.split(/\s+/)[0];
};

// A friendly booking-confirmation text. Kept short and natural — the kind of thing
// a local business owner would actually text.
export function buildConfirmationText(booking) {
  const name = firstNameOf(booking?.customer_name);
  const date = booking?.booking_date ? formatDate(booking.booking_date) : "";
  const time = booking?.start_time ? formatTime(booking.start_time) : "";
  const when = date && time ? ` on ${date} at ${time}` : date ? ` on ${date}` : "";
  return (
    `Hi ${name}, this is Andrew with Andrew's Auto Detail & Car Wash. ` +
    `Just confirming your appointment${when}. Looking forward to getting your car ` +
    `looking great! Text me here if you have any questions or need to reschedule. Thanks!`
  );
}

// A super-short day-of / day-before check-in. Deliberately does NOT re-introduce
// Andrew (the customer already has the thread) — just a quick "still good?" nudge.
export function buildReminderText(booking) {
  const name = firstNameOf(booking?.customer_name);
  const date = booking?.booking_date ? formatDate(booking.booking_date) : "";
  const time = booking?.start_time ? formatTime(booking.start_time) : "";
  const when = date && time ? ` on ${date} at ${time}` : date ? ` on ${date}` : time ? ` at ${time}` : "";
  return `Hi ${name}, just checking in — are we still good for your detail${when}? Thanks!`;
}

// Copy text to the clipboard, resolving true/false so callers can toast. Falls back
// to a hidden textarea + execCommand for older / non-secure-context browsers.
export async function copyText(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

// sms: link with the message prefilled where the OS supports it (iOS/Android differ,
// but this degrades gracefully to just opening the thread).
export function smsHref(phone, body) {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  return `sms:${digits}${body ? `?&body=${encodeURIComponent(body)}` : ""}`;
}
