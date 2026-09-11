// Prefilled customer texts. Seeded per business on first open, then fully
// editable. Placeholders are filled from the booking when the owner taps
// Text on a job.
//
// ROADMAP 8.17 STAGE 2B — the strings here are English KEYS. `t()` is applied
// where they are DRAWN, and where they are SEEDED (`MessageTemplates.jsx`), so
// a detailer's starting templates land in the language they are reading.
import { t } from "./appI18n.js";

// **TEN, NOT SIX — his review, 2026-09-11.** *"Make sure there's nothing else
// that should be there that they should be able to have added."*
//
// The six were the ones a confirmation email happens to need. The four added
// are the ones a detailer TEXTS about, which is what this screen is for: what
// they booked, what they drive, how to call you back, and where to change it.
//
// **EVERY TOKEN HERE HAS TO BE FILLABLE AT THE SEND SITE OR IT MUST NOT
// EXIST.** `BookingDetail.jsx` is the only caller that sends for real, and it
// holds the whole booking row, the business row and the site origin — so all
// ten resolve there. A token that renders empty is worse than a token nobody
// has: the detailer does not find out until the customer has the message.
// `PLAIN` in `MessageTemplates.jsx` must carry a label for each one.
//
// WHAT IS DELIBERATELY NOT HERE: a deposit or balance token (this product
// takes no money, so there is no balance to name), and an arrival window
// (`start_time` is a moment, and inventing a window here would be a promise
// the calendar never made).
export const PLACEHOLDERS = [
  ["{{customer_name}}", "the customer's first name"],
  ["{{business_name}}", "your business name"],
  ["{{date}}", "the job's date"],
  ["{{time}}", "the job's start time"],
  ["{{address}}", "where the job happens"],
  ["{{total}}", "the job's total"],
  ["{{service}}", "what they booked"],
  ["{{vehicle}}", "the car"],
  ["{{business_phone}}", "your phone number"],
  ["{{booking_link}}", "a link to their booking"],
];

// --- THE PILL EDITOR'S TWO HALVES ------------------------------------------
//
// **HIS REVIEW, 2026-09-11:** *"there's this text box… and you have to insert
// these weird things… without them, with all these double brackets and kind
// of coding-looking stuff."*
//
// The chips and the live preview were already here; what he is objecting to
// is that the BOX still shows `{{customer_name}}`. So the editor draws each
// token as an atomic pill and never shows a brace — and these two functions
// are the conversion, kept here rather than in the component because they are
// the part that can be got wrong silently and the part a test can reach.
//
// **THE STORED FORMAT DOES NOT CHANGE.** `message_templates.body` is still
// `Hi {{customer_name}}`, `fillTemplate` is untouched, and every message
// already saved keeps working. The braces became a rendering detail rather
// than a thing a person types.

// Body text → the pieces to draw. A piece is either {text} or {token}.
export function toSegments(body) {
  const out = [];
  const text = String(body || "");
  let last = 0;
  for (const m of text.matchAll(/\{\{\s*([^{}]*?)\s*\}\}/g)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ token: `{{${m[1]}}}` });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

// The editor's DOM → body text. Walks rather than reads `innerText`, because
// `innerText` would return the pill's LABEL ("Their name") and silently turn
// every token in the message into ordinary words.
export function fromEditorDom(root) {
  let out = "";
  const walk = (node) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { out += n.nodeValue; continue; }
      if (n.nodeType !== 1) continue;
      const tok = n.getAttribute?.("data-token");
      if (tok) { out += tok; continue; }
      if (n.tagName === "BR") { out += "\n"; continue; }
      // A contenteditable wraps new lines in DIV (Chrome) or P (Firefox).
      if (n.tagName === "DIV" || n.tagName === "P") {
        if (out && !out.endsWith("\n")) out += "\n";
        walk(n);
        continue;
      }
      walk(n);
    }
  };
  walk(root);
  // A trailing newline the browser added to hold the caret is not the
  // detailer's text.
  return out.replace(/\n+$/, "");
}

// What a template can go wrong in, checked on save.
//
// The editor shows raw {{tokens}}, so a slipped brace or a typo'd name is
// easy to make and invisible afterwards: the message just sends with
// "{{custmer_name}}" in it, or with a stray "{{" hanging off the end. The
// full fix is an editor that never shows braces at all; this is the cheap
// one — refuse to save and say exactly which token is wrong.
const KNOWN = new Set(PLACEHOLDERS.map(([t]) => t.slice(2, -2)));

export function findBadTokens(body) {
  const problems = [];
  const text = String(body || "");

  // A name in well-formed braces that we do not know how to fill.
  for (const m of text.matchAll(/\{\{\s*([^{}]*?)\s*\}\}/g)) {
    const name = m[1];
    if (!KNOWN.has(name)) {
      problems.push(
        name.trim() === ""
          ? t("There is an empty {{ }} with nothing in it.")
          : t("“{token}” isn’t one of the details we can fill in.", { token: `{{${name}}}` }),
      );
    }
  }

  // Braces that never close, or close without opening. Strip the valid
  // pairs first so only the broken ones are left to count.
  const rest = text.replace(/\{\{\s*[^{}]*?\s*\}\}/g, "");
  if (rest.includes("{{") || /(^|[^{])\{[^{]/.test(rest)) {
    problems.push("There is a “{{” that never closes with a “}}”.");
  }
  if (rest.includes("}}") || /[^}]\}([^}]|$)/.test(rest)) {
    problems.push("There is a “}}” with no “{{” before it.");
  }

  return [...new Set(problems)];
}

export const DEFAULT_TEMPLATES = [
  {
    key: "on_my_way",
    label: "On my way",
    sort_order: 0,
    body: "Hi {{customer_name}}, this is {{business_name}} — I'm on my way and should be with you shortly.",
  },
  {
    key: "running_late",
    label: "Running late",
    sort_order: 1,
    body: "Hi {{customer_name}}, running about 15 minutes behind on my way to you. Sorry for the wait — see you at {{address}} shortly.",
  },
  {
    key: "confirm_tomorrow",
    label: "Confirm tomorrow",
    sort_order: 2,
    body: "Hi {{customer_name}}, confirming your detail on {{date}} at {{time}}. Reply here if anything's changed.",
  },
  {
    key: "job_done",
    label: "Job finished",
    sort_order: 3,
    body: "All finished, {{customer_name}} — thanks for choosing {{business_name}}. Total is {{total}}.",
  },
  {
    key: "arrival_access",
    label: "Ask about access",
    sort_order: 4,
    body: "Hi {{customer_name}}, quick check before {{date}} — will I have access to water and an outlet at {{address}}?",
  },
];

// Substitute placeholders from a booking. Anything unknown is left as-is so
// a typo is visible rather than silently blanked.
export function fillTemplate(body, {
  booking, business, timeLabel, dateLabel, address, total, service, vehicle, bookingLink,
}) {
  const map = {
    "{{customer_name}}": String(booking?.customer_name || "").split(" ")[0] || "there",
    "{{business_name}}": business?.name ?? "",
    "{{date}}": dateLabel ?? "",
    "{{time}}": timeLabel ?? "",
    "{{address}}": address ?? "",
    "{{total}}": total ?? "",
    // THE FOUR ADDED 2026-09-11. Each falls back to a word rather than to an
    // empty string: a text reading "See you for your on Thursday" is the
    // failure a detailer only finds out about from the customer.
    "{{service}}": service || "your detail",
    "{{vehicle}}": vehicle || "your car",
    "{{business_phone}}": business?.contact_phone ?? business?.phone ?? "",
    "{{booking_link}}": bookingLink ?? "",
  };
  return Object.entries(map).reduce((s, [k, v]) => s.split(k).join(v), String(body || ""));
}
