// ROADMAP 3.4 — the sale line in an email states a percentage only when the
// figure beside it IS that percentage, to the cent.
//
// The engine rounds the sale to whole dollars, so every rendered confirmation
// read "5% sale −$20" over a $405 job (5% is $20.25). The booking page already
// keeps this rule (scripts/discount-label.mjs, its `honest` and `form` cases);
// the email did not. Both halves are asserted, because a check that only asked
// "is the stated percentage true" is passed by never stating one.
//
// Credential-free.   node --test tests/email-sale-label.test.mjs

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
// gross = subtotal + siteDiscount: the amount the sale was taken from.
const email = (gross, siteDiscount, lang) => customerConfirmationEmail(brand, {
  id: "b1", customerName: "Dana Ortiz", customerPhone: "555", customerEmail: "d@ridgeline.test",
  customerAddress: "1 Test Way", dateStr: "2026-09-17", startTime: "09:00", endTime: "12:00",
  serviceType: "mobile", vehicleSize: "midsize", vehicleModel: null, customerNotes: null,
  serviceNames: ["Full detail"], addOnNames: [], travelFee: 0, travelZone: null, adjustments: [],
  subtotal: gross - siteDiscount, siteDiscount, siteDiscountPercent: 5, promoCode: null, promoDiscount: 0,
  total: gross - siteDiscount, receiptUrl: "https://detailingplatform.com/booking/b1", lang,
}, false).text;

test("honest: 5% of $405 is $20.25, so a $20 line does not say 5%", () => {
  assert.doesNotMatch(email(405, 20, "en"), /5% sale/);
  assert.match(email(405, 20, "en"), /Sale \| -\$20/);
  assert.match(email(405, 20, "es"), /Oferta \| -\$20/);
});

test("form: 5% of $400 is exactly $20, so it still says 5%", () => {
  assert.match(email(400, 20, "en"), /5% sale \| -\$20/);
  assert.match(email(400, 20, "es"), /5% de oferta \| -\$20/);
});
