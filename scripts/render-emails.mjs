// Render every email in the product to a file you can open and LOOK AT.
//
// WHY THIS EXISTS. Until now nothing in this repo drew an email for a human.
// The only way anyone had ever seen one was to trigger a real send, and the
// cost of that showed up in roadmap 2.12: **eleven** headlines across the
// product were sitting at 3.01–3.76:1 on a 4.5:1 floor, on all fourteen
// colours, and `email-brand.test.mjs` passed the whole time because it pinned
// the colour ENGINE and never looked at what the templates DID with the
// answer. *A test can verify the arithmetic and still be blind to the
// drawing.* This is the thing that looks at the drawing.
//
// Roadmap 2.18 asks for the emails rebuilt so they "look the best", which is
// not a claim anybody can check without this. `docs/email-research-2026-09-03.md`
// names it as the missing instrument; it is the same gap `sweep-widths.mjs`
// filled for the dashboard.
//
//   node scripts/render-emails.mjs                  # one accent, all templates
//   node scripts/render-emails.mjs --accent=#c2410c # any hex, including ugly ones
//   node scripts/render-emails.mjs --out=some/dir
//
// Then open `email-preview/index.html`.
//
// NO NEW DEPENDENCY, AND THAT IS THE POINT OF THE .ts IMPORT BELOW. Node 24
// strips the types itself, so this reads the SAME file the edge function
// runs rather than a copy or a bundle. 2.12 used `esbuild --bundle` for the
// one-off; a permanent script that needs a build step is a script that rots.
// `emailTemplates.ts` is dependency-free on purpose (its own header says so),
// which is what makes this possible at all.
//
// THE SELF-CHECK IS THE OTHER HALF, and it encodes 2.12's second lesson.
// That session's first render used MADE-UP field names for the brand object,
// interpolated `undefined` into the band, and produced a white header that
// looked like a much worse bug than the real one. Nothing warns you when a
// template literal interpolates undefined. So this exits 1 if any rendered
// file contains `undefined`, `NaN`, `[object Object]` or an empty `href=""`
// — the four ways a fixture silently disagrees with an interface.

import { mkdir, writeFile } from "node:fs/promises";
import { emailBrandColors } from "../supabase/functions/_shared/brandColor.js";
import * as T from "../supabase/functions/_shared/emailTemplates.ts";

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const ACCENT = arg("accent", "#0d9edf");
const OUT = arg("out", "email-preview");

// The brand object, built the way `_shared/email.ts` builds it in production:
// ONE tenant colour in, three corrected values out, each named for the ground
// it lands on. Anything else here is a field of `TenantBrand` — if one is
// renamed, the self-check below catches it as `undefined` in the output.
const c = emailBrandColors(ACCENT);
const brand = {
  businessId: "00000000-0000-0000-0000-000000000000",
  slug: "demo-detail",
  brandName: "Ridgeline Auto Detail",
  contactEmail: "hello@ridgelinedetail.example",
  contactPhone: "(303) 555-0142",
  dropoffAddress: "2200 Blake St, Denver, CO 80205",
  siteUrl: "https://detailingplatform.com/book/demo-detail",
  primaryColor: c.band,
  headerInk: c.bandInk,
  accentColor: c.onPaper,
  googleReviewUrl: "https://g.page/r/example/review",
  yelpReviewUrl: "https://www.yelp.com/biz/example",
  paymentMethodsLine: null,
};

// One booking, filled in every field a template can reach — including the
// three that only appear on a job with a travel charge, a promo and an
// adjustment, because those are the lines the money table has to reconcile
// and an empty fixture renders a table that always adds up.
//
// THE NUMBERS ARE INTERNALLY CONSISTENT AND THAT IS LOAD-BEARING, not tidiness:
//   services + add-ons + travel + adjustments = subtotalBase  285+75+25+20 = 405
//   subtotalBase - site sale (none here)      = bookings.subtotal       = 405
//   bookings.subtotal - promo                 = total_price   405 - 40   = 365
//   total_price + tip                         = final_amount  365 + 30   = 395
// NO SITE SALE HERE ON PURPOSE, so subtotalBase and `bookings.subtotal` are the
// same number and the promo is the only hole on show. Give the fixture a site
// sale and the gap grows by that too — they are two holes, not one.
// A fixture whose parts do not add up cannot tell you whether a template's
// money table adds up either — it just makes every check unreadable. The
// first draft of this file invented figures and produced a false alarm on the
// invoice and a MISSED one, which is 2.12's "check the harness against the
// interface" wearing arithmetic instead of field names.
const booking = {
  id: "7f3ab210-55c1-4e0a-9d2e-31b6c4a90e77",
  customerName: "Dana Ortiz",
  customerPhone: "(720) 555-0188",
  customerEmail: "dana.ortiz@example.com",
  customerAddress: "1420 Larimer St, Denver, CO 80202",
  dateStr: "2026-09-17",
  startTime: "10:00",
  endTime: "13:30",
  serviceType: "mobile",
  vehicleSize: "Mid-size SUV",
  vehicleModel: "2021 Subaru Outback",
  customerNotes: "Dog hair in the back seats — there's a tap on the side of the house.",
  serviceNames: ["Full Interior + Exterior Detail"],
  addOnNames: ["Pet hair removal", "Engine bay clean"],
  travelFee: 25,
  travelZone: "Outer ring",
  adjustments: [{ label: "Heavy soiling surcharge", amount: 20 }],
  subtotal: 405,
  siteDiscount: 0,
  siteDiscountPercent: 0,
  promoCode: "FALL10",
  promoDiscount: 40,
  total: 365,
  receiptUrl: "https://detailingplatform.com/booking/7f3ab210-55c1-4e0a-9d2e-31b6c4a90e77",
};

// BUILT THE WAY `send-invoice/index.ts` BUILDS IT, deliberately, including the
// parts that are wrong — this file's job is to show what a customer receives,
// not what we meant to send. Its loops push services, add-ons, travel and
// `price_adjustments` as `charge` rows, then the finalize line items; the
// promo is NOT among them (see the reconciliation check at the bottom).
// Discounts are stored NEGATIVE — `FinalizeModal.jsx` normalises the sign on
// the way in with `-Math.abs(...)`, and it is the only writer of that table.
const invoiceRows = [
  { label: "Full Interior + Exterior Detail", qty: 1, lineTotal: 285, kind: "charge" },
  { label: "Add-on: Pet hair removal", qty: 1, lineTotal: 35, kind: "charge" },
  { label: "Add-on: Engine bay clean", qty: 1, lineTotal: 40, kind: "charge" },
  { label: "Travel — Outer ring", qty: 1, lineTotal: 25, kind: "charge" },
  { label: "Heavy soiling surcharge", qty: 1, lineTotal: 20, kind: "charge" },
  { label: "Tip", qty: 1, lineTotal: 30, kind: "tip" },
];
const invoiceTotals = {
  chargesSubtotal: invoiceRows.filter((r) => r.kind === "charge").reduce((s, r) => s + r.lineTotal, 0),
  discountsTotal: invoiceRows.filter((r) => r.kind === "discount").reduce((s, r) => s + r.lineTotal, 0),
  tipTotal: invoiceRows.filter((r) => r.kind === "tip").reduce((s, r) => s + r.lineTotal, 0),
  // `final_amount`, which is what was actually collected: total_price + tip.
  totalPaid: booking.total + 30,
};

// EVERY KIND THE PRODUCT SENDS, including the branches. `isRequest`,
// `forOwner` and the three request decisions are separate rows on purpose —
// each is an email somebody actually receives, and 2.12's worst two defects
// were both on branches nobody had rendered.
const EMAILS = [
  ["customer-confirmation", "Customer · booking confirmed", () => T.customerConfirmationEmail(brand, booking, false)],
  ["customer-request-received", "Customer · request received (request mode)", () => T.customerConfirmationEmail(brand, booking, true)],
  ["customer-reminder", "Customer · appointment reminder", () => T.customerReminderEmail(brand, booking)],
  ["customer-reschedule", "Customer · rescheduled", () => T.rescheduleEmail(brand, booking, "2026-09-12", "08:00", false)],
  ["customer-cancellation", "Customer · cancelled", () => T.cancellationEmail(brand, booking, false)],
  ["customer-quote", "Customer · quote offered", () => T.requestDecisionEmail(brand, booking, "quote", { manageUrl: booking.receiptUrl, quotedAmount: 345, quotedNote: "The pet hair job on this one is bigger than the photos suggested." })],
  ["customer-accepted", "Customer · request accepted", () => T.requestDecisionEmail(brand, booking, "accepted", { manageUrl: booking.receiptUrl })],
  ["customer-declined", "Customer · request declined", () => T.requestDecisionEmail(brand, booking, "declined", { manageUrl: booking.receiptUrl })],
  ["customer-invoice", "Customer · invoice / receipt", () => T.invoiceEmail(brand, booking, invoiceRows, invoiceTotals, "paid", "Paid by card on the day.")],
  ["customer-followup", "Customer · thank-you and review request", () => T.followupEmail(brand, "Dana")],
  ["owner-new-booking", "Owner · new booking", () => T.ownerNewBookingEmail(brand, booking, false)],
  ["owner-new-request", "Owner · new request waiting", () => T.ownerNewBookingEmail(brand, booking, true)],
  ["owner-reschedule", "Owner · a booking moved", () => T.rescheduleEmail(brand, booking, "2026-09-12", "08:00", true)],
  ["owner-cancellation", "Owner · a booking cancelled", () => T.cancellationEmail(brand, booking, true)],
  ["owner-stale-request", "Owner · nobody answered a request", () => T.staleRequestEmail(brand, booking, 19)],
  ["staff-invite", "Staff · team invite", () => T.inviteEmail(brand, { role: "staff", link: "https://detailingplatform.com/invite/abc123", expiresAt: "2026-09-10T00:00:00Z" })],
];

// The four ways a fixture silently disagrees with an interface. `href=""` is
// in here because an empty link renders as a perfectly normal-looking button
// that goes nowhere.
const ROT = [
  ["undefined", /undefined/],
  ["NaN", /NaN/],
  ["[object Object]", /\[object Object\]/],
  ['href=""', /href=""/],
];

await mkdir(OUT, { recursive: true });
const cards = [];
let bad = 0;

for (const [file, label, render] of EMAILS) {
  const { subject, html } = render();
  for (const [name, re] of ROT) {
    if (re.test(html) || re.test(subject)) {
      console.error(`  FAIL  ${label}: rendered "${name}" — the fixture disagrees with the template's interface`);
      bad++;
    }
  }
  await writeFile(`${OUT}/${file}.html`, html);
  cards.push(
    `<li><a href="${file}.html">${label}</a><div class="subj">${subject.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div></li>`,
  );
  console.log(`  ${label}\n    ${subject}`);
}

// The index is deliberately plain: it is scaffolding for looking at the
// emails, not a surface the design system governs.
await writeFile(
  `${OUT}/index.html`,
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Email preview — ${ACCENT}</title>
<style>body{font:15px/1.6 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px}
h1{font-size:20px}ul{list-style:none;padding:0}li{padding:12px 0;border-bottom:1px solid #ddd}
a{font-weight:600}.subj{color:#555;font-size:13px;margin-top:2px}code{background:#eee;padding:2px 5px}</style>
</head><body><h1>Every email this product sends</h1>
<p>Tenant accent <code>${ACCENT}</code> &rarr; band <code>${c.band}</code>, band ink <code>${c.bandInk}</code>,
words on paper <code>${c.onPaper}</code>. Re-run with <code>--accent=#hex</code> to check another tenant.</p>
<ul>${cards.join("\n")}</ul></body></html>`,
);

// THE INVOICE HAS TO ADD UP, AND TODAY IT DOES NOT.
//
// CLAUDE.md's rule is that a number PRINTED is not a number CHARGED, and that
// an exported number is the same risk one step later. An INVOICE is the same
// risk again: it goes to the person who paid, and they are the one party who
// will check it against their card statement.
//
// `send-invoice` builds the charge rows from services, add-ons, travel and
// `price_adjustments`, which sum to `subtotalBase` — BEFORE the site sale and
// BEFORE the promo. It takes `totalPaid` from `bookings.final_amount`, which is
// `total_price` (PAST both, and rounded) plus the finalize extras. **Neither
// discount, and neither the rounding, is drawn anywhere on the invoice**, so
// the printed column misses the printed total by
// `siteDiscount + promoDiscount + rounding`.
//
// `bookings.subtotal` is `subtotalAfterSite` (create-booking writes
// `quote.subtotalAfterSite`), so it is NOT what the rows add up to. That is the
// detail that makes this look like one bug and be three, and it is why the
// fixture below runs with no site sale: one hole at a time is readable.
//
// It is `travel_fee`'s twin — the bottom line is right and the itemisation
// above it does not reach it, which is the wording of `send-invoice`'s own
// comment about the bug it fixed for travel, one screen further up the file.
//
// This is an ASSERTION rather than a note in a document because a note is
// what the travel fee had. It fails today, on purpose, and roadmap 2.18's
// rebuild is what makes it pass.
const closes = invoiceTotals.chargesSubtotal + invoiceTotals.discountsTotal
  + invoiceTotals.tipTotal;
if (Math.abs(closes - invoiceTotals.totalPaid) > 0.005) {
  const gap = closes - invoiceTotals.totalPaid;
  console.error(
    `\n  FAIL  the invoice's own column does not reach its own total.`
    + `\n        subtotal ${invoiceTotals.chargesSubtotal} + discounts ${invoiceTotals.discountsTotal}`
    + ` + tip ${invoiceTotals.tipTotal} = ${closes}, printed total ${invoiceTotals.totalPaid}`
    + `\n        off by ${gap} — the promo discount (${booking.promoDiscount}) is drawn on the`
    + ` confirmation and is missing from the invoice.`
    + `\n        The site sale and the rounding are the same hole and are NOT`
    + ` exercised here: this fixture runs no sale, so fixing the promo alone`
    + `\n        will make this pass while leaving them broken. Fix all three in`
    + ` send-invoice, which survives the rebuild.`,
  );
  bad++;
}

console.log(`\n${EMAILS.length} emails → ${OUT}/index.html  (accent ${ACCENT})`);
if (bad) {
  console.error(`${bad} rendering problem(s) — fix the fixture or the template before believing what you see.`);
  process.exit(1);
}
