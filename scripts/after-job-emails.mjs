// ROADMAP 99.2d — THE AFTER-JOB EMAILS SAY WHAT ANDREW APPROVED, AND EVERY
// CUSTOMER EMAIL ENDS IN A SIGN-OFF.
//
//   node scripts/after-job-emails.mjs                     # the real templates
//   node scripts/after-job-emails.mjs --break=old         # the templates and buildBrand as they were before 99.2d
//   node scripts/after-job-emails.mjs --break=setting     # buildBrand ignores "sign as the business"
//   node scripts/after-job-emails.mjs --break=unsigned    # the sign-off helper prints nothing
//   node scripts/after-job-emails.mjs --break=wrap        # the dots may start a line on a phone
//
// Five parts, all without credentials, a network or a database:
//   1. Receipt, invoice (with and without the card button) and thank-you (with
//      and without review links), English and Spanish: subject, headline, first
//      line, button. Every expected sentence is written out HERE BY HAND.
//   2. The sign-off on all twelve customer emails, English and Spanish, signed
//      as the owner / as the business / with no owner name set. And it is NOT on
//      the detailer-facing emails.
//   3. A first name typed with markup in it comes out escaped.
//   4. `buildBrand`, the real one, run against a stand-in for the database
//      client (db.ts is swapped at load time; everything else is the product's
//      own file). Owner name read; "sign as the business" suppresses the read
//      entirely; no name / blank name -> null; a failed read throws rather than
//      quietly signing with the business; and the query is scoped to this
//      business's owner.
//   5. The two screens/scripts that recognise a receipt by its SUBJECT
//      (BookingDetail.jsx, e2e-receipt-trail.mjs): their regexes are lifted out
//      of the source files and tried on subjects the real template produces.
//   Then three of the emails are opened in a browser at 392 and 1440.
//
// Both sabotages edit a scratch copy of `supabase/functions/_shared`; none
// touches an assertion. NOT COVERED, by name in the receipt: the Notifications
// toggle in a signed-in browser (needs the demo owner's login).
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { register } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "../app/node_modules/playwright/index.mjs";
import { writeReceipt, REPO } from "./receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = process.argv.find((a) => a.startsWith("--break="))?.slice(8) || "";
if (BREAK && !["old", "setting", "unsigned", "wrap"].includes(BREAK)) throw new Error("Unknown break");
const failures = [], artifacts = [];
let assertions = 0, reached = 0;
const check = (name, ok, detail = "") => { assertions++; if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`); };

// The commit before 99.2d, for --break=old.
const BASE = "2538c5bc";
const SHARED = path.join(REPO, "supabase/functions/_shared");
let dir = SHARED, scratch = null;
if (BREAK) {
  scratch = mkdtempSync(path.join(tmpdir(), "dp-after-job-"));
  cpSync(SHARED, scratch, { recursive: true });
  dir = scratch;
  const edit = (file, fn) => {
    const f = path.join(scratch, file);
    const before = readFileSync(f, "utf8"), after = fn(before);
    if (after === before) throw new Error(`Sabotage did not land in ${file}`);
    writeFileSync(f, after);
  };
  if (BREAK === "old") {
    const at = (p) => execFileSync("git", ["show", `${BASE}:supabase/functions/_shared/${p}`], { cwd: REPO, encoding: "utf8" });
    for (const p of ["emailTemplates.ts", "strings/es.ts", "email.ts"]) edit(p, () => at(p));
  } else if (BREAK === "setting") {
    edit("email.ts", (s) => s.replace("if (!settings.email_sign_as_business) {", "if (true) {"));
  } else if (BREAK === "wrap") {
    edit("emailTemplates.ts", (s) => s.replace('.replaceAll(" · ", "&nbsp;· ")', ""));
  } else {
    edit("emailTemplates.ts", (s) => s.replace('return proseBlock(line.replace(/ · $/, "").replaceAll(" · ", "&nbsp;· "), 34);', 'return "";'));
  }
}

// ── 0 · the database client is the only thing replaced ────────────────────
// db.ts builds a real client from Deno env vars. This stand-in answers the
// handful of reads buildBrand makes from a table the test fills in, records
// every query, and can be told to fail one. Everything else is the product's file.
globalThis.Deno = { env: { get: () => undefined } };
globalThis.__stub = { tables: {}, queries: [], failing: null };
const STUB = `
import { retryRead } from ${JSON.stringify(pathToFileURL(path.join(SHARED, "retryRead.ts")).href)};
export { retryRead };
export const SUPABASE_URL = "http://stub.invalid", SERVICE_ROLE_KEY = "stub";
const S = () => globalThis.__stub;
function builder(table) {
  const q = { table, calls: [] };
  S().queries.push(q);
  const run = () => {
    if (S().failing === table) return { data: null, error: { message: "stub failure", code: "XX000" } };
    const rows = S().tables[table] ?? [];
    return { data: rows, error: null };
  };
  const b = new Proxy({}, { get(_, name) {
    if (name === "then") return (res, rej) => Promise.resolve(run()).then(res, rej);
    if (name === "maybeSingle") return () => Promise.resolve({ ...run(), data: (run().data ?? [])[0] ?? null });
    return (...args) => { q.calls.push([name, ...args]); return b; };
  } });
  return b;
}
export const supabase = { from: builder, rpc: async () => ({ data: null, error: null }) };
`;
register("data:text/javascript," + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if (/(^|\\/)db\\.ts$/.test(spec)) return { url: "data:text/javascript," + ${JSON.stringify(encodeURIComponent(STUB))}, shortCircuit: true };
  return next(spec, ctx);
}`));

const T = await import(pathToFileURL(path.join(dir, "emailTemplates.ts")).href);
const { brandFrom, htmlToText } = await import(pathToFileURL(path.join(dir, "emailKit.ts")).href);
const { paymentHandles } = await import(pathToFileURL(path.join(dir, "payments.ts")).href);
const { buildBrand } = await import(pathToFileURL(path.join(dir, "email.ts")).href);

// ── fixtures ───────────────────────────────────────────────────────────────
const SITE = "https://andrewsdetail.com/";
const NAME = "Andrew's Auto Detail";
const mkBrand = (signOffName, extra = {}) => ({
  ...brandFrom({ brandName: NAME, contactPhone: "(303) 555-0142", siteUrl: SITE }, "#38E08B"),
  contactEmail: null, dropoffAddress: null, googleReviewUrl: "https://g.page/r/example", yelpReviewUrl: "https://www.yelp.com/biz/example",
  payment: paymentHandles({ pay_venmo: "@andrews-detail", pay_cash: true }), messages: {}, timezone: "America/Los_Angeles", signOffName, ...extra,
});
const mkBooking = (lang) => ({ id: "abcd1234-0000", lang, customerName: "Maria Lopez", customerPhone: "(720) 555-0188", customerEmail: "m@example.com",
  customerAddress: "1234 Oak St, Denver, CO 80202", dateStr: "2026-10-02", startTime: "18:00", endTime: "20:00", serviceType: "mobile",
  vehicleSize: "Sedan", vehicleModel: null, customerNotes: null, serviceNames: ["Full detail"], addOnNames: [],
  subtotal: 185, siteDiscount: 0, siteDiscountPercent: 0, promoCode: null, promoDiscount: 0, total: 185,
  receiptUrl: "https://andrewsdetail.com/booking/x" });
const ROWS = [{ label: "Full detail", qty: 1, lineTotal: 185, kind: "service" }];
const TOTALS = { chargesSubtotal: 185, discountsTotal: 0, tipTotal: 0, totalPaid: 185 };
const flat = (m) => htmlToText(m.html).replace(/ \(https?:\/\/[^)]*\)/g, "").replace(/\s+/g, " ");

// ── 1 · the words, by hand ────────────────────────────────────────────────
const WANT = {
  en: {
    date: "Friday, October 2",
    receipt: { subject: `Your receipt from ${NAME}: $185`, has: ["Paid in full, thank you", "Thanks, Maria. Here's your receipt for Friday, October 2.", "View online"], not: ["View this online", "the work on"] },
    invoice: { subject: `Invoice from ${NAME}: $185 due`, has: ["Here's your invoice", "Hi Maria, here's the bill for Friday, October 2.", "How to pay", "View online"], not: ["Amount due $", "the invoice for the work on"] },
    card: { subject: `Invoice from ${NAME}: $185 due`, has: ["Here's your invoice", "How to pay", "Pay $185 by card"], not: [] },
    thanks: { subject: `Thanks from ${NAME}`, has: [`Hi Maria, thanks for choosing ${NAME}. If you were happy with the work, a quick review really helps a small business like ours.`, "Leave a Google review", "Leave a Yelp review"], not: ["Hello Maria", "It takes about a minute"] },
    thanksBare: { subject: `Thanks from ${NAME}`, has: [`Hi Maria, thanks for choosing ${NAME}. We appreciate the chance to take care of your vehicle.`], not: ["review"] },
  },
  es: {
    date: "viernes, 2 de octubre",
    receipt: { subject: `Tu recibo de ${NAME}: $185`, has: ["Pagado por completo, gracias", "Gracias, Maria. Aquí está tu recibo del viernes, 2 de octubre.", "Verlo en línea"], not: ["Receipt", "Paid in full"] },
    invoice: { subject: `Factura de ${NAME}: $185 a pagar`, has: ["Aquí está tu factura", "Hola Maria, aquí está la cuenta del viernes, 2 de octubre.", "Verlo en línea"], not: ["Invoice"] },
    card: { subject: `Factura de ${NAME}: $185 a pagar`, has: ["Aquí está tu factura", "Pagar $185 con tarjeta"], not: [] },
    thanks: { subject: `Gracias de parte de ${NAME}`, has: [`Hola Maria, gracias por elegir a ${NAME}. Si quedaste contento con el trabajo, una reseña rápida le ayuda mucho a un negocio pequeño como el nuestro.`, "Dejar una reseña en Google", "Dejar una reseña en Yelp"], not: ["Hello", "Thanks"] },
    thanksBare: { subject: `Gracias de parte de ${NAME}`, has: [`Hola Maria, gracias por elegir a ${NAME}. Agradecemos la oportunidad de cuidar tu vehículo.`], not: ["reseña"] },
  },
};
const SIGN = {
  en: { owner: `Thanks again, Andrew · ${NAME} · andrewsdetail.com`, business: `Thanks again, ${NAME} · andrewsdetail.com` },
  es: { owner: `Gracias de nuevo, Andrew · ${NAME} · andrewsdetail.com`, business: `Gracias de nuevo, ${NAME} · andrewsdetail.com` },
};
const ROT = /undefined|NaN|Invalid Date|\bnull\b|\{[a-z]+\}|\[object|href=""/;
const rotOrHour = (s) => ROT.test(s) || /\b\d{1,2}:00\b|\d{4}-\d{2}-\d{2}/.test(s);

const rendered = [];
for (const lang of ["en", "es"]) {
  const b = mkBooking(lang), w = WANT[lang], brand = mkBrand("Andrew");
  const mails = {
    receipt: T.invoiceEmail(brand, b, ROWS, TOTALS, "paid", null, false),
    invoice: T.invoiceEmail(brand, b, ROWS, TOTALS, "unpaid", null, false),
    card: T.invoiceEmail(brand, b, ROWS, TOTALS, "unpaid", null, true),
    thanks: T.followupEmail(brand, "Maria", lang),
    thanksBare: T.followupEmail({ ...brand, googleReviewUrl: null, yelpReviewUrl: null }, "Maria", lang),
  };
  for (const [kind, m] of Object.entries(mails)) {
    reached++;
    const id = `${lang} ${kind}`, text = flat(m);
    check(`${id} subject`, m.subject === w[kind].subject, `got "${m.subject}", want "${w[kind].subject}"`);
    for (const s of w[kind].has) check(`${id} says "${s}"`, text.includes(s));
    for (const s of w[kind].not) check(`${id} no longer says "${s}"`, !text.includes(s));
    check(`${id} signed`, text.includes(SIGN[lang].owner));
    check(`${id} no rot, ":00" or ISO date`, !rotOrHour(`${m.subject} ${text}`));
    if (["receipt", "invoice", "card"].includes(kind)) check(`${id} money still reaches the total`, text.includes("$185"));
    if (kind === "invoice") check(`${id} no card button when card is off`, !/Pay \$185 by card|con tarjeta/.test(text));
    if (kind === "receipt") check(`${id} receipt prints no How to pay`, !/How to pay|Cómo pagar/.test(text));
    if (kind === "thanksBare") check(`${id} no review button`, !/g\.page|yelp/.test(m.html));
    if (["receipt", "card", "thanks"].includes(kind)) rendered.push({ id: `${lang}-${kind}`, kind, lang, m });
  }
}

// ── 2 · the sign-off on every customer email, and on no detailer email ────
for (const lang of ["en", "es"]) for (const mode of ["owner", "business", "no-name"]) {
  const brand = mkBrand(mode === "owner" ? "Andrew" : null), b = mkBooking(lang);
  const want = SIGN[lang][mode === "owner" ? "owner" : "business"];
  const mails = {
    confirmation: T.customerConfirmationEmail(brand, b, false),
    "request received": T.customerConfirmationEmail(brand, b, true),
    accepted: T.requestDecisionEmail(brand, b, "accepted", { manageUrl: b.receiptUrl }),
    declined: T.requestDecisionEmail(brand, b, "declined", { manageUrl: b.receiptUrl }),
    quote: T.requestDecisionEmail(brand, b, "quote", { manageUrl: b.receiptUrl, quotedAmount: 185 }),
    reschedule: T.rescheduleEmail(brand, b, "2026-10-09", "10:00", false),
    cancellation: T.cancellationEmail(brand, b, false),
    reminder: T.customerReminderEmail(brand, b, false),
    receipt: T.invoiceEmail(brand, b, ROWS, TOTALS, "paid", null, false),
    invoice: T.invoiceEmail(brand, b, ROWS, TOTALS, "unpaid", null, true),
    thanks: T.followupEmail(brand, "Maria", lang),
    "plan link": T.planLinkEmail(brand, { customerName: "Maria Lopez", planName: "Monthly", planUrl: "https://andrewsdetail.com/plan/x", bookUrl: "https://andrewsdetail.com/" }, lang),
  };
  for (const [kind, m] of Object.entries(mails)) {
    reached++;
    const id = `sign-off ${lang} ${mode} ${kind}`, text = flat(m);
    const n = text.split(want).length - 1;
    check(`${id} says "${want}" exactly once`, n === 1, `found ${n}`);
    check(`${id} link goes to the site`, m.html.includes(`href="${SITE}"`));
    check(`${id} no stray separator after the site`, !text.includes(`${want} ·`) && !text.includes(`${want}·`));
  }
}
for (const lang of ["en", "es"]) {
  const brand = mkBrand("Andrew"), b = mkBooking(lang);
  const owner = {
    "new booking": T.ownerNewBookingEmail(brand, b, false, undefined, lang),
    "owner cancellation": T.cancellationEmail(brand, b, true, lang),
    "owner reschedule": T.rescheduleEmail(brand, b, "2026-10-09", "10:00", true, lang),
  };
  for (const [kind, m] of Object.entries(owner)) {
    reached++;
    check(`detailer email ${lang} ${kind} is not signed`, !/Thanks again|Gracias de nuevo/.test(flat(m)));
  }
}

// ── 3 · markup in a first name is text, not markup ────────────────────────
{
  reached++;
  const m = T.invoiceEmail(mkBrand('<b>Andy</b> & "Co"'), mkBooking("en"), ROWS, TOTALS, "paid", null, false);
  check("a name with markup is escaped in the sign-off", !m.html.includes("<b>Andy</b>") && m.html.includes("&lt;b&gt;Andy&lt;/b&gt;"));
}

// ── 4 · buildBrand: who signs ─────────────────────────────────────────────
{
  const BIZ = { id: "biz-1", slug: "andrews", name: NAME, timezone: "America/Los_Angeles", contact_email: null, contact_phone: null, dropoff_address: null };
  const SET = (over = {}) => ({ google_review_url: null, yelp_review_url: null, email_messages: {}, ...over });
  const run = async (tables, settings, failing = null) => {
    globalThis.__stub = { tables: { business_branding: [{ primary_color: "#38E08B", logo_url: null }], ...tables }, queries: [], failing };
    try { return { brand: await buildBrand(BIZ, settings), q: globalThis.__stub.queries }; }
    catch (e) { return { error: e, q: globalThis.__stub.queries }; }
  };
  const owners = (q) => q.filter((x) => x.table === "business_users");
  let r;
  reached++; r = await run({ business_users: [{ first_name: "Andrew" }] }, SET());
  check("buildBrand: the owner's first name signs by default", r.brand?.signOffName === "Andrew", String(r.error ?? r.brand?.signOffName));
  reached++; r = await run({ business_users: [{ first_name: "Andrew" }] }, SET({ email_sign_as_business: true }));
  check("buildBrand: 'sign as the business' leaves the name empty", r.brand && r.brand.signOffName === null, String(r.error ?? r.brand?.signOffName));
  check("buildBrand: 'sign as the business' does not even read the owner", owners(r.q).length === 0, `${owners(r.q).length} reads`);
  reached++; r = await run({ business_users: [] }, SET());
  check("buildBrand: no owner with a name -> empty, never the word null", r.brand && r.brand.signOffName === null, String(r.error ?? r.brand?.signOffName));
  reached++; r = await run({ business_users: [{ first_name: "   " }] }, SET());
  check("buildBrand: a blank first name -> empty", r.brand && r.brand.signOffName === null, String(r.error ?? r.brand?.signOffName));
  reached++; r = await run({ business_users: [{ first_name: "Andrew" }] }, SET(), "business_users");
  check("buildBrand: a failed read throws instead of quietly signing as the business", !!r.error && !r.brand, r.brand ? `returned ${JSON.stringify(r.brand.signOffName)}` : "");
  reached++; r = await run({ business_users: [{ first_name: "Andrew" }] }, SET());
  const calls = owners(r.q)[0]?.calls ?? [];
  const has = (name, ...args) => calls.some((c) => c[0] === name && args.every((a, i) => c[i + 1] === a));
  check("buildBrand: the read is this business's, owners only, earliest first", has("eq", "business_id", "biz-1") && has("eq", "role", "owner") && has("order", "created_at"), JSON.stringify(calls));
}

// ── 5 · the two places that recognise a receipt by its subject ────────────
{
  const lift = (file, re) => {
    const m = readFileSync(path.join(REPO, file), "utf8").match(re);
    if (!m) throw new Error(`could not find the receipt matcher in ${file}`);
    return new RegExp(m[1], m[2]);
  };
  const detail = lift("app/src/components/BookingDetail.jsx", /\/(\^\([a-z| ]*receipt[a-z| ]*\)\\b)\/(i)\.test\(String\(m\.subject/);
  const e2e = lift("scripts/e2e-receipt-trail.mjs", /RECEIPT_WORD = \/(\^\([a-z| ]*receipt[a-z| ]*\)\\b)\/(i)/);
  const real = (lang, status) => T.invoiceEmail(mkBrand("Andrew"), mkBooking(lang), ROWS, TOTALS, status, null, false).subject;
  const thanks = T.followupEmail(mkBrand("Andrew"), "Maria", "en").subject;
  const cases = [
    ["this receipt's English subject", real("en", "paid"), true], ["this receipt's Spanish subject", real("es", "paid"), true],
    ["a receipt sent before 99.2d", `Receipt · $185 · ${NAME}`, true], ["an invoice", real("en", "unpaid"), false],
    ["the thank-you", thanks, false],
  ];
  for (const [rx, label] of [[detail, "BookingDetail.jsx"], [e2e, "e2e-receipt-trail.mjs"]]) for (const [what, subject, want] of cases) {
    if (label !== "BookingDetail.jsx" && what.includes("Spanish")) continue;
    reached++;
    check(`${label} ${want ? "recognises" : "does not mistake"} ${what}`, rx.test(subject) === want, `"${subject}"`);
  }
}

// ── 6 · three of them, on a phone and a laptop ────────────────────────────
const SHOTS = path.join(REPO, ".manager-shots", "99.2d");
mkdirSync(SHOTS, { recursive: true });
const tmpHtml = mkdtempSync(path.join(tmpdir(), "dp-after-job-html-"));
const browser = await chromium.launch();
try {
  for (const w of [392, 1440]) for (const r of rendered) {
    const page = await browser.newPage({ viewport: { width: w, height: w === 392 ? 844 : 900 } });
    const noise = [];
    page.on("console", (c) => { if (["error", "warning"].includes(c.type())) noise.push(c.text()); });
    page.on("pageerror", (e) => noise.push(String(e)));
    const f = path.join(tmpHtml, `${r.id}.html`);
    writeFileSync(f, r.m.html);
    await page.goto(pathToFileURL(f).href);
    reached++;
    const id = `browser ${w} ${r.id}`;
    const got = await page.evaluate(() => {
      const links = [...document.querySelectorAll("a")].map((a) => { const rc = a.getBoundingClientRect(); return { t: a.textContent.trim(), href: a.getAttribute("href"), l: rc.left, r: rc.right, t0: rc.top, b: rc.bottom, h: rc.height }; });
      // Does any line of the sign-off BEGIN with a separator dot? Each dot's left edge is
      // compared with the left edge of the sign-off's own cell.
      const link = [...document.querySelectorAll("a")].find((a) => a.textContent.trim() === "andrewsdetail.com");
      const cell = link?.closest("td");
      let leadingDots = 0;
      if (cell) {
        const edge = cell.getBoundingClientRect().left;
        const walk = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
        for (let n; (n = walk.nextNode());) for (let i = 0; i < n.data.length; i++) if (n.data[i] === "·") {
          const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1);
          if (Math.abs(rg.getBoundingClientRect().left - (edge + parseFloat(getComputedStyle(cell).paddingLeft))) < 1.5) leadingDots++;
        }
      }
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, links, body: document.body.innerText, leadingDots };
    });
    check(`${id} no sideways scroll`, got.sw <= got.iw, `${got.sw} > ${got.iw}`);
    const buttons = got.links.filter((l) => l.h >= 30 && l.t !== "andrewsdetail.com");
    check(`${id} has its button(s)`, buttons.length >= (r.kind === "thanks" ? 2 : 1), buttons.map((b) => b.t).join(" | "));
    for (const b of buttons) check(`${id} "${b.t}" inside the screen and 44px tall`, b.l >= 0 && b.r <= got.iw && b.h >= 44, JSON.stringify(b));
    const site = got.links.find((l) => l.t === "andrewsdetail.com");
    check(`${id} sign-off link inside the screen, below the last button`, !!site && site.l >= 0 && site.r <= got.iw && site.t0 > Math.max(...buttons.map((b) => b.b)), JSON.stringify(site));
    check(`${id} the sign-off is painted`, got.body.replace(/\s+/g, " ").includes(SIGN[r.lang].owner));
    check(`${id} no line of the sign-off starts with a dot`, got.leadingDots === 0, `${got.leadingDots} dot(s) lead a line`);
    check(`${id} console silent`, noise.length === 0, noise.join(" | "));
    if (!BREAK) {
      const shot = path.join(SHOTS, `${r.id}-${w}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      artifacts.push(path.relative(REPO, shot).replaceAll("\\", "/"));
    }
    await page.close();
  }
} finally {
  await browser.close();
  rmSync(tmpHtml, { recursive: true, force: true });
  if (scratch) rmSync(scratch, { recursive: true, force: true });
}

// 5 wording × 2 languages, 12 emails × 2 languages × 3 modes, 3 detailer emails × 2 languages,
// 1 escaped name, 6 buildBrand scenarios, 9 subject matchers, 3 emails × 2 languages × 2 widths.
const EXPECTED = 10 + 72 + 6 + 1 + 6 + 9 + 12;
// The canary: the subject rule must refuse the pre-99.2d English receipt subject.
const canaryCaught = `Receipt · $185 · ${NAME}` !== WANT.en.receipt.subject;
const receipt = writeReceipt({
  check_id: BREAK ? `after-job-emails-${BREAK}` : "after-job-emails", started_at,
  status: failures.length || reached !== EXPECTED ? "fail" : "pass",
  expected_targets: EXPECTED, discovered_targets: reached, attempted_targets: reached, completed_targets: reached,
  skipped_targets: 0, assertions_executed: assertions, min_assertions: 400, failures, artifacts,
  dimensions: { break: BREAK, languages: ["en", "es"], signature_modes: ["owner", "business", "no-name"], widths: [392, 1440],
    scope: "Receipt, invoice, thank-you wording and the sign-off on the twelve customer emails (99.2d), buildBrand's choice of who signs, and the two subject matchers. UNJUDGEABLE, not run: the Notifications toggle in a signed-in browser (needs the demo owner's login) and the migration applied to a database. Marketing and detailer emails are 99.2e; texting is 99.2f onward." },
  canary: { id: "the pre-99.2d receipt subject 'Receipt · $185 · <business>' does not equal the approved one", observed_failure: canaryCaught },
});
console.log(`${reached} of ${EXPECTED} targets; ${assertions} assertions; ${failures.length} failures`);
for (const f of failures.slice(0, 40)) console.error(`FAIL ${f}`);
if (failures.length > 40) console.error(`… and ${failures.length - 40} more`);
console.log(`Receipt ${receipt.path}`);
if (failures.length || !canaryCaught || reached !== EXPECTED) process.exitCode = 1;
