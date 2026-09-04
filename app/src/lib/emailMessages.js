// The detailer's own words on each email, and the prewritten ones they can
// start from.
//
// WHAT THIS IS, AND WHAT IT DELIBERATELY IS NOT. The owner asked for "email
// customizability", then for a block editor, then scrapped it a message later:
// *"scrap the custom email editor thing / make it a lot more simple."* This is
// the simple version, and it is also what five of the six products in the
// trade sweep do (`docs/email-research-2026-09-03.md`): **the design is the
// product's, the words are the business's.**
//
// So there is no layout control, no colour picker, no block reordering — one
// optional paragraph per email, rendered in its own panel so it reads as an
// aside from the business rather than another sentence from us.
//
// **THE MONEY IS NOT REACHABLE FROM HERE AND NEVER WILL BE.** The itemisation
// and the total are drawn by the edge function from the booking. Zenbooker —
// the one product of the six that DOES give a full visual editor — still
// renders its invoice lines as a single variable the editor cannot open, which
// is the same line drawn independently by somebody shipping the feature.
// CLAUDE.md: a number printed is not a number charged.
//
// NO PLACEHOLDERS, AND THAT IS THE POINT OF THE SHAPE. `message_templates`
// (the SMS ones) carry `{{customer_name}}` tokens because a text is the whole
// message and has to be personalised. These paragraphs sit inside an email
// that already greets the customer by name, states their date, their vehicle
// and their address — a second "Hi {{customer_name}}" is the owner's own
// never-default (copy that explains what the screen already said). Keeping
// tokens out means there is nothing to typo, nothing to validate, and no
// `findBadTokens` equivalent to write.

/** Every email a detailer can attach their own words to, in the order they meet them. */
export const MESSAGE_KINDS = [
  {
    key: "confirmation",
    label: "Booking confirmed",
    when: "The moment a customer books.",
    presets: [
      "Please have the car somewhere we can reach all four sides, and clear anything valuable out of the cabin before we arrive.",
      "We'll text you when we're on the way. If anything changes, just reply to this email.",
    ],
  },
  {
    key: "request_received",
    label: "Request received",
    when: "When a customer asks for a time and you haven't answered yet.",
    presets: [
      "We usually answer the same day. Your time is held until we do.",
      "If you need it sooner than that, give us a call and we'll see what we can move.",
    ],
  },
  {
    key: "quote",
    label: "Quote",
    when: "When you send a price back.",
    presets: [
      "This price holds for seven days. If the car is in better shape than the photos suggested, we'll charge less, not more.",
    ],
  },
  {
    key: "accepted",
    label: "Request accepted",
    when: "When you say yes to a request.",
    presets: ["Looking forward to it. We'll be in touch the day before."],
  },
  {
    key: "declined",
    label: "Request declined",
    when: "When you can't take one.",
    presets: ["If you can be flexible on the day, message us — we often have cancellations."],
  },
  {
    key: "reminder",
    label: "Appointment reminder",
    when: "Before the job. Timing is set in Booking rules.",
    presets: [
      "Please leave the car unlocked and move it out of the garage if you can.",
      "We'll need access to a tap and an outlet. If that's a problem, let us know and we'll bring our own.",
    ],
  },
  {
    key: "reminder_2",
    label: "Second reminder",
    when: "Only if you've switched the second one on.",
    presets: ["See you shortly — we're on schedule."],
  },
  {
    key: "rescheduled",
    label: "Rescheduled",
    when: "When a booking moves.",
    presets: ["Sorry for the change. Everything else about the job stays the same."],
  },
  {
    key: "cancelled",
    label: "Cancelled",
    when: "When a booking is called off.",
    presets: ["No hard feelings — book again any time and we'll fit you in."],
  },
  {
    key: "receipt",
    label: "Receipt",
    when: "After you record payment.",
    presets: ["Thanks for your business. Keep this for your records."],
  },
  {
    key: "invoice",
    label: "Invoice",
    when: "When there's still something owed.",
    presets: ["Payment can be cash, card or Zelle — whatever is easiest."],
  },
  {
    key: "followup",
    label: "Thank-you and review request",
    when: "After the job is paid.",
    presets: [
      "If anything isn't right, tell us first — we'd rather fix it than read about it.",
      "Reviews genuinely help a small business like ours. It takes about a minute.",
    ],
  },
];

/** A sane cap. Long enough for a real paragraph, short enough to stay an aside. */
export const MESSAGE_MAX = 400;

/**
 * Keep only known keys with real content, so a renamed email kind cannot leave
 * an orphan paragraph sitting in the column forever.
 */
export function cleanMessages(messages) {
  const known = new Set(MESSAGE_KINDS.map((k) => k.key));
  const out = {};
  for (const [k, v] of Object.entries(messages || {})) {
    const body = String(v ?? "").trim();
    if (known.has(k) && body) out[k] = body.slice(0, MESSAGE_MAX);
  }
  return out;
}
