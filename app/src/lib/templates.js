// Prefilled customer texts. Seeded per business on first open, then fully
// editable. Placeholders are filled from the booking when the owner taps
// Text on a job.

export const PLACEHOLDERS = [
  ["{{customer_name}}", "the customer's first name"],
  ["{{business_name}}", "your business name"],
  ["{{date}}", "the job's date"],
  ["{{time}}", "the job's start time"],
  ["{{address}}", "where the job happens"],
  ["{{total}}", "the job's total"],
];

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
          ? "There is an empty {{ }} with nothing in it."
          : `“{{${name}}}” isn’t one of the details we can fill in.`,
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
export function fillTemplate(body, { booking, business, timeLabel, dateLabel, address, total }) {
  const map = {
    "{{customer_name}}": String(booking?.customer_name || "").split(" ")[0] || "there",
    "{{business_name}}": business?.name ?? "",
    "{{date}}": dateLabel ?? "",
    "{{time}}": timeLabel ?? "",
    "{{address}}": address ?? "",
    "{{total}}": total ?? "",
  };
  return Object.entries(map).reduce((s, [k, v]) => s.split(k).join(v), String(body || ""));
}
