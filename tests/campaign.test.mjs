// THE ONE COMMERCIAL EMAIL THIS PRODUCT SENDS — roadmap 2.19.
//
// Every other template in `_shared/emailTemplates.ts` is transactional: the
// customer asked for it by booking something, and it is exempt from the
// opt-out requirement. This one is not. A detailer picking fourteen names off
// their own Clients list and typing *"we haven't seen you in a while"* is
// sending a commercial message, and CAN-SPAM decides that by the message's
// PRIMARY PURPOSE — never by whether a person or a schedule pressed send.
//
// SO THE THINGS PINNED HERE ARE NOT PREFERENCES. A postal address and a
// working opt-out are what makes this email legal to send at all, and both are
// exactly the kind of thing that reads as present in the source and turns out
// to be absent on the page — which is the failure this repo has recorded four
// times in other places (the invoice that missed its total by the promo, the
// travel fee that was drawn and never charged, the check whose regex matched
// nothing, the fixture that could not reach the defect).
//
// AND THE SECOND HALF IS THE INJECTION BOUNDARY. This is the only template
// whose body is TYPED BY A HUMAN and then sent to somebody else, so the escape
// order — escape first, THEN turn newlines into `<br>` — is the difference
// between a paragraph and markup in every copy that goes out.
//
// It imports `_shared/emailTemplates.ts` DIRECTLY: Node 24 strips the types,
// so this pins the same file the edge function runs rather than a copy. Same
// trick `tests/plans.test.mjs` test 6 uses on `_shared/pricing.ts`.
//
// Credential-free, no dev server, no browser.
//
//   node tests/campaign.test.mjs

import { campaignEmail, customerConfirmationEmail } from "../supabase/functions/_shared/emailTemplates.ts";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

const brand = {
  brandName: "Ridgeline Auto Detail",
  contactEmail: "hello@ridgeline.test",
  contactPhone: "(562) 555-0142",
  siteUrl: "https://detailingplatform.com/book/ridgeline",
  logoUrl: null,
  accent: "#38E08B",
  accentFill: "#38E08B",
  accentInk: "#04150C",
  accentDark: "#38E08B",
  accentFillDark: "#38E08B",
  accentInkDark: "#04150C",
  dropoffAddress: "22 Mill Road",
  googleReviewUrl: null,
  yelpReviewUrl: null,
  messages: {},
};

const UNSUB = "https://detailingplatform.com/unsubscribe/9c1f2b64-0000-4000-8000-000000000002";
const ADDRESS = "PO Box 214, Lakewood CA 90713";

const send = (over = {}) => campaignEmail(brand, {
  customerName: "Dana Ortiz",
  subject: "Time to get it looking right again?",
  message: "It's been a few months since we last took care of your car.",
  bookUrl: brand.siteUrl,
  unsubscribeUrl: UNSUB,
  mailingAddress: ADDRESS,
  ...over,
});

// ─── 1. THE TWO THINGS THE LAW ASKS FOR ───────────────────────────────────
{
  const { html, text } = send();
  check("the opt-out link is in the HTML", html.includes(UNSUB), "no unsubscribe href");
  check("the postal address is in the HTML", html.includes(ADDRESS), "no mailing address");
  // A CLIENT THAT SHOWS ONLY THE TEXT HALF IS STILL AN INBOX. `htmlToText`
  // derives it, so nothing here is written twice — but a derivation that drops
  // the footer would leave a reader with no way out and no way to see who sent
  // it, and no other check in this repo looks at the text half's content.
  check("the opt-out link survives into the plain-text half", text.includes(UNSUB), text.slice(-260));
  check("the postal address survives into the plain-text half", text.includes(ADDRESS), text.slice(-260));
}

// ─── 2. AND NO OTHER EMAIL GREW THEM ──────────────────────────────────────
//
// `shell`'s legal footer is optional, so this asserts the option stayed off.
// A transactional email carrying an unsubscribe link is not a cosmetic slip:
// it invites a customer to switch off the confirmations and reminders for a
// booking they have already made, which is the one kind of email they must
// always receive.
{
  const { html } = customerConfirmationEmail(brand, {
    id: "b1", customerName: "Dana Ortiz", customerPhone: "555", customerEmail: "d@example.org",
    customerAddress: "1 Test Way", dateStr: "2026-09-17", startTime: "09:00", endTime: "12:00",
    serviceType: "mobile", vehicleSize: "midsize", vehicleModel: null, customerNotes: null,
    serviceNames: ["Full detail"], addOnNames: [], travelFee: 0, travelZone: null, adjustments: [],
    subtotal: 200, siteDiscount: 0, siteDiscountPercent: 0, promoCode: null, promoDiscount: 0,
    total: 200, receiptUrl: "https://detailingplatform.com/booking/b1",
  }, false);
  check("a booking confirmation carries no opt-out link",
    !/unsubscribe/i.test(html), "a transactional email must never offer one");
  check("a booking confirmation carries no postal address", !html.includes(ADDRESS));
}

// ─── 3. THE DETAILER'S WORDS ARE DATA, NOT MARKUP ─────────────────────────
//
// The body of this email is typed by one person and delivered to fifty. Escape
// first, THEN newlines to `<br>` — the other order is `ownWords`'s own comment,
// and the reason it is a comment is that the wrong order looks identical.
{
  const nasty = "Deal!<script>alert(1)</script> & <b>bold</b>\nsecond line";
  const { html, text } = send({ message: nasty });
  check("a typed <script> never reaches the markup",
    !html.includes("<script>"), "a detailer's message can inject into every copy");
  check("a typed <b> is shown rather than applied", !html.includes("<b>bold</b>"));
  check("the ampersand is escaped", html.includes("&amp;"));
  check("a newline becomes a line break", html.includes("second line") && html.includes("<br>"));
  // AND THE TEXT HALF IS NOT MARKUP, so the escaping is UNDONE there rather
  // than shown. A text/plain part is never parsed as HTML — `<script>` in it
  // is four words and a bracket — but `&amp;` in it is gibberish a human
  // reads. `htmlToText` decodes; this is what says it must keep doing so.
  check("the text half reads as prose, not as entities",
    text.includes("&") && !text.includes("&amp;"), text.slice(0, 200));
}

// ─── 4. THE SUBJECT IS THEIRS, AND IT IS ALSO THE HEADLINE ────────────────
//
// One field doing two jobs is the design (see the template's header): making a
// detailer type the same sentence twice is how a compose form gets abandoned.
// So a change that quietly stops using it for the headline is a change that
// makes them type it twice.
{
  const subject = "Half price interiors this month";
  const { subject: s, html } = send({ subject });
  check("the subject line is the detailer's, verbatim", s === subject, s);
  check("and the same words open the email", html.includes(subject), "the headline is not the subject");
}

// ─── 5. THE GREETING IS OURS ──────────────────────────────────────────────
//
// The one thing a detailer writing to fourteen people cannot do by hand, and
// most of what separates this from a blast.
{
  const { html } = send({ customerName: "Dana Ortiz" });
  check("the customer is greeted by first name", html.includes("Hello Dana,"), "no personal greeting");
  const { html: noName } = send({ customerName: "" });
  check("a customer with no name on file still gets a greeting",
    noName.includes("Hello there,"), "an empty name must not print 'Hello ,'");
}

// ─── 6. AN APOSTROPHE IN A BUSINESS NAME IS NOT AN ESCAPE BUG ─────────────
//
// "Andrew's Auto Detail" is the owner's own business, and it goes through
// `esc` in the masthead and the footer. This is here because a naive fix to
// test 3 (escaping twice) shows up first as `Andrew&amp;#39;s` on the one
// business the owner will look at.
{
  const { html } = campaignEmail({ ...brand, brandName: "Andrew's Auto Detail" }, {
    customerName: "Dana", subject: "Hello", message: "Come back.",
    bookUrl: brand.siteUrl, unsubscribeUrl: UNSUB, mailingAddress: ADDRESS,
  });
  check("an apostrophe is escaped exactly once",
    !html.includes("&amp;#39;") && !html.includes("&amp;amp;"),
    "double-escaped somewhere");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
