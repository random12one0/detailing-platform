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
import { contrastRatio, emailDarkBrandColors } from "../supabase/functions/_shared/brandColor.js";
import { G, htmlToText } from "../supabase/functions/_shared/emailKit.ts";
import * as T from "../supabase/functions/_shared/emailTemplates.ts";

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

const c = emailDarkBrandColors(ACCENT);
const brand = {
  brandName: "Ridgeline Auto Detail",
  contactEmail: "hello@ridgelinedetail.example",
  contactPhone: "(303) 555-0142",
  siteUrl: "https://detailingplatform.com/book/demo-detail",
  logoUrl: LOGO,
  accent: c.text,
  accentFill: c.fill,
  accentInk: c.fillInk,
  dropoffAddress: "2200 Blake St, Denver, CO 80205",
  googleReviewUrl: "https://g.page/r/example/review",
  yelpReviewUrl: "https://www.yelp.com/biz/example",
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

// BUILT THE WAY `send-invoice/index.ts` BUILDS IT — services, add-ons, travel
// and `price_adjustments` as charges, then the finalize line items, then the
// promo. **The site sale is deliberately absent**, because its AMOUNT is not
// stored on the booking row; `reconcile` is what draws it, and this fixture
// exists partly to prove that.
const invoiceRows = [
  { label: "Full Interior + Exterior Detail", qty: 1, lineTotal: 285, kind: "charge" },
  { label: "Add-on: Pet hair removal", qty: 1, lineTotal: 35, kind: "charge" },
  { label: "Add-on: Engine bay clean", qty: 1, lineTotal: 40, kind: "charge" },
  { label: "Travel — Outer ring", qty: 1, lineTotal: 25, kind: "charge" },
  { label: "Heavy soiling surcharge", qty: 1, lineTotal: 20, kind: "charge" },
  { label: "Tip", qty: 1, lineTotal: 30, kind: "tip" },
  { label: "Promo FALL10", qty: 1, lineTotal: -40, kind: "discount" },
];
const invoiceTotals = {
  chargesSubtotal: 405,
  discountsTotal: -40,
  tipTotal: 30,
  totalPaid: 375, // final_amount
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
  ["staff-invite", "Staff · team invite", () => T.inviteEmail(brand, { role: "staff", link: "https://detailingplatform.com/invite/abc123", expiresAt: "2026-09-10T00:00:00Z" })],
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

// --- THE FLOORS, ON BOTH GROUNDS ------------------------------------------
{
  for (const [gName, g] of [["ground", G.ground], ["panel", G.panel]]) {
    for (const t of ["bone", "bone2", "fog", "fog2"]) {
      const r = contrastRatio(G[t], g);
      if (r < 4.5) {
        console.error(`  FAIL  ${t} on ${gName} is ${r.toFixed(2)}:1, floor 4.5`);
        bad++;
      }
    }
  }
  for (const hex of ["#38E08B", "#DC2626", "#F5D90A", "#7C3AED", "#000000", "#FFFFFF", "#0B0D0E"]) {
    const k = emailDarkBrandColors(hex);
    for (const [what, a, b, floor] of [
      ["accent as words on the panel", k.text, G.panel, 4.5],
      ["accent as a fill on the panel", k.fill, G.panel, 3],
      ["ink on the accent fill", k.fillInk, k.fill, 4.5],
    ]) {
      const r = contrastRatio(a, b);
      if (r < floor - 1e-9) {
        console.error(`  FAIL  ${hex}: ${what} is ${r.toFixed(2)}:1, floor ${floor}`);
        bad++;
      }
    }
    for (const [label, v] of [["text", k.text], ["fill", k.fill], ["ink", k.fillInk]]) {
      if (/^#(fff(fff)?|000(000)?)$/i.test(v)) {
        console.error(`  FAIL  ${hex}: ${label} is ${v} — Apple Mail inverts on a pure value`);
        bad++;
      }
    }
  }
}

await writeFile(`${OUT}/index.html`, `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Emails — ${ACCENT}</title><style>
body{font:15px/1.6 system-ui,sans-serif;background:#0B0D0E;color:#F2F1EC;max-width:760px;margin:40px auto;padding:0 20px}
h1{font-size:20px}ul{list-style:none;padding:0}li{padding:12px 0;border-bottom:1px solid #272D31}
a{color:${c.text};font-weight:600}.t{font-weight:400;font-size:12px;color:#7B858A;margin-left:8px}
.s{color:#7B858A;font-size:13px;margin-top:2px}code{color:#939CA1}
</style></head><body><h1>Every email this product sends</h1>
<p>Tenant accent <code>${ACCENT}</code> &rarr; words <code>${c.text}</code>, fill <code>${c.fill}</code>,
ink on fill <code>${c.fillInk}</code>. Re-run with <code>--accent=#hex</code>, <code>--logo</code>.</p>
<ul>${cards.join("\n")}</ul></body></html>`);

console.log(`\n${EMAILS.length} emails → ${OUT}/index.html  (accent ${ACCENT})`);
if (bad) {
  console.error(`${bad} problem(s) — fix them before believing what you see.`);
  process.exit(1);
}
