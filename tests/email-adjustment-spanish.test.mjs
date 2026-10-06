// ROADMAP 3.4 — the extra-car and plan lines in a Spanish email are Spanish.
//
// `pricing.ts` builds "2nd vehicle · …" and "<plan> · plan rate" in English and
// hands over `parts` (2.1c). The booking page spelled them from `parts`; the
// emails printed the English label, so a Spanish confirmation said "2nd vehicle".
// Found 2026-10-06 reading every Spanish render. This runs the real template.
//
// Credential-free.   node --test tests/email-adjustment-spanish.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { customerConfirmationEmail } from "../supabase/functions/_shared/emailTemplates.ts";

const brand = {
  brandName: "Ridgeline Auto Detail", contactEmail: "hello@ridgeline.test", contactPhone: "(562) 555-0142",
  siteUrl: "https://detailingplatform.com/book/ridgeline", logoUrl: null,
  accent: "#38E08B", accentFill: "#38E08B", accentInk: "#04150C",
  accentDark: "#38E08B", accentFillDark: "#38E08B", accentInkDark: "#04150C",
  dropoffAddress: "22 Mill Road", googleReviewUrl: null, yelpReviewUrl: null, messages: {},
};
// The three kinds of line, shaped exactly as pricing.ts stores them.
const adjustments = [
  { label: "2nd vehicle · Large / SUV · 2021 Ford F-150", amount: 280, source: "vehicle",
    parts: { of: "vehicle", ordinal: 2, size: "Large / SUV", model: "2021 Ford F-150" } },
  { label: "Bi-weekly maintenance · plan rate", amount: -60, source: "plan",
    parts: { of: "plan", planName: "Bi-weekly maintenance", benefit: "plan_rate" } },
  { label: "Member rate · 10% off", amount: -20, source: "plan",
    parts: { of: "plan", planName: "Member rate", benefit: "percent_off", percent: 10 } },
  { label: "Heavy soiling surcharge", amount: 20, source: "rule" }, // the detailer's own words: no parts
];
const booking = {
  id: "b1", customerName: "Dana Ortiz", customerPhone: "555", customerEmail: "d@ridgeline.test",
  customerAddress: "1 Test Way", dateStr: "2026-09-17", startTime: "09:00", endTime: "12:00",
  serviceType: "mobile", vehicleSize: "midsize", vehicleModel: null, customerNotes: null,
  serviceNames: ["Full detail"], addOnNames: [], travelFee: 0, travelZone: null, adjustments,
  subtotal: 440, siteDiscount: 0, siteDiscountPercent: 0, promoCode: null, promoDiscount: 0,
  total: 440, receiptUrl: "https://detailingplatform.com/booking/b1", lang: "es",
};
const text = (lang) => customerConfirmationEmail(brand, { ...booking, lang }, false).text;

test("Spanish: our words are Spanish, the detailer's and customer's are untouched", () => {
  const es = text("es");
  assert.match(es, /2\.º vehículo · Large \/ SUV · 2021 Ford F-150/);
  assert.match(es, /Bi-weekly maintenance · precio del plan/);
  assert.match(es, /Member rate · 10% de descuento/);
  assert.match(es, /Heavy soiling surcharge/, "a rule line is the detailer's text, printed as written");
  assert.doesNotMatch(es, /2nd vehicle|plan rate|% off/);
});

test("English: the stored label, byte for byte", () => {
  const en = text("en");
  for (const a of adjustments) assert.ok(en.includes(a.label), a.label);
});

test("a stored line with no parts (booked before 2.1c) still prints its label", () => {
  const old = customerConfirmationEmail(brand, {
    ...booking, adjustments: [{ label: "2nd vehicle · Small", amount: 240 }],
  }, false).text;
  assert.match(old, /2nd vehicle · Small/);
});
