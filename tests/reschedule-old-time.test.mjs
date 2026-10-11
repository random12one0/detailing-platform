// THE RESCHEDULE EMAIL SAYS WHICH TIME IS THE OLD ONE, IN WORDS, IN BOTH
// LANGUAGES — and the words survive the conversion to plain text.
//
// Run: node tests/reschedule-old-time.test.mjs   (credential-free, no dev server)
//
// ---------------------------------------------------------------------------
// WHAT WENT WRONG, AND WHY A TEST EXISTS FOR ONE SENTENCE
// ---------------------------------------------------------------------------
// ROADMAP 3.4, FAULT 1, found 2026-09-24 by rendering all sixteen templates in
// both languages and READING them. The reschedule email shows the old time and
// the new time one under the other, and until that day the only thing marking
// which was which was:
//
//   <span style="…; text-decoration:line-through;">Saturday, September 12 …</span>
//
// `htmlToText` drops `text-decoration`, because that is what converting to text
// does. So the plain-text alternative — which every email carries, which a
// plain-text client shows, which a styles-stripping client falls back to, and
// which is closest to what a screen reader announces — read:
//
//   Hi Dana, your booking with Ridgeline Auto Detail has been moved.
//   Saturday, September 12, 2026 at 8:00 AM
//   Thursday, September 17, 2026
//   10:00 AM – 1:30 PM
//
// **Two datetimes, and not one word saying which was the old one.** This is the
// line a customer reads to check they are not about to turn up on the wrong
// day. It was identical in English and Spanish, so reading the English alone
// would have caught it; nobody had read either.
//
// **THE CLASS OF FAULT, which is why this check is worth its forty lines:**
// *meaning carried entirely by a visual treatment survives in exactly one of
// the two halves the product sends.* Nothing in the repo asked whether the
// text half still MEANS anything — `render-emails.mjs` asserts every email HAS
// a text half and that it is longer than 40 characters, which this defect
// passed comfortably.
//
// **AND IT ASKS ABOUT SPANISH SEPARATELY, ON PURPOSE.** `T()` is
// `(cat && cat[english]) || english` — a missing key falls back to the English
// string and returns successfully, with no error anywhere. An English label
// added without its Spanish key would therefore "pass" any check that only
// looked for the label. § 2 fails unless the SPANISH label is present and the
// English one is absent.

import { brandFrom, htmlToText } from "../supabase/functions/_shared/emailKit.ts";
import { rescheduleEmail, requestDecisionEmail } from "../supabase/functions/_shared/emailTemplates.ts";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const brand = {
  ...brandFrom({
    brandName: "Ridgeline Auto Detail",
    contactPhone: "(303) 555-0142",
    siteUrl: "https://example.com/book/demo-detail",
    logoUrl: null,
  }, "#38E08B"),
  contactEmail: "hello@ridgeline.example",
};

const bookingFor = (lang) => ({
  id: "7f3ab210-55c1-4e0a-9d2e-31b6c4a90e77",
  lang,
  customerName: "Dana Ortiz",
  customerAddress: "1420 Larimer St, Denver, CO 80202",
  dateStr: "2026-09-17",
  startTime: "10:00",
  endTime: "13:30",
  comesToYou: true,
  vehicleSizeLabel: "Mid-size SUV",
  vehicleModel: "2021 Subaru Outback",
  receiptUrl: "https://example.com/booking/7f3ab210",
});

const OLD_DATE = "2026-09-12", OLD_TIME = "08:00";
const render = (lang) => {
  const m = rescheduleEmail(brand, bookingFor(lang), OLD_DATE, OLD_TIME, false);
  return { ...m, text: m.text ?? htmlToText(m.html) };
};

// ═══════════════════════════════════════════════════════════════════════════
// 1 · ENGLISH — the plain-text half names the old time as old
// ═══════════════════════════════════════════════════════════════════════════
console.log("1. English: the text half says which one is the old time");

const en = render("en");
check("1a the old date and the new date are BOTH in the text half",
  en.text.includes("September 12") && en.text.includes("September 17"),
  "if one is missing this check is measuring the wrong template");
// 99.2a (2026-10-11) dropped the year and whole-hour ":00" from email dates;
// these patterns, and the canary's in § 4, were updated to that shape in 99.2b.
check("1b the old time is labelled in words, not by styling",
  /Was\s+Saturday, September 12 at 8 AM/.test(en.text),
  `the line reads: ${JSON.stringify((en.text.match(/.*September 12.*/) ?? [""])[0])}`);
// The strikethrough is belt and braces, not the mechanism. If somebody removes
// it as redundant the HTML gets worse for no gain, so it is pinned.
check("1c the strikethrough is STILL in the html as well",
  /text-decoration:\s*line-through/.test(en.html),
  "the word is the mechanism now; the styling is still worth having");

// ═══════════════════════════════════════════════════════════════════════════
// 2 · SPANISH — and a silent fallback to English is a FAILURE
// ═══════════════════════════════════════════════════════════════════════════
console.log("\n2. Spanish: the label is translated, and English is absent");

const es = render("es");
check("2a the Spanish label is present", /Antes:\s*sábado, 12 de septiembre a las 8 AM/.test(es.text),
  `the line reads: ${JSON.stringify((es.text.match(/.*septiembre a las.*/) ?? [""])[0])}`);
check("2b the ENGLISH label is absent — a missing es.ts key falls back silently",
  !/\bWas\s+sábado/.test(es.text) && !/\bWas\s+Saturday/.test(es.text),
  "T() returns the English key on a miss and throws nothing, so this is the only thing that catches it");
check("2c the Spanish render is not just the English one",
  es.text !== en.text);

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE SHARED KEY WAS NOT REPURPOSED
// ═══════════════════════════════════════════════════════════════════════════
// `"{date} at {time}"` is used by the quote template too. The fix deliberately
// added a NEW key rather than prefixing that one, and this is what would catch
// somebody "tidying" the two into one.
console.log("\n3. the quote template's shared key still says only the date and time");

const quote = requestDecisionEmail(brand, { ...bookingFor("es"), quotedAmount: 395 }, "quote");
const quoteText = quote.text ?? htmlToText(quote.html);
check("3a the quote email does NOT carry the reschedule's label",
  !/Antes:/.test(quoteText) && !/\bWas\s/.test(quoteText),
  "if this fires, `{date} at {time}` was edited instead of a new key being added");

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE CANARY — this check must be able to fail
// ═══════════════════════════════════════════════════════════════════════════
// The defect put back, from the OUTSIDE: the label stripped out of the rendered
// text, which is exactly what the pre-fix template produced. If § 1b's question
// still passes on that string, § 1b is not asking it.
console.log("\n4. the canary — the pre-fix output must FAIL the check above");

const preFix = en.text.replace(/Was\s+(Saturday, September 12)/, "$1");
const canaryCaught = !/Was\s+Saturday, September 12 at 8 AM/.test(preFix)
  && preFix.includes("September 12") && preFix.includes("September 17");
check("4a with the label removed, the old time is indistinguishable and 1b's test fails",
  canaryCaught,
  "the canary did not reproduce the defect, so every green line above is void");

console.log(`\n   old ${OLD_DATE} ${OLD_TIME} -> new 2026-09-17 10:00 · `
  + `en ${en.text.length} chars · es ${es.text.length} chars`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
