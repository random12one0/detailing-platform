// Render the REBUILT emails (roadmap 2.18) so the owner can look at the new
// world before the other ten are ported into it.
//
// Sibling of `render-emails.mjs`, which draws the OLD ones. Both exist on
// purpose for exactly as long as the port takes: a before and an after you can
// open side by side is the only honest way to answer "does this match the
// site". When the port lands, this file replaces that one.
//
//   node scripts/render-emails-new.mjs
//   node scripts/render-emails-new.mjs --accent=#F5D90A --out=email-new-yellow
//
// THE MONEY ASSERTION IS THE POINT, not decoration. The live invoice's column
// does not reach its own total whenever a promo or a site sale is involved
// (CLAUDE.md; DECISIONS.md → roadmap 2.18 step 1). The rebuilt one is fed
// every line INCLUDING the discounts, and this refuses to pass if they do not
// add up — so the defect cannot survive the rebuild silently.

import { mkdir, writeFile } from "node:fs/promises";
import { contrastRatio, emailDarkBrandColors } from "../supabase/functions/_shared/brandColor.js";
import { brandFrom, G } from "../supabase/functions/_shared/emailKit.ts";
import { confirmationEmail, receiptEmail } from "../supabase/functions/_shared/emailsNew.ts";

const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const ACCENT = arg("accent", "#38E08B");
const OUT = arg("out", "email-new");

// THE LOGO PATH IS RENDERED, NOT ASSUMED. `--logo` swaps in the WORST case a
// detailer can upload: dark artwork on a transparent background, which is what
// a logo made for a white website is and what most of them will be. On the
// near-black ground it would be invisible; the masthead's bone plate is what
// makes it legible, and this is the only way to see that working.
const LOGO = process.argv.includes("--logo")
  ? "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="34" viewBox="0 0 200 34">
       <text x="0" y="25" font-family="Georgia,serif" font-size="24" font-weight="bold" fill="#101418">RIDGELINE</text>
     </svg>`)
  : null;

const brand = brandFrom({
  brandName: "Ridgeline Auto Detail",
  contactPhone: "(303) 555-0142",
  siteUrl: "https://detailingplatform.com/book/demo-detail",
  logoUrl: LOGO, // null falls back to the business name set in bone
}, ACCENT);

const job = {
  customerName: "Dana Ortiz",
  dateStr: "2026-09-17",
  startTime: "10:00",
  endTime: "13:30",
  serviceType: "mobile",
  vehicleSize: "Mid-size SUV",
  vehicleModel: "2021 Subaru Outback",
  address: "1420 Larimer St, Denver, CO 80202",
  serviceNames: ["Full Interior + Exterior Detail"],
  addOnNames: ["Pet hair removal", "Engine bay clean"],
  receiptUrl: "https://detailingplatform.com/booking/7f3ab210",
};

// Same figures as the old render, so the two are comparable line for line.
//   285 + 35 + 40 + 25 + 20 = 405 charges
//   405 - 40 promo          = 365 total_price
//   365 + 30 tip            = 395 final_amount
const QUOTE_LINES = [
  { label: "Full Interior + Exterior Detail", amount: 285 },
  { label: "Pet hair removal", amount: 35 },
  { label: "Engine bay clean", amount: 40 },
  { label: "Travel — Outer ring", amount: 25 },
  { label: "Heavy soiling surcharge", amount: 20 },
  { label: "Promo FALL10", amount: 40, kind: "discount" },
];
const QUOTE_TOTAL = 365;

// THE RECEIPT CARRIES THE PROMO. This is the fix the old one is missing, shown
// rather than described: the tip is added, the discount is present, and the
// column reaches the total.
const RECEIPT_LINES = [...QUOTE_LINES, { label: "Tip", amount: 30 }];
const RECEIPT_TOTAL = 395;

const EMAILS = [
  ["confirmation", "Customer · booking confirmed",
    () => confirmationEmail(brand, job, { lines: QUOTE_LINES, total: QUOTE_TOTAL, estimate: true }, false)],
  ["request-received", "Customer · request received",
    () => confirmationEmail(brand, job, { lines: QUOTE_LINES, total: QUOTE_TOTAL, estimate: true }, true)],
  ["receipt", "Customer · receipt (paid)",
    () => receiptEmail(brand, job, RECEIPT_LINES, RECEIPT_TOTAL, { paid: true, method: "Card, on the day", ref: "7F3AB210" })],
  ["invoice", "Customer · invoice (unpaid)",
    () => receiptEmail(brand, job, RECEIPT_LINES, RECEIPT_TOTAL, { paid: false, method: null, ref: "7F3AB210" })],
];

const ROT = [["undefined", /undefined/], ["NaN", /NaN/], ["[object Object]", /\[object Object\]/], ['href=""', /href=""/]];

await mkdir(OUT, { recursive: true });
let bad = 0;
const cards = [];

for (const [file, label, render] of EMAILS) {
  const { subject, html } = render();
  for (const [name, re] of ROT) {
    if (re.test(html) || re.test(subject)) {
      console.error(`  FAIL  ${label}: rendered "${name}"`);
      bad++;
    }
  }
  await writeFile(`${OUT}/${file}.html`, html);
  cards.push(`<li><a href="${file}.html">${label}</a><div class="s">${subject.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div></li>`);
  console.log(`  ${label}\n    ${subject}`);
}

// Both money tables have to close. `sum(lines) === total`, with discounts
// carrying their own sign — which is the whole difference from the old one.
const sum = (ls) => ls.reduce((s, l) => s + (l.kind === "discount" ? -Math.abs(l.amount) : l.amount), 0);
for (const [name, lines, total] of [["quote", QUOTE_LINES, QUOTE_TOTAL], ["receipt", RECEIPT_LINES, RECEIPT_TOTAL]]) {
  if (Math.abs(sum(lines) - total) > 0.005) {
    console.error(`  FAIL  the ${name}'s lines sum to ${sum(lines)}, printed total ${total}`);
    bad++;
  }
}

// --- THE FLOORS, ON BOTH GROUNDS ------------------------------------------
//
// The old templates went eleven headlines deep at 3.01:1 on a 4.5:1 floor
// because `email-brand.test.mjs` measured the colour ENGINE and never what the
// templates DID with the answer. This is the drawing's own check: every text
// colour this design uses, on every ground it can land on, plus the tenant
// accent across the presets and the extremes.
//
// PURE #ffffff / #000000 ARE ASSERTED ABSENT, and that is a COMPATIBILITY
// rule rather than a contrast one: Apple Mail is ~60% of opens and treats
// either value as "this email has no opinion, invert it".
{
  const GROUNDS = [["ground", G.ground], ["panel", G.panel]];
  for (const [gName, g] of GROUNDS) {
    for (const t of ["bone", "bone2", "fog", "fog2"]) {
      const r = contrastRatio(G[t], g);
      if (r < 4.5) {
        console.error(`  FAIL  ${t} on ${gName} is ${r.toFixed(2)}:1, floor 4.5`);
        bad++;
      }
    }
  }
  // Twelve presets would need the app's theme.js; the four extremes are what
  // actually break, and the house green anchors the normal case.
  for (const hex of ["#38E08B", "#DC2626", "#F5D90A", "#7C3AED", "#000000", "#FFFFFF", "#0B0D0E"]) {
    const c = emailDarkBrandColors(hex);
    const checks = [
      ["accent as words on the panel", c.text, G.panel, 4.5],
      ["accent as a fill on the panel", c.fill, G.panel, 3],
      ["ink on the accent fill", c.fillInk, c.fill, 4.5],
    ];
    for (const [what, a, b, floor] of checks) {
      const r = contrastRatio(a, b);
      if (r < floor - 1e-9) {
        console.error(`  FAIL  ${hex}: ${what} is ${r.toFixed(2)}:1, floor ${floor}`);
        bad++;
      }
    }
    for (const [label, v] of [["text", c.text], ["fill", c.fill], ["ink", c.fillInk]]) {
      if (/^#(fff(fff)?|000(000)?)$/i.test(v)) {
        console.error(`  FAIL  ${hex}: ${label} is ${v} — Apple Mail inverts on a pure value`);
        bad++;
      }
    }
  }
}

await writeFile(`${OUT}/index.html`, `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Rebuilt emails — ${ACCENT}</title><style>
body{font:15px/1.6 system-ui,sans-serif;background:#0B0D0E;color:#F2F1EC;max-width:720px;margin:40px auto;padding:0 20px}
h1{font-size:20px}ul{list-style:none;padding:0}li{padding:12px 0;border-bottom:1px solid #272D31}
a{color:#38E08B;font-weight:600}.s{color:#7B858A;font-size:13px;margin-top:2px}code{color:#939CA1}
</style></head><body><h1>Rebuilt in The Thread</h1>
<p>Accent <code>${ACCENT}</code> &rarr; words <code>${brand.accent}</code>, fill <code>${brand.accentFill}</code>,
ink on fill <code>${brand.accentInk}</code>.</p><ul>${cards.join("\n")}</ul></body></html>`);

console.log(`\n${EMAILS.length} rebuilt emails → ${OUT}/index.html  (accent ${ACCENT})`);
if (bad) {
  console.error(`${bad} problem(s).`);
  process.exit(1);
}
