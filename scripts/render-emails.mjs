// Render every email the product sends, so a human can LOOK at them.
//
// WHY THIS EXISTS. Until 2026-09-03 nothing in this repo drew an email for a
// person. The only way to see one was to trigger a real send, and the cost
// showed up twice: roadmap 2.12 found **eleven** headlines sitting at
// 3.01–3.76:1 on a 4.5:1 floor across all fourteen colours, and this script's
// own first run found the invoice's column missing its own total by exactly
// the customer's promo code. Both had survived every test in the repo, because
// `email-brand.test.mjs` pinned the colour ENGINE and never looked at what the
// templates DID with the answer. *A test can verify the arithmetic and still be
// blind to the drawing.* This is the thing that looks at the drawing.
//
//   node scripts/render-emails.mjs                  # all twelve, house green
//   node scripts/render-emails.mjs --accent=#DC2626 # any tenant colour
//   node scripts/render-emails.mjs --logo           # with a logo on the masthead
//   node scripts/render-emails.mjs --out=some/dir   # keep two side by side
//
// Then open `email-preview/index.html`.
//
// NO NEW DEPENDENCY, AND THAT IS THE POINT OF THE .ts IMPORTS. Node 24 strips
// the types itself, so this reads the SAME files the edge functions run rather
// than a bundle or a copy. Roadmap 2.12's one-off used `esbuild --bundle`; a
// permanent script that needs a build step is a script that rots.
//
// WHAT IT ASSERTS, beyond drawing:
//   * no `undefined` / `NaN` / `[object Object]` / `href=""` in any output —
//     2.12's first render used made-up field names, interpolated `undefined`
//     into the band and produced a convincing wrong answer;
//   * **every money column reaches its own printed total**;
//   * every text colour clears its floor on every ground it lands on;
//   * no pure `#ffffff` / `#000000` reaches a tenant's colour, because those
//     two values are Apple Mail's dark-mode inversion trigger and Apple Mail
//     is ~60% of all opens;
//   * every email carries a plain-text alternative — HTML-only was a live
//     spam-filter defect until 2026-09-03.

import { mkdir, writeFile } from "node:fs/promises";
import { writeReceipt } from "./receipt.mjs";
import { contrastRatio, emailBrandColors, emailDarkBrandColors } from "../supabase/functions/_shared/brandColor.js";
import { brandFrom, D, htmlToText, L, money } from "../supabase/functions/_shared/emailKit.ts";
import { refundInstruction, refundOwed } from "../supabase/functions/_shared/connect.ts";
import * as T from "../supabase/functions/_shared/emailTemplates.ts";
import { paymentHandles } from "../supabase/functions/_shared/payments.ts";
// ROADMAP 14.19 FOLLOW-UP — the carload fixture's money is COMPUTED by the
// pricing engine instead of typed. Same `.ts`-import idiom as every line
// above, and `pricing.ts` is dependency-free on purpose ("so tests can run it
// under Node", its own header), so this costs no credential, no network and
// no build step. See the fixture for why it had to change.
import { computeQuote } from "../supabase/functions/_shared/pricing.ts";
// ROADMAP 3.4 — the invoice fixture's own labels go through the product's
// lookup. Named `translate` because `T` above is the TEMPLATES namespace.
import { T as translate } from "../supabase/functions/_shared/i18n.ts";
// Roadmap 2.20 stage 2. The platform's own identity, which is a constant
// rather than a database read — see the module's header for why it is still a
// `TenantBrand`.
import { platformBrand } from "../supabase/functions/_shared/platformBrand.ts";

const PLATFORM = "https://detailingplatform.com";

const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const ACCENT = arg("accent", "#38E08B");
// ROADMAP 8.17 STAGE 2A — RENDER THE CUSTOMER'S SET IN SPANISH.
//
// **THE ONLY WAY ANYBODY IS EVER GOING TO LOOK AT THESE.** Nobody who can
// approve this product reads Spanish, and an email cannot be corrected after
// it is sent, so the least this script can do is put every one of them on a
// page beside its English twin. Every assertion below runs on the Spanish
// render too — the money still has to reach its total, the colours still have
// to clear their floors, and `undefined` is still a defect in either language.
const LANG = arg("lang", "en");
const OUT = arg("out", "email-preview");

/* ══ --long : EVERY TENANT-TYPED NAME AT THE CAP — ROADMAP 2.15a ══════════
   The names a detailer types for their business, their services and their
   add-ons land in these emails, and NOTHING HAD EVER RENDERED THEM LONG. The
   fixtures are 19 to 31 characters; the product now permits 60 on all five
   name boxes, so every email here has only ever been drawn against the
   comfortable case.

   This flag is RENDERING ONLY. It makes no assertion and it is not where the
   answer comes from: `bk-bar-clearance.mjs` opens what this writes and
   measures it. That split is deliberate - **this script prints PASS over a
   wrong subtotal by design, because `reconcile()` invents a closing line for
   any gap (`docs/gotchas.md` 81), so its PASS is not evidence of anything and
   must never be cited as any.**

   60 exactly, built from real words with spaces, because these layouts wrap on
   spaces and one unbroken token would wrap differently from anything a person
   would type - a softer test, not a harder one. */
const LONG = process.argv.includes("--long");
const atCap = (words) => {
  let out = words;
  while (out.length < 60) out += " " + words;
  return out.slice(0, 60).trim();
};
const LONG_BIZ = atCap("Ridgeline Auto Detailing and Mobile Valeting Co");
const LONG_SERVICE = atCap("Full interior and exterior ceramic protection detail");
const LONG_ADDON_A = atCap("Pet hair removal and upholstery shampoo treatment");
const LONG_ADDON_B = atCap("Engine bay clean and underbonnet degrease service");
const LONG_PLAN = atCap("Platinum bi-weekly maintenance and interior care");
if (LONG) {
  console.log("--long: every tenant-typed name rendered at the 60-character cap (ROADMAP 2.15a)");
  console.log("        RENDERING ONLY - this script's PASS is not evidence; gotcha 81.");
}

// THE WORST LOGO A DETAILER CAN UPLOAD: dark artwork on a transparent ground,
// which is what a logo made for a white website is. On `--ink-0` it would be
// invisible; the masthead's bone plate is what makes it legible, and this flag
// is the only way to see that working. A code path nobody has drawn is a code
// path nobody has checked.
const LOGO = process.argv.includes("--logo")
  ? "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="34" viewBox="0 0 200 34">
       <text x="0" y="25" font-family="Georgia,serif" font-size="24" font-weight="bold" fill="#101418">RIDGELINE</text>
     </svg>`)
  : null;

// BUILT BY `brandFrom`, NOT BY HAND. A fixture assembled field by field is a
// fixture that silently disagrees with the interface the moment one is added —
// which is exactly what happened when the dark palette arrived and every email
// rendered `undefined`. The builder is the same one `_shared/email.ts` uses in
// production, so the fixture cannot drift from it.
const brand = {
  ...brandFrom({
    brandName: LONG ? LONG_BIZ : "Ridgeline Auto Detail",
    contactPhone: "(303) 555-0142",
    siteUrl: "https://detailingplatform.com/book/demo-detail",
    logoUrl: LOGO,
  }, ACCENT),
  contactEmail: "hello@ridgelinedetail.example",
  dropoffAddress: "2200 Blake St, Denver, CO 80205",
  googleReviewUrl: "https://g.page/r/example/review",
  yelpReviewUrl: "https://www.yelp.com/biz/example",
  // ROADMAP 2.20 STAGE 1, AND IT IS ON THE BASE FIXTURE ON PURPOSE. Every
  // template gets the handles, so the page a human opens shows both halves of
  // the decision at once: the confirmation, the accepted request, the reminder
  // and the INVOICE draw a "How to pay" list, and the RECEIPT — one card away
  // from the invoice, same template, same fixture — draws none. That contrast
  // is the owner's own complaint about his old site, and it is the thing worth
  // being able to see rather than read.
  //
  // ONE OF EACH KIND THE MODULE CAN PRODUCE: two that link from a username, a
  // pasted URL that links as typed, a phone number that must NOT link, free
  // text, and cash. Run through `paymentHandles` rather than written by hand,
  // for the same reason `brandFrom` builds the colours — a fixture assembled
  // field by field is a fixture that silently disagrees with production.
  payment: paymentHandles({
    pay_venmo: "@ridgeline-detail",
    pay_cashapp: "ridgelinedetail",
    pay_paypal: "https://paypal.me/ridgelinedetail",
    pay_zelle: "(303) 555-0142",
    pay_other: "Apple Pay, or a check made out to Ridgeline",
    pay_cash: true,
  }),
};

// ─────────────────────────────────────────────────────────────────────────
// THE MONEY IS COMPUTED, NOT TYPED — ROADMAP 14.19's ROOT CAUSE, FINISHED.
// ─────────────────────────────────────────────────────────────────────────
//
// **THIS BLOCK USED TO BE A COMMENT DOING LONG DIVISION.** It read:
//
//     services + add-ons        360
//     + travel 25 + surcharge 20 = 405  (subtotalBase)
//     − 5% site sale  20         = 385  (bookings.subtotal, post-sale)
//     − promo FALL10  40         = 345  (total_price)
//
// — and then the same figures were typed into the object below it. **A
// fixture explaining why it is right instead of being right.** The comment
// above it called that arithmetic "load-bearing", which it was: thirty of the
// thirty-two emails on this page draw their money from this object and from
// `planBooking` under it, so a wrong figure here is a wrong figure on thirty
// screens, and nothing anywhere would have said so. That is how the carload
// fixture below sat at a hand-typed `480` through the whole of 14.19.
//
// Now one set of service rows feeds `computeQuote`, the same function
// `create-booking` runs, and every money field on all three fixtures comes
// out of it. **The story is still chosen by a person; the arithmetic is not.**
//
// ONE SET OF ROWS FOR ALL THREE FIXTURES. The carload defined its own
// duplicates when it was converted an hour before this; two copies of "the
// same service" is the drift this whole item is about, one level up.
const fixtureServices = [{
  id: "svc-detail",
  name: LONG ? LONG_SERVICE : "Full Interior + Exterior Detail",
  price: 240,
  duration_minutes: 180,
  // A real size table, so extra cars are priced rather than assumed — the
  // F-150 genuinely costs more than the small car, which is why
  // `vehicle_size_adjustments` exists. `suv` is the base fixture's own
  // vehicle and carries no surcharge.
  vehicle_size_adjustments: {
    small: { price: 0, duration_minutes: 0 },
    suv: { price: 0, duration_minutes: 0 },
    large: { price: 40, duration_minutes: 30 },
  },
}];
const fixtureAddOns = [
  { id: "ao-pet", name: LONG ? LONG_ADDON_A : "Pet hair removal", price: 60, duration_minutes: 45 },
  { id: "ao-bay", name: LONG ? LONG_ADDON_B : "Engine bay clean", price: 60, duration_minutes: 30 },
];

// The job every fixture on this page is a variation of: one detail, two
// add-ons, an outer-ring travel fee, the detailer's own soiling surcharge, a
// 5% site sale and a $40 promo code. `extra` overrides exactly the one thing
// a given fixture is FOR.
const fixtureQuote = (extra = {}) => computeQuote({
  services: fixtureServices,
  addOns: fixtureAddOns,
  vehicleSize: "suv",
  vehicleSizeLabel: "Mid-size SUV",
  extraVehicles: [],
  travelFee: 25,
  adjustments: [{ label: "Heavy soiling surcharge", amount: 20 }],
  siteDiscountPercent: 5,
  promo: { type: "amount", value: 40 },
  roundingNearest: 0,
  plan: null,
  ...extra,
});

// Every field a template reads for money, taken from the quote and from
// nowhere else. `create-booking/index.ts:650-676` builds the same shape.
const moneyFrom = (q) => ({
  serviceNames: fixtureServices.map((s) => s.name),
  addOnNames: fixtureAddOns.map((a) => a.name),
  travelFee: q.travelFee,
  adjustments: q.adjustmentLines,
  subtotal: q.subtotalAfterSite,
  siteDiscount: q.siteDiscount,
  promoDiscount: q.promoDiscount,
  total: q.total,
});

const baseQuote = fixtureQuote();
const booking = {
  id: "7f3ab210-55c1-4e0a-9d2e-31b6c4a90e77",
  lang: LANG,
  customerName: "Dana Ortiz",
  customerPhone: "(720) 555-0188",
  customerEmail: "dana.ortiz@example.com",
  customerAddress: "1420 Larimer St, Denver, CO 80202",
  dateStr: "2026-09-17",
  startTime: "10:00",
  endTime: "13:30",
  serviceType: "mobile",
  // IDEA 11 — the fixture answers NO to both, because the line only exists
  // for a customer who cannot supply them and a fixture that says yes would
  // render nothing. A check that cannot reach the case it is written for is
  // this repo's most repeated failure.
  hasWater: false,
  hasPower: false,
  vehicleSize: "Mid-size SUV",
  vehicleModel: "2021 Subaru Outback",
  customerNotes: "Dog hair in the back seats. There's a tap on the side of the house.",
  travelZone: "Outer ring",
  // The two figures that are a STATEMENT rather than an amount, so they stay
  // written here: the sale's headline percentage and the code the customer
  // typed. Both are inputs to `fixtureQuote` above, not outputs of it.
  siteDiscountPercent: 5,
  promoCode: "FALL10",
  ...moneyFrom(baseQuote),
  receiptUrl: "https://detailingplatform.com/booking/7f3ab210-55c1-4e0a-9d2e-31b6c4a90e77",
};

// THE SAME BOOKING WITH A PLAN ON IT, AND THE ONLY DIFFERENCE THAT MATTERS IS
// THE SIGN (roadmap 2.14 step 3). `computeQuote` pushes the plan into
// `price_adjustments` as a NEGATIVE amount, and every other figure in this file
// is positive — so without this row the money column's tie-out could not reach
// the case where it breaks.
// **AND THE TYPED VERSION OF THIS ONE WAS TWO KINDS OF IMPOSSIBLE**, which
// is exactly what converting it was supposed to find:
//
//   1. It read `{ label: "Bi-weekly maintenance · included", amount: -60 }`.
//      `planLineFor` cannot make that pair. An **included** plan covers the
//      first car's services outright, so on this $240 detail it is **−240**.
//      A **−60** line is a per-visit plan rate ($180 against a $240 service)
//      and `planLineFor` labels that *"plan rate"*, never *"included"*. The
//      label claimed the plan covered the work; the amount said it took $60
//      off. **One of the two had to be a lie and nothing could tell you
//      which** — the same defect as 14.19's discount line, in a fixture.
//   2. Its site sale was typed as **20**, copied from the base booking. But
//      the plan makes the job smaller, and 5% of the smaller job is **17**.
//      A $3 error, on a line whose own label states the percentage.
//
// Resolved by keeping the AMOUNT's story — a bi-weekly plan at a member rate
// of $180 a visit — and letting the engine name it. The label is now true and
// the sale is recomputed on the job it is actually a percentage of.
const planQuote = fixtureQuote({
  plan: { name: LONG ? LONG_PLAN : "Bi-weekly maintenance", priceKind: "per_visit", priceAmount: 180 },
});
const planBooking = { ...booking, ...moneyFrom(planQuote) };

// ROADMAP 8.10 — THREE CARS ON ONE VISIT. The owner's alert is the email a
// detailer reads while deciding what to put in the van, and it carries no
// money table at all — so if the fact row names one car, a three-car job looks
// like a one-car job and the mistake is discovered in somebody's driveway.
//
// ─────────────────────────────────────────────────────────────────────────
// AND THE MONEY IS COMPUTED NOW, NOT TYPED — ROADMAP 14.19's ROOT CAUSE.
// ─────────────────────────────────────────────────────────────────────────
//
// **THIS FIXTURE USED TO BE A DRAWING OF A FIXTURE.** It carried
// `subtotal: 480, total: 480` — hand-written, and the CORRECT shape — beside
// a comment reasoning that "240 + 120 + 120 = 480". So while the product was
// storing a two-car subtotal of 315 against a 215 charge, **this page showed
// a three-car email that looked perfectly right**, and it is the page a human
// opens to check exactly that. 14.19 went unseen for two days partly because
// of this object. The file's own header already names the failure — *"a
// fixture assembled field by field is a fixture that silently disagrees with
// production"* — and this was that, in the one fixture where it mattered.
//
// **AND THE DRAWING WAS ITSELF WRONG, WHICH NOBODY HAD NOTICED.** Rendered at
// HEAD, those typed numbers made `quoteLines()` derive a service line of $235
// — a figure nobody chose — and then `reconcile()` closed the remaining gap
// with an invented **"Adjustment  $40"** row. A charge with no name, on the
// preview page, in the product's own house style. It survived because the
// column adds up: 235 + 25 + 120 + 120 − 20 − 40 + 40 = 480.
//
// **THE 120 WAS A NUMBER THE ENGINE CANNOT PRODUCE.** An extra car costs
// `basePrice + its size fee`, so with a $240 service the second car is $280,
// never $120. The typed figure was not a stale value; it was never a possible
// one. That is the tell to look for in any other hand-built fixture here.
//
// So the story below is still chosen by a person — the same service, add-ons,
// travel, surcharge, sale and promo code as the base fixture — and **every
// figure is produced by running `computeQuote`**, the same function
// `create-booking` runs. `scripts/.../pricing.ts` and this page can no longer
// disagree, because there is only one of them now.
// ONE LIST, TWO SHAPES. The engine wants `{ key, label, model }` and the email
// wants `{ size, model }`; built from the same row so the pictures and the
// prices cannot name different cars.
const carloadCars = [
  { key: "large", label: "Large / SUV", model: "2021 Ford F-150" },
  { key: "small", label: "Small car", model: null },
];
const carloadQuote = fixtureQuote({
  extraVehicles: carloadCars,
  extraVehicleMinutesSaved: 30,
});
const carloadBooking = {
  ...booking,
  extraVehicles: carloadCars.map((v) => ({ size: v.label, model: v.model })),
  ...moneyFrom(carloadQuote),
};

// BUILT THE WAY `send-invoice/index.ts` BUILDS IT — AND THAT IS NOW ONE LINE
// PLUS THE FINALIZE EXTRAS, which is the point of roadmap 2.18's last change.
// The invoice copies what was finalized instead of re-deriving it:
// `FinalizeModal` computes `final_amount = total_price + Σ(line items)`, so the
// invoice prints exactly those terms and the column cannot disagree with the
// total. No services, no travel, no promo, no site sale, no rounding — all of
// them are already inside `total_price`.
// **AND THE LABELS GO THROUGH THE SAME LOOKUP `send-invoice` USES — 2026-09-20,
// ROADMAP 3.4.** They were three English literals typed here, which made this
// fixture a SECOND, DIVERGENT COPY of labels the product builds for itself. So
// when `send-invoice` was putting `Booking total`, `Tip` and `Discount:` into
// Spanish invoices in English, this page rendered the identical English words
// from its own hard-coded list and showed nothing wrong. **A fixture that
// restates the product instead of exercising it cannot fail with it** — the
// same shape as `vehicleSize: "Mid-size SUV"` further up, which is a string no
// booking has ever stored and which quietly stops `sizeDisplay` from being
// drawn at all.
//
// `send-invoice` prefixes a category word onto the detailer's own line-item
// text; the third row reproduces that shape, ours translated and theirs not.
const tt = translate(LANG);
// THE TIP AND THE GOODWILL DISCOUNT ARE TYPED, AND THEY SHOULD BE — they are
// what a person entered in `FinalizeModal` after the job, not anything the
// pricing engine can produce. **`Booking total` is NOT typed**: it is
// `total_price`, the engine's own figure, and it was sitting here as a
// hand-written `345` in two places plus a third in the comment arithmetic —
// three copies of a number that has an owner. A booking total that disagrees
// with the booking is the invoice defect this file was written after.
const TIP = 30;
const GOODWILL = -15;
const invoiceRows = [
  { label: tt("Booking total"), qty: 1, lineTotal: booking.total, kind: "charge" },
  { label: tt("Tip"), qty: 1, lineTotal: TIP, kind: "tip" },
  { label: `${tt("Discount")}: Loyal customer`, qty: 1, lineTotal: GOODWILL, kind: "discount" },
];
const invoiceTotals = {
  chargesSubtotal: booking.total,
  discountsTotal: GOODWILL,
  tipTotal: TIP,
  // `FinalizeModal` computes `final_amount = total_price + Σ(line items)`.
  totalPaid: booking.total + TIP + GOODWILL,
};

// EVERY KIND, INCLUDING THE BRANCHES. `isRequest`, `forOwner` and the three
// request decisions are separate rows on purpose — each is an email somebody
// actually receives, and 2.12's two worst defects were both on branches nobody
// had rendered.
const EMAILS = [
  ["customer-confirmation", "Customer · booking confirmed", () => T.customerConfirmationEmail(brand, booking, false)],
  ["customer-request-received", "Customer · request received", () => T.customerConfirmationEmail(brand, booking, true)],
  ["customer-reminder", "Customer · appointment reminder", () => T.customerReminderEmail(brand, booking)],
  // THE THREE FIGURES ON THIS PAGE THE ENGINE CANNOT PRODUCE, AND THEY ARE
  // TYPED ON PURPOSE — named here so nobody has to wonder which of the
  // remaining numbers is an oversight. All three are entered by a PERSON in
  // the product, not derived from a price:
  //   * `quotedAmount` below — the detailer's counter-offer to a request.
  //     Its whole point is that it is NOT the quote the engine gave; the
  //     note beside it says why. $395 against a $345 job.
  //   * `TIP` and `GOODWILL` further up — typed into `FinalizeModal` after
  //     the job is done.
  //   * `platform-payment-failed`'s $60 — the platform's own subscription
  //     price, a different subsystem entirely from booking pricing.
  // Everything else on this page now comes out of `computeQuote`.
  ["customer-quote", "Customer · quote offered", () => T.requestDecisionEmail(brand, booking, "quote", { manageUrl: booking.receiptUrl, quotedAmount: 395, quotedNote: "The pet hair on this one is a bigger job than the photos suggested." })],
  ["customer-accepted", "Customer · request accepted", () => T.requestDecisionEmail(brand, booking, "accepted", { manageUrl: booking.receiptUrl })],
  ["customer-declined", "Customer · request declined", () => T.requestDecisionEmail(brand, booking, "declined", { manageUrl: booking.receiptUrl })],
  ["customer-receipt", "Customer · receipt (paid)", () => T.invoiceEmail(brand, booking, invoiceRows, invoiceTotals, "paid", "Paid by card on the day.")],
  ["customer-invoice", "Customer · invoice (unpaid)", () => T.invoiceEmail(brand, booking, invoiceRows, invoiceTotals, "unpaid", null)],
  // ROADMAP 2.20 STAGE 3 — ITS OWN FIXTURE, because the pay button is a
  // BRANCH and the unpaid invoice above it takes the other side. A fixture
  // that only ever renders `cardReady = false` cannot reach the button at
  // all, and a check that cannot reach a case reads exactly like a check that
  // passes.
  ["customer-invoice-card", "Customer · invoice (unpaid, card accepted)", () => T.invoiceEmail(brand, booking, invoiceRows, invoiceTotals, "unpaid", null, true)],
  ["customer-reschedule", "Customer · rescheduled", () => T.rescheduleEmail(brand, booking, "2026-09-12", "08:00", false)],
  ["customer-cancellation", "Customer · cancelled", () => T.cancellationEmail(brand, booking, false)],
  ["customer-followup", "Customer · thank-you and review request", () => T.followupEmail(brand, "Dana Ortiz", LANG)],
  ["owner-new-booking", "Owner · new booking", () => T.ownerNewBookingEmail(brand, booking, false)],
  ["owner-new-request", "Owner · new request waiting", () => T.ownerNewBookingEmail(brand, booking, true)],
  // ROADMAP 2.8 — THE SAME EMAIL WITH AN ADDRESS NOBODY COULD FIND, beside
  // the one above so the pair can be compared on one page. The only
  // difference between them is `addressSource`, which is the whole claim:
  // a picked suggestion carries no label, a hand-typed address does.
  ["owner-new-booking-typed", "Owner · new booking, address typed by hand",
    () => T.ownerNewBookingEmail(
      brand,
      { ...booking, customerAddress: "99999 Nonexistent Parkway, Nowhere Township, ZZ 00000", addressSource: "typed" },
      false,
    )],
  ["owner-new-booking-picked", "Owner · new booking, address picked from the lookup",
    () => T.ownerNewBookingEmail(brand, { ...booking, addressSource: "picked" }, false)],
  // ROADMAP 8.10. Its own entry rather than a change to the one above,
  // because the ONE-car alert is what nearly every detailer gets and a fixture
  // that only shows three cars cannot reach the ordinary case. Both are drawn.
  ["owner-new-booking-carload", "Owner · new booking, three cars",
    () => T.ownerNewBookingEmail(brand, carloadBooking, false)],
  ["customer-confirmation-carload", "Customer · confirmed, three cars",
    () => T.customerConfirmationEmail(brand, carloadBooking)],
  ["owner-reschedule", "Owner · a booking moved", () => T.rescheduleEmail(brand, booking, "2026-09-12", "08:00", true)],
  ["owner-cancellation", "Owner · a booking cancelled", () => T.cancellationEmail(brand, booking, true)],
  // ROADMAP 14.4 — ITS OWN ENTRY, because the refund instruction is a BRANCH
  // and the plain cancellation above takes the other side. A fixture that only
  // ever renders an unpaid cancellation cannot reach the sentence at all, and
  // this file's own rule is that a check which cannot reach its case reads
  // exactly like a check that passes. The figure is `final_amount`, not the
  // quote — the two differ in the fixture on purpose.
  ["owner-cancellation-paid", "Owner · a PAID booking cancelled",
    () => T.cancellationEmail(
      brand,
      // ROADMAP 14.19 FOLLOW-UP — AND THIS PAIR WAS TYPED AS `180 / 195`
      // WHILE THE EMAIL AROUND IT SAID `$345`. Rendered, it read *"Was worth
      // $345. Refund $195"* — two unrelated bookings in one message, on the
      // page a person opens to check that emails make sense. The comment
      // above is right that the two figures must DIFFER, and they still do:
      // `total_price` is the job, `final_amount` is the job plus the tip less
      // the goodwill discount, which is what the customer actually paid and
      // therefore what comes back. Both now come from this fixture's own
      // numbers, so the sentence is about the booking it is attached to.
      {
        ...booking,
        refundNote: refundInstruction(
          refundOwed({ total_price: booking.total, final_amount: invoiceTotals.totalPaid, payment_status: "paid" }),
          money,
        ),
      },
      true,
    )],
  ["owner-stale-request", "Owner · nobody answered a request", () => T.staleRequestEmail(brand, booking, 19)],
  // WITH A LABEL, because roadmap 2.13 made the role's name the detailer's to
  // choose and this sentence is where their customer-facing word first reaches
  // the person they invited. Rendered with one so the preview shows the real
  // string ("as a Detailer") rather than the fallback nobody will see.
  ["staff-invite", "Staff · team invite", () => T.inviteEmail(brand, { role: "staff", label: "Detailer", link: "https://detailingplatform.com/invite/abc123", expiresAt: "2026-09-10T00:00:00Z" })],
  // Roadmap 2.14 step 3. The plan link is the SAFE half of "type your email
  // and it shows you" — it is the only thing that answers that form, so it is
  // the one email in the set whose absence would be a security decision going
  // quiet rather than a template looking wrong.
  // A PLAN BOOKING, AND IT IS HERE FOR THE NEGATIVE LINE RATHER THAN FOR THE
  // PLAN (roadmap 2.14 step 3). `moneyBlock` draws by `kind`, not by sign, so a
  // −$60 adjustment printed as a $60 CHARGE and the column silently stopped
  // reaching its total. Every other fixture on this page is positive, so the
  // tie-out below could not see it — a check that cannot reach a case reads
  // exactly like a check that passes. `accept-quote` could already produce one
  // whenever a detailer quoted UNDER the estimate.
  ["customer-confirmation-plan", "Customer · booking confirmed, on a plan", () => T.customerConfirmationEmail(brand, planBooking, false)],
  ["customer-plan-link", "Customer · your plan link", () => T.planLinkEmail(brand, { customerName: "Dana Ortiz", planName: "Bi-weekly maintenance", planUrl: "https://detailingplatform.com/plan/9c1f2b64-0000-4000-8000-000000000001", bookUrl: brand.siteUrl }, LANG)],
  // ROADMAP 2.23 — BOTH ENDS OF THE ESCALATION, because they are different
  // emails: the first is a note two months out and the last is the day
  // before. Rendering only one would leave the half that actually matters
  // unlooked-at, which is this script's whole reason for existing.
  ["customer-maintenance-far", "Customer · maintenance due (60 days)", () => T.maintenanceDueEmail(brand, { customerName: "Dana Ortiz", label: "Ceramic Pro annual inspection", vehicle: "2021 Tacoma", dueOn: T.formatDateLong("2026-10-12", LANG), daysLeft: 60, bookUrl: brand.siteUrl, unsubscribeUrl: "https://detailingplatform.com/unsubscribe/9c1f2b64-0000-4000-8000-000000000002", mailingAddress: "PO Box 214, Lakewood CA 90713" }, LANG)],
  ["customer-maintenance-last", "Customer · maintenance due (tomorrow)", () => T.maintenanceDueEmail(brand, { customerName: "Dana Ortiz", label: "Ceramic Pro annual inspection", vehicle: "2021 Tacoma", dueOn: T.formatDateLong("2026-10-12", LANG), daysLeft: 1, bookUrl: brand.siteUrl, unsubscribeUrl: "https://detailingplatform.com/unsubscribe/9c1f2b64-0000-4000-8000-000000000002", mailingAddress: "PO Box 214, Lakewood CA 90713" }, LANG)],
  ["owner-plan-cancelled", "Owner · a plan ended", () => T.planCancelledEmail(brand, { customerName: "Dana Ortiz", planName: "Bi-weekly maintenance", startedOn: "2026-03-02", endedOn: "2026-09-04" })],
  // ROADMAP 2.19. THE ONLY COMMERCIAL EMAIL IN THE SET, and the only one a
  // human composes — so it is the only one whose footer carries a postal
  // address and an opt-out. It is rendered here for the reason every other row
  // is: the two lines the law asks for are exactly the kind of thing that
  // looks present in the code and turns out to be missing on the page.
  ["customer-campaign", "Customer · the detailer reaching out", () => T.campaignEmail(brand, {
    customerName: "Dana Ortiz",
    subject: "Time to get it looking right again?",
    message: "It's been a few months since we last took care of your car.\n\nIf you'd like it back to how it looked when you drove it away, booking takes about a minute. Just use the button below and pick a time that suits you.",
    bookUrl: brand.siteUrl,
    unsubscribeUrl: "https://detailingplatform.com/unsubscribe/9c1f2b64-0000-4000-8000-000000000002",
    mailingAddress: "PO Box 214, Lakewood CA 90713",
  }, LANG)],
  // ROADMAP 2.20 STAGE 2 — THE ONLY TWO EMAILS THE PLATFORM SENDS IN ITS OWN
  // NAME. Every other row on this page is a detailer speaking to somebody;
  // these two are us telling a detailer their card stopped working, so they
  // are built on `platformBrand()` rather than on the tenant fixture and they
  // are rendered here for exactly the reason the campaign is: the sentence
  // that matters most — *nothing has been deleted* — is the kind of promise
  // that reads as present in the code and turns out to be missing on the page.
  ["platform-payment-failed", "Detailer · a payment did not go through", () => T.billingEmail(
    platformBrand(PLATFORM),
    { kind: "failed", businessName: "Ridgeline Auto Detail", billingUrl: `${PLATFORM}/app?settings=billing`, amount: 60, reason: "Your card has insufficient funds." },
  )],
  ["platform-suspended", "Detailer · the booking page is offline", () => T.billingEmail(
    platformBrand(PLATFORM),
    { kind: "suspended", businessName: "Ridgeline Auto Detail", billingUrl: `${PLATFORM}/app?settings=billing`, amount: 60, reason: null },
  )],
  // ROADMAP 8.6 — THE THIRD EMAIL THE PLATFORM SENDS IN ITS OWN NAME, and the
  // first that goes to the OWNER rather than to a detailer. It is rendered
  // here for the same reason as the other twenty-five: this script is the only
  // thing in the repo that has ever LOOKED at an email, and 2.12 shipped
  // eleven under-floor headlines because nothing did.
  ["platform-new-detailer", "Owner · somebody signed up", () => T.platformAlertEmail(
    platformBrand(PLATFORM),
    {
      kind: "New detailer",
      headline: "Ridgeline Auto Detail just signed up",
      intro: "Somebody created an account and a business. Nothing has been paid yet. You will get a second email when they subscribe.",
      facts: [
        ["Business", "Ridgeline Auto Detail"],
        ["Booking page", `${PLATFORM}/book/ridgeline`],
        ["Signed up by", "sam@ridgeline.example"],
      ],
      buttonLabel: "Open the back office",
      buttonUrl: `${PLATFORM}/admin`,
    },
  )],
];

const ROT = [["undefined", /undefined/], ["NaN", /NaN/], ["[object Object]", /\[object Object\]/], ['href=""', /href=""/]];

await mkdir(OUT, { recursive: true });
let bad = 0;
const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

// **THIS GATE WROTE NO RECEIPT UNTIL 2026-09-21 - docs/silences.md section A.**
// Two corrections to that census row while adding one: it DOES print a subject
// count ("32 emails") and it DOES exit 1 on problems, so the row was wrong on
// both halves. What it had no answer for is a run that never happened, and a
// run that rendered nothing: EMAILS coming back empty prints "0 emails" and
// exits 0, which is a clean-looking pass over no email at all.
//
// **32 IS COUNTED FROM THE `EMAILS` ARRAY IN THIS FILE, which is repo source**
// - not from the live system and not from a previous run summary line. It has
// to be counted by evaluating the array rather than by parsing it: the entries
// are constructed, so a naive source parse returns 54. Declaring it separately
// is the point - delete a template from that list and the two numbers stop
// agreeing.
const EXPECTED_EMAILS = 32;

// **EVERY TEMPLATE THE PRODUCT EXPORTS HAS TO BE IN `EMAILS`, AND UNTIL
// 2026-09-13 NOTHING SAID SO.** That list is hand-maintained. A seventeenth
// template added to `_shared/emailTemplates.ts` and not added here would never
// be rendered, never be looked at, and this script would still print its count
// and `0 problems` — a clean bill over an email nobody has ever seen. This
// repo’s most repeated failure shape: a list somebody has to remember to
// update, going stale in silence.
//
// **MEASURED when this was added: 16 exported, 16 rendered, 0 missing.** It
// closes a future gap rather than a present one, which is the only moment such
// a gap is cheap to close.
//
// **IT READS THE MODULE AND THE CLOSURES, NOT THE SOURCE TEXT.** `T` is already
// imported as a namespace, so the left-hand side is what the module actually
// EXPORTS; the right-hand side is the source of the render functions in `EMAILS`
// itself, so a name mentioned only in a comment elsewhere cannot satisfy it.
// Trap (k): assert the behaviour, not the spelling. `platform-admin` § 14e-ii
// already asserts ONE template by name, which is a list of one.
{
  const exported = Object.keys(T).filter((k) => /Email$/.test(k) && typeof T[k] === "function");
  const rendered = EMAILS.map(([, , render]) => render.toString()).join(" ");
  const missing = exported.filter((k) => !rendered.includes(`T.${k}(`));
  if (!exported.length) {
    console.error("  FAIL  the templates module exported no *Email function at all — this check read nothing");
    bad++;
  } else if (missing.length) {
    console.error(`  FAIL  ${missing.length} template(s) exported but never rendered: ${missing.join(", ")}`);
    bad++;
  } else {
    console.log(`  ok    all ${exported.length} exported templates are rendered below`);
  }
}

const cards = [];

for (const [file, label, render] of EMAILS) {
  const { subject, html, text } = render();
  for (const [name, re] of ROT) {
    if (re.test(html) || re.test(subject) || re.test(text ?? "")) {
      console.error(`  FAIL  ${label}: rendered "${name}"`);
      bad++;
    }
  }
  // HTML-only was the live defect. A template that forgets its text half is
  // the defect coming back one template at a time.
  if (!text || text.length < 40) {
    console.error(`  FAIL  ${label}: no plain-text alternative`);
    bad++;
  }
  await writeFile(`${OUT}/${file}.html`, html);
  await writeFile(`${OUT}/${file}.txt`, text ?? "");
  cards.push(`<li><a href="${file}.html">${label}</a> <a href="${file}.txt" class="t">text</a><div class="s">${subject.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div></li>`);
  console.log(`  ${label}\n    ${subject}`);
}

// --- EVERY MONEY COLUMN REACHES ITS OWN TOTAL -----------------------------
// The check the old invoice would have failed. It is asserted on the RENDERED
// output rather than on the inputs, so it cannot be satisfied by a fixture
// that happens to agree with itself.
{
  const cases = [
    ["confirmation", T.customerConfirmationEmail(brand, booking, false).html, booking.total],
    // THE NEGATIVE LINE, and it is a separate case rather than a richer
    // fixture on purpose: this file's whole argument is that a check which
    // cannot reach a case reads exactly like a check that passes, and every
    // figure in the row above is positive. Baselined by removing the sign
    // handling in `quoteLines` — without this row nothing failed.
    ["confirmation, on a plan", T.customerConfirmationEmail(brand, planBooking, false).html, planBooking.total],
    // ROADMAP 14.19 FOLLOW-UP — AND THE CARLOAD, WHICH THIS BLOCK HAS NEVER
    // COVERED. Three cases were listed here and the multi-vehicle email was
    // not one of them, so the one column with extra-vehicle lines in it was
    // the one column nobody tied out. That is this file's own argument used
    // against itself: *a check which cannot reach a case reads exactly like a
    // check that passes.*
    //
    // **IT WOULD HAVE PASSED ANYWAY, AND THAT IS THE MORE USEFUL HALF.** With
    // the old typed fixture this column balanced at 480 — by way of an
    // invented "Adjustment $40" row that `reconcile()` added to make it. A
    // tie-out asks whether the lines reach the total, and `reconcile()`'s job
    // is to guarantee that they do. So this row is worth having and it is NOT
    // what protects the numbers; `tests/quoted-lines-true.test.mjs` is, by
    // asking instead whether each line is TRUE.
    ["confirmation, three cars", T.customerConfirmationEmail(brand, carloadBooking, false).html, carloadBooking.total],
    ["receipt", T.invoiceEmail(brand, booking, invoiceRows, invoiceTotals, "paid", null).html, invoiceTotals.totalPaid],
  ];
  for (const [name, html, total] of cases) {
    const txt = htmlToText(html);
    // Every "$n" in the money block, in order. The last one is the total.
    //
    // THE CENTS ARE OPTIONAL — 2026-09-13. This pattern required `.dd` and was
    // written when `emailKit.money` was `toFixed(2)`. The moment that formatter
    // was brought into line with `app/src/lib/format.js` (cents only when there
    // are cents) every whole-dollar figure stopped matching, all three columns
    // read as EMPTY, and the tie-out reported "no money column" — a check
    // coupled to a SPELLING rather than to the behaviour it guards, which is
    // CLAUDE.md trap (k). The behaviour is that the lines add up to the total,
    // and that is what stays asserted.
    const figs = [...txt.matchAll(/(-|−)?\$([\d,]+(?:\.\d{2})?)/g)]
      .map((m) => (m[1] ? -1 : 1) * parseFloat(m[2].replace(/,/g, "")));
    if (figs.length < 2) {
      console.error(`  FAIL  ${name}: no money column found in the rendered output`);
      bad++;
      continue;
    }
    const printedTotal = figs[figs.length - 1];
    const sum = Math.round(figs.slice(0, -1).reduce((s, n) => s + n, 0) * 100) / 100;
    if (Math.abs(sum - printedTotal) > 0.005 || Math.abs(printedTotal - total) > 0.005) {
      console.error(
        `  FAIL  ${name}: the lines sum to ${sum} and the printed total is ${printedTotal} (expected ${total})`,
      );
      bad++;
    }
  }
}

// --- THE FLOORS, IN BOTH PALETTES -----------------------------------------
//
// The email ships a LIGHT design inline and a DARK one behind
// `prefers-color-scheme`, so both have to clear the floors — a palette that is
// only checked in one mode is half-checked. Roadmap 2.18: the dark-first
// version failed on Gmail at 1.77:1 and nothing in this script noticed,
// because nothing measured what a client does to the colours afterwards.
{
  for (const [mode, P, accentOf] of [
    ["light", L, (h) => { const c = emailBrandColors(h); return { text: c.onPaper, fill: c.band, ink: c.bandInk }; }],
    ["dark", D, (h) => { const c = emailDarkBrandColors(h); return { text: c.text, fill: c.fill, ink: c.fillInk }; }],
  ]) {
    for (const [gName, g] of [["ground", P.ground], ["panel", P.panel]]) {
      for (const t of ["ink", "ink2", "fog", "fog2"]) {
        const r = contrastRatio(P[t], g);
        if (r < 4.5) {
          console.error(`  FAIL  ${mode}: ${t} on ${gName} is ${r.toFixed(2)}:1, floor 4.5`);
          bad++;
        }
      }
    }
    for (const hex of ["#38E08B", "#DC2626", "#F5D90A", "#7C3AED", "#000000", "#FFFFFF", "#0B0D0E"]) {
      const k = accentOf(hex);
      for (const [what, a, b, floor] of [
        ["accent as words on the panel", k.text, P.panel, 4.5],
        ["accent as a fill on the panel", k.fill, P.panel, 3],
        ["ink on the accent fill", k.ink, k.fill, 4.5],
      ]) {
        const r = contrastRatio(a, b);
        if (r < floor - 1e-9) {
          console.error(`  FAIL  ${mode}: ${hex}: ${what} is ${r.toFixed(2)}:1, floor ${floor}`);
          bad++;
        }
      }
      // Apple Mail is ~60% of opens and treats a pure value as permission to
      // invert the whole email.
      for (const [label, v] of [["text", k.text], ["fill", k.fill], ["ink", k.ink]]) {
        if (/^#(fff(fff)?|000(000)?)$/i.test(v)) {
          console.error(`  FAIL  ${mode}: ${hex}: ${label} is ${v} — Apple Mail inverts on a pure value`);
          bad++;
        }
      }
    }
  }
}

// --- EVERY COLOURED ELEMENT CARRIES ITS DARK-MODE CLASS -------------------
//
// The dark palette is applied by CLASS. An element that sets a colour inline
// and forgets its class stays LIGHT inside a dark email — the one way this
// design can look broken rather than merely different, and something no
// contrast check can see because both values are individually fine.
{
  const html = T.customerConfirmationEmail(brand, booking, false).html
    + T.invoiceEmail(brand, booking, invoiceRows, invoiceTotals, "paid", "Paid by card.").html
    + T.cancellationEmail(brand, booking, false).html
    + T.requestDecisionEmail(brand, booking, "quote", { manageUrl: booking.receiptUrl, quotedAmount: 395 }).html
    // ROADMAP 2.19 — and this one is here for a reason the other four are not:
    // it is the ONLY template that adds elements to the footer, so it is the
    // only one that could ship a coloured line with no dark-mode class in the
    // one part of the email every other template shares.
    + T.campaignEmail(brand, {
      customerName: "Dana Ortiz", subject: "A while since we saw you", message: "Come back any time.",
      bookUrl: brand.siteUrl, unsubscribeUrl: "https://example.org/u/1", mailingAddress: "PO Box 214",
    }).html;
  // Every inline `color:` / `background-color:` outside the <style> block, with
  // the tag it sits on. Anything carrying a colour must also carry a class.
  const body = html.slice(html.indexOf("</style>"));
  for (const m of body.matchAll(/<(td|div|span|strong|a|body|table)([^>]*?)style="([^"]*)"/g)) {
    const [, tag, attrs, style] = m;
    if (!/(^|;|\s)(background-)?color:/.test(style)) continue;
    if (/color:transparent/.test(style)) continue;         // the preheader
    if (!/class="/.test(attrs)) {
      console.error(`  FAIL  <${tag}> sets a colour with no dark-mode class: ${style.slice(0, 70)}`);
      bad++;
    }
  }
}

await writeFile(`${OUT}/index.html`, `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Emails · ${ACCENT}</title><style>
body{font:15px/1.6 system-ui,sans-serif;background:#0B0D0E;color:#F2F1EC;max-width:760px;margin:40px auto;padding:0 20px}
h1{font-size:20px}ul{list-style:none;padding:0}li{padding:12px 0;border-bottom:1px solid #272D31}
a{color:${brand.accentDark};font-weight:600}.t{font-weight:400;font-size:12px;color:#7B858A;margin-left:8px}
.s{color:#7B858A;font-size:13px;margin-top:2px}code{color:#939CA1}
</style></head><body><h1>Every email this product sends</h1>
<p>Tenant accent <code>${ACCENT}</code>.
Light: words <code>${brand.accent}</code>, fill <code>${brand.accentFill}</code>, ink <code>${brand.accentInk}</code>.
Dark: words <code>${brand.accentDark}</code>, fill <code>${brand.accentFillDark}</code>, ink <code>${brand.accentInkDark}</code>.
Every file below is LIGHT by default and swaps to dark under <code>prefers-color-scheme</code> &mdash;
switch your OS theme to see the other one. Re-run with <code>--accent=#hex</code>, <code>--logo</code>, <code>--lang=es</code>.</p>
<ul>${cards.join("\n")}</ul></body></html>`);

// --- THE CANARY -----------------------------------------------------------
// **WHAT BREAKS SILENTLY HERE IS THE ROT DETECTOR, NOT THE TEMPLATES.** Every
// per-email check is `re.test(html)` against the `ROT` patterns plus a
// plain-text length test. If `ROT` were emptied - a refactor, a bad merge, a
// filter that matched nothing - every template would pass and this would
// render 32 clean-looking emails over whatever they actually say.
//
// So the run is handed a body that is certainly rotten: the literal strings
// every ROT pattern exists to catch, through the same patterns.
const CANARY_BODY = "Hello NaN, your booking on Invalid Date is undefined. $NaN [object Object]";
const canaryHits = BREAK === "blind" ? [] : ROT.filter(([, re]) => re.test(CANARY_BODY));
const canaryCaught = canaryHits.length > 0;
console.log("");
console.log(`canary  a body containing NaN / Invalid Date / undefined -> `
  + (canaryCaught
    ? `caught by ${canaryHits.length} of ${ROT.length} rot pattern(s), so a rotten template is something this run can detect`
    : `NOT CAUGHT by any of ${ROT.length} pattern(s) - every "ok" above is a test that cannot fail`));

const failures = [];
if (EMAILS.length === 0) {
  failures.push("ZERO EMAILS WERE RENDERED. Nothing was checked for rot, plain text or contrast, "
    + "so this run proves nothing. This is NOT a clean render.");
} else if (EMAILS.length !== EXPECTED_EMAILS) {
  failures.push(`EMAIL COUNT MOVED: ${EMAILS.length} rendered and EXPECTED_EMAILS declares `
    + `${EXPECTED_EMAILS}. A template that stopped being rendered is a failure, not a smaller run `
    + `- move the number deliberately and say which template changed.`);
}
if (bad) failures.push(`${bad} problem(s) in the rendered emails - see FAIL above`);

const { path: receiptPath } = writeReceipt({
  check_id: "render-emails",
  started_at,
  status: failures.length === 0 && canaryCaught ? "pass" : "fail",
  expected_targets: EXPECTED_EMAILS,
  discovered_targets: EMAILS.length,
  attempted_targets: EMAILS.length,
  completed_targets: cards.length,
  skipped_targets: 0,
  assertions_executed: EMAILS.length * (ROT.length + 1) + 1,
  min_assertions: 100,
  failures,
  artifacts: [`${OUT}/index.html`],
  warnings: BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : [],
  dimensions: { accent: ACCENT, rot_patterns: ROT.length, out: OUT },
  canary: {
    id: "a body full of NaN / Invalid Date / undefined must be caught by the rot patterns",
    observed_failure: canaryCaught,
    caught_by: canaryCaught ? canaryHits.map(([n]) => n) : [],
    findings: canaryCaught
      ? [`[rot] a deliberately rotten body was caught by ${canaryHits.length} of ${ROT.length} patterns, so the per-email rot test is one that can fail`]
      : [`[rot] NOT CAUGHT - none of ${ROT.length} patterns matched a body containing NaN, Invalid Date and undefined, so every email passing above proves nothing`],
  },
});

console.log("");
console.log(`${EMAILS.length} emails -> ${OUT}/index.html  (accent ${ACCENT})`);
if (failures.length || !canaryCaught) {
  for (const f of failures) console.error("  - " + f);
  if (!canaryCaught) console.error("  - the canary was not caught, so this run proves nothing");
  console.error(`Receipt ${receiptPath}`);
  process.exit(1);
}
console.log(`Receipt ${receiptPath}`);
