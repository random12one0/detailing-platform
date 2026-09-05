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
import { contrastRatio, emailBrandColors, emailDarkBrandColors } from "../supabase/functions/_shared/brandColor.js";
import { brandFrom, D, htmlToText, L } from "../supabase/functions/_shared/emailKit.ts";
import * as T from "../supabase/functions/_shared/emailTemplates.ts";
import { paymentHandles } from "../supabase/functions/_shared/payments.ts";
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
const OUT = arg("out", "email-preview");

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
    brandName: "Ridgeline Auto Detail",
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

// THE NUMBERS ARE INTERNALLY CONSISTENT AND THAT IS LOAD-BEARING, not tidiness.
// A fixture whose parts do not add up cannot tell you whether a template's
// money table adds up either.
//   services + add-ons        360
//   + travel 25 + surcharge 20 = 405  (subtotalBase)
//   − 5% site sale  20         = 385  (bookings.subtotal, post-sale)
//   − promo FALL10  40         = 345  (total_price)
//   + tip 30                   = 375  (final_amount)
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
  subtotal: 385,
  siteDiscount: 20,
  siteDiscountPercent: 5,
  promoCode: "FALL10",
  promoDiscount: 40,
  total: 345,
  receiptUrl: "https://detailingplatform.com/booking/7f3ab210-55c1-4e0a-9d2e-31b6c4a90e77",
};

// THE SAME BOOKING WITH A PLAN ON IT, AND THE ONLY DIFFERENCE THAT MATTERS IS
// THE SIGN (roadmap 2.14 step 3). `computeQuote` pushes the plan into
// `price_adjustments` as a NEGATIVE amount, and every other figure in this file
// is positive — so without this row the money column's tie-out could not reach
// the case where it breaks.
//   services + add-ons        360
//   + travel 25 + surcharge 20 = 405
//   − plan "Bi-weekly maintenance — included"  60 = 345  (subtotalBase)
//   − 5% site sale  20         = 325  (bookings.subtotal, post-sale)
//   − promo FALL10  40         = 285  (total_price)
const planBooking = {
  ...booking,
  adjustments: [
    { label: "Heavy soiling surcharge", amount: 20 },
    { label: "Bi-weekly maintenance — included", amount: -60 },
  ],
  subtotal: 325,
  total: 285,
};

// BUILT THE WAY `send-invoice/index.ts` BUILDS IT — AND THAT IS NOW ONE LINE
// PLUS THE FINALIZE EXTRAS, which is the point of roadmap 2.18's last change.
// The invoice copies what was finalized instead of re-deriving it:
// `FinalizeModal` computes `final_amount = total_price + Σ(line items)`, so the
// invoice prints exactly those terms and the column cannot disagree with the
// total. No services, no travel, no promo, no site sale, no rounding — all of
// them are already inside `total_price`.
const invoiceRows = [
  { label: "Booking total", qty: 1, lineTotal: 345, kind: "charge" },   // total_price
  { label: "Tip", qty: 1, lineTotal: 30, kind: "tip" },
  { label: "Discount: Loyal customer", qty: 1, lineTotal: -15, kind: "discount" },
];
const invoiceTotals = {
  chargesSubtotal: 345,
  discountsTotal: -15,
  tipTotal: 30,
  totalPaid: 360, // final_amount = 345 + 30 - 15
};

// EVERY KIND, INCLUDING THE BRANCHES. `isRequest`, `forOwner` and the three
// request decisions are separate rows on purpose — each is an email somebody
// actually receives, and 2.12's two worst defects were both on branches nobody
// had rendered.
const EMAILS = [
  ["customer-confirmation", "Customer · booking confirmed", () => T.customerConfirmationEmail(brand, booking, false)],
  ["customer-request-received", "Customer · request received", () => T.customerConfirmationEmail(brand, booking, true)],
  ["customer-reminder", "Customer · appointment reminder", () => T.customerReminderEmail(brand, booking)],
  ["customer-quote", "Customer · quote offered", () => T.requestDecisionEmail(brand, booking, "quote", { manageUrl: booking.receiptUrl, quotedAmount: 395, quotedNote: "The pet hair on this one is a bigger job than the photos suggested." })],
  ["customer-accepted", "Customer · request accepted", () => T.requestDecisionEmail(brand, booking, "accepted", { manageUrl: booking.receiptUrl })],
  ["customer-declined", "Customer · request declined", () => T.requestDecisionEmail(brand, booking, "declined", { manageUrl: booking.receiptUrl })],
  ["customer-receipt", "Customer · receipt (paid)", () => T.invoiceEmail(brand, booking, invoiceRows, invoiceTotals, "paid", "Paid by card on the day.")],
  ["customer-invoice", "Customer · invoice (unpaid)", () => T.invoiceEmail(brand, booking, invoiceRows, invoiceTotals, "unpaid", null)],
  ["customer-reschedule", "Customer · rescheduled", () => T.rescheduleEmail(brand, booking, "2026-09-12", "08:00", false)],
  ["customer-cancellation", "Customer · cancelled", () => T.cancellationEmail(brand, booking, false)],
  ["customer-followup", "Customer · thank-you and review request", () => T.followupEmail(brand, "Dana Ortiz")],
  ["owner-new-booking", "Owner · new booking", () => T.ownerNewBookingEmail(brand, booking, false)],
  ["owner-new-request", "Owner · new request waiting", () => T.ownerNewBookingEmail(brand, booking, true)],
  ["owner-reschedule", "Owner · a booking moved", () => T.rescheduleEmail(brand, booking, "2026-09-12", "08:00", true)],
  ["owner-cancellation", "Owner · a booking cancelled", () => T.cancellationEmail(brand, booking, true)],
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
  ["customer-plan-link", "Customer · your plan link", () => T.planLinkEmail(brand, { customerName: "Dana Ortiz", planName: "Bi-weekly maintenance", planUrl: "https://detailingplatform.com/plan/9c1f2b64-0000-4000-8000-000000000001", bookUrl: brand.siteUrl })],
  ["owner-plan-cancelled", "Owner · a plan ended", () => T.planCancelledEmail(brand, { customerName: "Dana Ortiz", planName: "Bi-weekly maintenance", startedOn: "2026-03-02", endedOn: "2026-09-04" })],
  // ROADMAP 2.19. THE ONLY COMMERCIAL EMAIL IN THE SET, and the only one a
  // human composes — so it is the only one whose footer carries a postal
  // address and an opt-out. It is rendered here for the reason every other row
  // is: the two lines the law asks for are exactly the kind of thing that
  // looks present in the code and turns out to be missing on the page.
  ["customer-campaign", "Customer · the detailer reaching out", () => T.campaignEmail(brand, {
    customerName: "Dana Ortiz",
    subject: "Time to get it looking right again?",
    message: "It's been a few months since we last took care of your car.\n\nIf you'd like it back to how it looked when you drove it away, booking takes about a minute — just use the button below and pick a time that suits you.",
    bookUrl: brand.siteUrl,
    unsubscribeUrl: "https://detailingplatform.com/unsubscribe/9c1f2b64-0000-4000-8000-000000000002",
    mailingAddress: "PO Box 214, Lakewood CA 90713",
  })],
  // ROADMAP 2.20 STAGE 2 — THE ONLY TWO EMAILS THE PLATFORM SENDS IN ITS OWN
  // NAME. Every other row on this page is a detailer speaking to somebody;
  // these two are us telling a detailer their card stopped working, so they
  // are built on `platformBrand()` rather than on the tenant fixture and they
  // are rendered here for exactly the reason the campaign is: the sentence
  // that matters most — *nothing has been deleted* — is the kind of promise
  // that reads as present in the code and turns out to be missing on the page.
  ["platform-payment-failed", "Detailer · a payment did not go through", () => T.billingEmail(
    platformBrand("Ridgeline Auto Detail", PLATFORM),
    { kind: "failed", billingUrl: `${PLATFORM}/app?settings=billing`, amount: 60, reason: "Your card has insufficient funds." },
  )],
  ["platform-suspended", "Detailer · the booking page is offline", () => T.billingEmail(
    platformBrand("Ridgeline Auto Detail", PLATFORM),
    { kind: "suspended", billingUrl: `${PLATFORM}/app?settings=billing`, amount: 60, reason: null },
  )],
];

const ROT = [["undefined", /undefined/], ["NaN", /NaN/], ["[object Object]", /\[object Object\]/], ['href=""', /href=""/]];

await mkdir(OUT, { recursive: true });
let bad = 0;
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
    ["receipt", T.invoiceEmail(brand, booking, invoiceRows, invoiceTotals, "paid", null).html, invoiceTotals.totalPaid],
  ];
  for (const [name, html, total] of cases) {
    const txt = htmlToText(html);
    // Every "$n" in the money block, in order. The last one is the total.
    const figs = [...txt.matchAll(/(-|−)?\$([\d,]+\.\d{2})/g)]
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
<title>Emails — ${ACCENT}</title><style>
body{font:15px/1.6 system-ui,sans-serif;background:#0B0D0E;color:#F2F1EC;max-width:760px;margin:40px auto;padding:0 20px}
h1{font-size:20px}ul{list-style:none;padding:0}li{padding:12px 0;border-bottom:1px solid #272D31}
a{color:${brand.accentDark};font-weight:600}.t{font-weight:400;font-size:12px;color:#7B858A;margin-left:8px}
.s{color:#7B858A;font-size:13px;margin-top:2px}code{color:#939CA1}
</style></head><body><h1>Every email this product sends</h1>
<p>Tenant accent <code>${ACCENT}</code>.
Light: words <code>${brand.accent}</code>, fill <code>${brand.accentFill}</code>, ink <code>${brand.accentInk}</code>.
Dark: words <code>${brand.accentDark}</code>, fill <code>${brand.accentFillDark}</code>, ink <code>${brand.accentInkDark}</code>.
Every file below is LIGHT by default and swaps to dark under <code>prefers-color-scheme</code> &mdash;
switch your OS theme to see the other one. Re-run with <code>--accent=#hex</code>, <code>--logo</code>.</p>
<ul>${cards.join("\n")}</ul></body></html>`);

console.log(`\n${EMAILS.length} emails → ${OUT}/index.html  (accent ${ACCENT})`);
if (bad) {
  console.error(`${bad} problem(s) — fix them before believing what you see.`);
  process.exit(1);
}
