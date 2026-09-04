// Send the real emails to a real inbox, through the real relay.
//
// WHY THIS EXISTS AND WHY IT IS NOT OPTIONAL. `render-emails.mjs` draws every
// email and checks its colours, its money and its plain-text half — but it
// draws them in a BROWSER, and a browser is not Outlook's Word engine, not the
// Gmail app's dark-mode inversion, and not Apple Mail. Every claim in
// `docs/email-clients-2026-09-03.md` is research plus a rendering. **This is
// the step that turns "should work" into "does work"**, which is CLAUDE.md's
// standing rule and the one thing the 2.18 rebuild could not say for itself.
//
//   node scripts/send-test-emails.mjs --to=someone@example.com
//   node scripts/send-test-emails.mjs --to=... --only=receipt,quote
//
// **`--to` IS REQUIRED AND THERE IS NO DEFAULT.** This sends real mail through
// the production relay against a shared sending reputation; a script that
// mails somebody because it was run without arguments is a script that mails
// the wrong person eventually.
//
// Needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the root `.env`,
// because the relay is service-role gated. It sends through
// `functions/v1/send-email`, the SAME path every booking uses, so the `text`
// part, the From line, the Reply-To and the tenant lookup are all exercised
// rather than simulated.
//
// ONE RESEND CONSTRAINT THAT WILL BITE, and it is documented in DECISIONS.md
// ("Phase 0 — 0.2 email"): the platform and the live business share one Resend
// account, whose verified sender is `bookings@email.detailingplatform.com`.
// Sending is fine, but **these sends accumulate against the same reputation as
// Andrew's Auto Detail's real customer mail.** Send a handful to check a
// rendering; do not loop.

import { readFile } from "node:fs/promises";
import { emailDarkBrandColors } from "../supabase/functions/_shared/brandColor.js";
import * as T from "../supabase/functions/_shared/emailTemplates.ts";

const arg = (n) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : null;
};

const TO = arg("to");
if (!TO || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(TO)) {
  console.error("Usage: node scripts/send-test-emails.mjs --to=you@example.com [--only=a,b]");
  process.exit(1);
}

// Read the root .env rather than requiring the caller to export it — every
// other credentialled script in this repo is run the same way.
const env = Object.fromEntries(
  (await readFile(new URL("../.env", import.meta.url), "utf8"))
    .split("\n").filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL;

// `SUPABASE_SECRET_KEY` FIRST, AND THAT ORDER IS THE WHOLE POINT.
//
// The relay compares the caller's bearer token against the
// `SUPABASE_SERVICE_ROLE_KEY` **that Supabase injects into the function's own
// environment** — and this project has migrated to the new key format, so what
// the platform injects is the `sb_secret_…` key, NOT the legacy JWT that still
// sits in the root `.env` under the old name. Sending the legacy key returns a
// flat `401 Unauthorized`, which reads exactly like a broken relay or a revoked
// key and sent the first run of this script down the wrong path entirely.
// Measured 2026-09-03: legacy JWT → 401, `sb_secret_…` → 400 "…are required",
// i.e. past the auth gate.
//
// The legacy key stays as a fallback because a project that has NOT migrated
// still injects the JWT, and this script should work against either.
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY");
  process.exit(1);
}

// The seeded demo tenant. Its name is what appears in the From line, so the
// inbox shows what a real customer of a real tenant would see.
const BUSINESS_ID = "584da3a6-a796-4b72-8ae2-015f951adb95";

const c = emailDarkBrandColors("#38E08B");
const brand = {
  brandName: "Coastline Auto Detailing",
  contactEmail: null,
  contactPhone: "(303) 555-0142",
  siteUrl: "https://detailingplatform.com/book/demo-detail",
  logoUrl: null,
  accent: c.text,
  accentFill: c.fill,
  accentInk: c.fillInk,
  dropoffAddress: "2200 Blake St, Denver, CO 80205",
  googleReviewUrl: "https://g.page/r/example/review",
  yelpReviewUrl: "https://www.yelp.com/biz/example",
};

const booking = {
  id: "7f3ab210-55c1-4e0a-9d2e-31b6c4a90e77",
  customerName: "Dana Ortiz",
  customerPhone: "(720) 555-0188",
  customerEmail: TO,
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

// The invoice's rows are `total_price` + the finalize lines — `final_amount`'s
// own definition, which is the whole point of the 2.18 simplification.
const invoiceRows = [
  { label: "Booking total", qty: 1, lineTotal: 345, kind: "charge" },
  { label: "Tip", qty: 1, lineTotal: 30, kind: "tip" },
  { label: "Discount: Loyal customer", qty: 1, lineTotal: -15, kind: "discount" },
];
const invoiceTotals = { chargesSubtotal: 345, discountsTotal: -15, tipTotal: 30, totalPaid: 360 };

// FOUR, NOT SEVENTEEN. Each one is a different SHAPE — the mark-and-facts
// layout, the money column, the single-figure layout, and the owner's
// decide-now layout. Sending all of them buries the differences in an inbox
// and spends sending reputation on duplicates.
const ALL = {
  confirmation: ["Customer · booking confirmed", () => T.customerConfirmationEmail(brand, booking, false)],
  receipt: ["Customer · receipt", () => T.invoiceEmail(brand, booking, invoiceRows, invoiceTotals, "paid", "Paid by card on the day.")],
  quote: ["Customer · quote offered", () => T.requestDecisionEmail(brand, booking, "quote", { manageUrl: booking.receiptUrl, quotedAmount: 395, quotedNote: "The pet hair on this one is a bigger job than the photos suggested." })],
  owner: ["Owner · new request waiting", () => T.ownerNewBookingEmail(brand, booking, true)],
};

const only = arg("only");
const picked = only ? only.split(",").map((s) => s.trim()).filter((k) => ALL[k]) : Object.keys(ALL);
if (picked.length === 0) {
  console.error(`--only matched nothing. Known: ${Object.keys(ALL).join(", ")}`);
  process.exit(1);
}

console.log(`Sending ${picked.length} to ${TO} via ${SUPABASE_URL}\n`);
let failed = 0;

for (const key of picked) {
  const [label, render] = ALL[key];
  const { subject, html, text } = render();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ business_id: BUSINESS_ID, to: TO, subject, body: html, text }),
  });
  const out = await res.json().catch(() => ({}));
  const ok = res.ok && !out.error && !out.skipped;
  if (!ok) failed++;
  console.log(`  ${ok ? "sent" : "FAILED"}  ${label}`);
  console.log(`         ${subject}`);
  // `skipped` is the relay declining on purpose — an undeliverable domain, or
  // no provider key. It is not an error, and it is not a send either; saying
  // "sent" for it is how a broken pipeline looks healthy.
  if (out.skipped) console.log(`         skipped: ${out.skipped}`);
  if (out.error) console.log(`         error: ${out.error}`);
}

console.log(failed ? `\n${failed} failed.` : `\nAll sent. Open them in Gmail AND in Apple Mail, in light and dark.`);
if (failed) process.exit(1);
