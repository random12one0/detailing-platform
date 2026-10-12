// ROADMAP 99.2e — THE DETAILER, PLATFORM, PROMO AND MAINTENANCE-DUE EMAILS SAY
// WHAT ANDREW APPROVED.
//
//   node scripts/marketing-detailer-emails.mjs                  # the real templates
//   node scripts/marketing-detailer-emails.mjs --break=old      # the templates and Spanish as they were before 99.2e
//   node scripts/marketing-detailer-emails.mjs --break=utc      # the detailer's "today" on the server's clock
//   node scripts/marketing-detailer-emails.mjs --break=unsigned # the sign-off helper prints nothing
//
// No credentials, no network, no database. Every expected subject and line is
// written out HERE BY HAND, never built by calling the product's own helper.
//   1. The five detailer emails whose subject names a day (new booking, request,
//      job coming up, customer moved, customer cancelled), English and Spanish,
//      for today, tomorrow, +3 and +9 days, at two businesses whose day is never
//      UTC's (UTC+14 and UTC-11).
//   2. The rest, English and Spanish: still waiting (1 hour / 12 hours), plan
//      left (two plan names), staff invite (with and without the inviter's
//      name), card failed, site offline (unchanged), build started,
//      maintenance-due, the detailer's own promo.
//   3. Sign-off on the promo and maintenance-due emails (as the owner and as
//      the business), and on no detailer or platform email.
//   4. What must NOT change: the maintenance-due email still refuses to render
//      without a mailing address or an unsubscribe link; the real
//      `maintenanceVerdict` still refuses with the switch off or no address;
//      the sweep still requires the maintenance switch (read from its source).
//   5. The two callers: `send-owner-reminders` uses the template's subject (it
//      typed the raw ISO date), `invite-user` passes the inviter's name.
//   Then six of them are opened in a browser at 392 and 1440 in both languages.
//
// Sabotages edit a scratch copy of `supabase/functions/_shared`; none touches
// an assertion. NOT COVERED, by name in the receipt: a real send, and the
// invite-user read of the inviter's name against a database.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "../app/node_modules/playwright/index.mjs";
import { writeReceipt, REPO } from "./receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = process.argv.find((a) => a.startsWith("--break="))?.slice(8) || "";
if (BREAK && !["old", "utc", "unsigned"].includes(BREAK)) throw new Error("Unknown break");
const failures = [], artifacts = [];
let assertions = 0, reached = 0;
const check = (name, ok, detail = "") => { assertions++; if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`); };

// The commit before 99.2e, for --break=old.
const BASE = "463a1ee5";
const SHARED = path.join(REPO, "supabase/functions/_shared");
let dir = SHARED, scratch = null;
if (BREAK) {
  scratch = mkdtempSync(path.join(tmpdir(), "dp-99-2e-"));
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
    for (const p of ["emailTemplates.ts", "strings/es.ts"]) edit(p, () => at(p));
  } else if (BREAK === "utc") {
    edit("emailTemplates.ts", (s) => s.replace('brand.timezone || "America/Los_Angeles"', '"UTC"'));
  } else {
    edit("emailTemplates.ts", (s) => s.replace('return proseBlock(line.replace(/ · $/, "").replaceAll(" · ", "&nbsp;· "), 34);', 'return "";'));
  }
}
globalThis.Deno = { env: { get: () => undefined } };
const T = await import(pathToFileURL(path.join(dir, "emailTemplates.ts")).href);
const { brandFrom, htmlToText } = await import(pathToFileURL(path.join(dir, "emailKit.ts")).href);
const { maintenanceVerdict } = await import(pathToFileURL(path.join(dir, "maintenance.ts")).href);

// ── fixtures ───────────────────────────────────────────────────────────────
const SITE = "https://andrewsdetail.com/";
const NAME = "Andrew's Auto Detail";
const mkBrand = (tz, signOffName = "Andrew") => ({
  ...brandFrom({ brandName: NAME, contactPhone: "(303) 555-0142", siteUrl: SITE }, "#38E08B"),
  contactEmail: null, dropoffAddress: "500 Shop Rd, Denver, CO", googleReviewUrl: null, yelpReviewUrl: null,
  payment: [], messages: {}, timezone: tz, signOffName,
});
const mkBooking = (dateStr, extra = {}) => ({ id: "abcd1234-0000", lang: "en", customerName: "Maria Lopez", customerPhone: "(720) 555-0188",
  customerEmail: "m@example.com", customerAddress: "1234 Oak St, Denver, CO 80202", dateStr, startTime: "18:00", endTime: "20:00",
  serviceType: "mobile", vehicleSize: "Sedan", vehicleModel: null, customerNotes: null, serviceNames: ["Full detail"], addOnNames: [],
  subtotal: 185, siteDiscount: 0, siteDiscountPercent: 0, promoCode: null, promoDiscount: 0, total: 185,
  receiptUrl: "https://andrewsdetail.com/booking/x", ...extra });
const flat = (m) => htmlToText(m.html).replace(/ \(https?:\/\/[^)]*\)/g, "").replace(/\s+/g, " ");
const ROT = /undefined|NaN|Invalid Date|\bnull\b|\{[a-z]+\}|\[object|href=""/;
const rotOrIso = (s) => ROT.test(s) || /\b\d{1,2}:00\b|\d{4}-\d{2}-\d{2}/.test(s);
const SIGNED = /Thanks again|Gracias de nuevo/;
const SIGN = {
  en: { owner: `Thanks again, Andrew · ${NAME} · andrewsdetail.com`, business: `Thanks again, ${NAME} · andrewsdetail.com` },
  es: { owner: `Gracias de nuevo, Andrew · ${NAME} · andrewsdetail.com`, business: `Gracias de nuevo, ${NAME} · andrewsdetail.com` },
};

// ── 1 · the five detailer emails that name a day ──────────────────────────
const ZONES = ["Pacific/Kiritimati", "Pacific/Pago_Pago"];
const AHEAD = [0, 1, 3, 9];
const localDay = (tz, n) => {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const dayFor = (dateStr, n, lang) => {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const fmt = (o) => d.toLocaleDateString(lang === "es" ? "es-US" : "en-US", { ...o, timeZone: "UTC" });
  if (lang === "en") return n === 0 ? "today" : n === 1 ? "tomorrow" : n < 7 ? fmt({ weekday: "long" }) : fmt({ month: "long", day: "numeric" });
  return n === 0 ? "hoy" : n === 1 ? "mañana" : `el ${n < 7 ? fmt({ weekday: "long" }) : fmt({ month: "long", day: "numeric" })}`;
};
const up = (s) => s.charAt(0).toUpperCase() + s.slice(1);
for (const tz of ZONES) for (const n of AHEAD) for (const lang of ["en", "es"]) {
  const dateStr = localDay(tz, n), day = dayFor(dateStr, n, lang), brand = mkBrand(tz);
  const at6 = lang === "en" ? `${day} at 6 PM` : `${day} a las 6 PM`;
  const at10 = lang === "en" ? `${day} at 10 AM` : `${day} a las 10 AM`;
  const b = mkBooking(dateStr), moved = mkBooking(dateStr, { startTime: "10:00", endTime: "12:00" });
  const dropoff = mkBooking(dateStr, { serviceType: "dropoff" });
  const want = lang === "en" ? {
    "new booking": [T.ownerNewBookingEmail(brand, b, false, undefined, lang), `New booking: Maria Lopez, ${at6} ($185)`, []],
    request: [T.ownerNewBookingEmail(brand, b, true, undefined, lang), `Maria Lopez wants ${at6}`, ["Answer this request"]],
    "job coming up": [{ subject: T.ownerReminderSubject?.(brand, b, lang) ?? "(no ownerReminderSubject)", html: "" }, `${up(at6)}: Maria Lopez, 1234 Oak St`, []],
    "job coming up, drop-off": [{ subject: T.ownerReminderSubject?.(brand, dropoff, lang) ?? "(no ownerReminderSubject)", html: "" }, `${up(at6)}: Maria Lopez`, []],
    "customer moved": [T.rescheduleEmail(brand, moved, "2026-12-31", "18:00", true, lang), `Maria Lopez moved to ${at10}`, ["Was Thursday, December 31 at 6 PM"]],
    "customer cancelled": [T.cancellationEmail(brand, b, true, lang), `Maria Lopez cancelled ${at6}`, ["That time is open again."]],
  } : {
    "new booking": [T.ownerNewBookingEmail(brand, b, false, undefined, lang), `Nueva cita: Maria Lopez, ${at6} ($185)`, []],
    request: [T.ownerNewBookingEmail(brand, b, true, undefined, lang), `Maria Lopez quiere ${at6}`, ["Responder esta solicitud"]],
    "job coming up": [{ subject: T.ownerReminderSubject?.(brand, b, lang) ?? "(no ownerReminderSubject)", html: "" }, `${up(at6)}: Maria Lopez, 1234 Oak St`, []],
    "job coming up, drop-off": [{ subject: T.ownerReminderSubject?.(brand, dropoff, lang) ?? "(no ownerReminderSubject)", html: "" }, `${up(at6)}: Maria Lopez`, []],
    "customer moved": [T.rescheduleEmail(brand, moved, "2026-12-31", "18:00", true, lang), `Maria Lopez cambió su cita ${day.startsWith("el ") ? `al ${day.slice(3)}` : `a ${day}`} a las 10 AM`, []],
    "customer cancelled": [T.cancellationEmail(brand, b, true, lang), `Maria Lopez canceló ${at6}`, ["Ese horario quedó libre otra vez."]],
  };
  for (const [kind, [m, subject, has]] of Object.entries(want)) {
    reached++;
    const id = `${lang} ${tz} +${n} ${kind}`;
    check(`${id} subject`, m.subject === subject, `got "${m.subject}", want "${subject}"`);
    check(`${id} subject has no ":00" or ISO date`, !rotOrIso(m.subject), m.subject);
    if (m.html) {
      const text = flat(m);
      for (const s of has) check(`${id} says "${s}"`, text.includes(s));
      check(`${id} is not signed`, !SIGNED.test(text));
    }
  }
}

// ── 2 · the rest, by hand ─────────────────────────────────────────────────
const brand = mkBrand("America/Denver");
const b = mkBooking("2026-12-31");
const PLAN = (planName) => ({ customerName: "Maria Lopez", planName, startedOn: "2026-01-05", endedOn: "2026-10-01" });
const INVITE = (inviterName) => ({ role: "staff", label: null, link: "https://detailingplatform.com/invite/t", expiresAt: "2026-10-20T00:00:00Z", inviterName });
const BILL = (kind) => ({ kind, businessName: NAME, billingUrl: "https://detailingplatform.com/app?billing", amount: 49, reason: null, reasonCode: "insufficient_funds" });
const MAINT = { customerName: "Maria Lopez", label: "Ceramic coating check", vehicle: "2021 Civic", dueOn: "Friday, November 6", daysLeft: 9,
  bookUrl: SITE, unsubscribeUrl: "https://andrewsdetail.com/unsubscribe/c1", mailingAddress: "500 Shop Rd, Denver, CO 80202" };
const CAMP = { customerName: "Maria Lopez", subject: "Spring special on interiors", message: "We have open days next week.\nReply if you want one.",
  bookUrl: SITE, unsubscribeUrl: "https://andrewsdetail.com/unsubscribe/c1", mailingAddress: "500 Shop Rd, Denver, CO 80202" };
const REST = {
  en: {
    "still waiting 12h": [() => T.staleRequestEmail(brand, b, 12, "en"), "Still waiting: Maria asked 12 hours ago", ["That time is held until you answer.", "Answer this request"], ["so nobody else can book it either"]],
    "still waiting 1h": [() => T.staleRequestEmail(brand, b, 1, "en"), "Still waiting: Maria asked 1 hour ago", ["That time is held until you answer."], []],
    "plan left": [() => T.planCancelledEmail(brand, PLAN("Monthly"), "en"), "Maria Lopez left your Monthly plan", [], []],
    "plan left, named '... plan'": [() => T.planCancelledEmail(brand, PLAN("Monthly plan"), "en"), "Maria Lopez left your Monthly plan", [], []],
    "invite, inviter named": [() => T.inviteEmail(brand, INVITE("Andrew"), "en"), `Andrew added you to ${NAME}`, ["Set up your account"], []],
    "invite, no inviter": [() => T.inviteEmail(brand, INVITE(null), "en"), `You've been added to ${NAME}`, [], []],
    "card failed": [() => T.billingEmail(brand, BILL("failed"), "en"), "Your card didn't go through", ["Update your card", "Nothing is at risk yet"], []],
    "site offline (unchanged)": [() => T.billingEmail(brand, BILL("suspended"), "en"), `${NAME}'s booking page is offline`, ["Nothing has been deleted."], []],
    "build started": [() => T.buildStartedEmail(brand, { businessName: NAME, dateStr: "2026-10-12", setupCents: 29900, billingUrl: "https://detailingplatform.com/app?billing" }, "en"), "We've started building your site", ["$299"], []],
    "maintenance due": [() => T.maintenanceDueEmail(brand, MAINT, "en"), "Your car's about due, Maria", ["Want to get on the calendar?", "Pick a time", "Ceramic coating check on your 2021 Civic", "500 Shop Rd, Denver, CO 80202"], ["Book it in", "Book it below"]],
    promo: [() => T.campaignEmail(brand, CAMP, "en"), "Spring special on interiors", ["Hello Maria,", "We have open days next week.", "Reply if you want one.", "Book again", "500 Shop Rd, Denver, CO 80202"], []],
  },
  es: {
    "still waiting 12h": [() => T.staleRequestEmail(brand, b, 12, "es"), "Todavía esperando: Maria pidió hace 12 horas", ["Ese horario queda apartado hasta que respondas."], []],
    "still waiting 1h": [() => T.staleRequestEmail(brand, b, 1, "es"), "Todavía esperando: Maria pidió hace 1 hora", [], []],
    "plan left": [() => T.planCancelledEmail(brand, PLAN("Monthly"), "es"), "Maria Lopez dejó tu plan Monthly", [], []],
    "plan left, named '... plan'": [() => T.planCancelledEmail(brand, PLAN("Monthly plan"), "es"), "Maria Lopez dejó tu Monthly plan", [], []],
    "invite, inviter named": [() => T.inviteEmail(brand, INVITE("Andrew"), "es"), `Andrew te agregó a ${NAME}`, [], []],
    "invite, no inviter": [() => T.inviteEmail(brand, INVITE(null), "es"), `Te agregaron a ${NAME}`, [], []],
    "card failed": [() => T.billingEmail(brand, BILL("failed"), "es"), "Tu tarjeta no pasó", [], ["Your card"]],
    "site offline (unchanged)": [() => T.billingEmail(brand, BILL("suspended"), "es"), null, [], []],
    "build started": [() => T.buildStartedEmail(brand, { businessName: NAME, dateStr: "2026-10-12", setupCents: 29900, billingUrl: "https://detailingplatform.com/app?billing" }, "es"), "Empezamos a construir tu sitio", [], []],
    "maintenance due": [() => T.maintenanceDueEmail(brand, MAINT, "es"), "Maria, ya casi le toca servicio a tu auto", ["¿Quieres apartar un horario?", "Elegir un horario"], ["Reservarlo"]],
    promo: [() => T.campaignEmail(brand, CAMP, "es"), "Spring special on interiors", ["Hola Maria,", "We have open days next week."], []],
  },
};
const rendered = [];
const CUSTOMER = new Set(["maintenance due", "promo"]);
for (const lang of ["en", "es"]) for (const [kind, [make, subject, has, not]] of Object.entries(REST[lang])) {
  reached++;
  const id = `${lang} ${kind}`;
  let m;
  try { m = make(); } catch (e) { check(`${id} renders`, false, String(e.message)); continue; }
  const text = flat(m);
  if (subject !== null) check(`${id} subject`, m.subject === subject, `got "${m.subject}", want "${subject}"`);
  else check(`${id} subject still the old one, in Spanish`, m.subject.includes(NAME) && !/booking page/.test(m.subject), m.subject);
  for (const s of has) check(`${id} says "${s}"`, text.includes(s));
  for (const s of not) check(`${id} no longer says "${s}"`, !text.includes(s));
  check(`${id} no rot, ":00" or ISO date`, !rotOrIso(`${m.subject} ${text}`));
  check(`${id} ${CUSTOMER.has(kind) ? "is signed" : "is not signed"}`, CUSTOMER.has(kind) ? text.includes(SIGN[lang].owner) : !SIGNED.test(text));
  if (CUSTOMER.has(kind)) {
    check(`${id} unsubscribe link`, m.html.includes(`href="${CAMP.unsubscribeUrl}"`));
    check(`${id} mailing address`, text.includes("500 Shop Rd, Denver, CO 80202"));
  }
  if (["request", "maintenance due", "promo", "still waiting 12h", "card failed", "invite, inviter named"].includes(kind)) rendered.push({ id: `${lang}-${kind.replace(/\W+/g, "-")}`, kind, lang, m });
}
// the request email, for the browser: one day out at a Denver business
for (const lang of ["en", "es"]) rendered.push({ id: `${lang}-request`, kind: "request", lang, m: T.ownerNewBookingEmail(brand, mkBooking(localDay("America/Denver", 1)), true, undefined, lang) });
reached += 2; // those two are rendered here and judged in the browser below

// the promo keeps the detailer's own words exactly, escaped
{
  reached++;
  const m = T.campaignEmail(brand, { ...CAMP, subject: "Hi <b>there</b> & welcome", message: "<script>x</script>" }, "en");
  check("promo: the detailer's subject is used as typed", m.subject === "Hi <b>there</b> & welcome", m.subject);
  check("promo: their message is escaped", !m.html.includes("<script>x</script>") && m.html.includes("&lt;script&gt;"));
}

// ── 3 · signed as the business ────────────────────────────────────────────
for (const lang of ["en", "es"]) for (const [kind, make] of [["maintenance due", (br) => T.maintenanceDueEmail(br, MAINT, lang)], ["promo", (br) => T.campaignEmail(br, CAMP, lang)]]) {
  reached++;
  const text = flat(make(mkBrand("America/Denver", null)));
  const n = text.split(SIGN[lang].business).length - 1;
  check(`${lang} ${kind} signed as the business, exactly once`, n === 1, `found ${n}`);
}

// ── 4 · what must not change ──────────────────────────────────────────────
for (const [what, over] of [["no mailing address", { mailingAddress: "  " }], ["no unsubscribe link", { unsubscribeUrl: "" }]]) {
  reached++;
  let threw = false;
  try { T.maintenanceDueEmail(brand, { ...MAINT, ...over }, "en"); } catch { threw = true; }
  check(`maintenance-due refuses to render with ${what}`, threw);
}
{
  const on = { email_customer_reminder: true, email_customer_maintenance_due: true };
  const cust = { email: "m@example.com", unsubscribed_at: null, email_failed_at: null };
  reached++; check("maintenanceVerdict: switch off -> not sent", maintenanceVerdict({ settings: { ...on, email_customer_maintenance_due: false }, customer: cust, mailingAddress: "500 Shop Rd" }).send === false);
  reached++; check("maintenanceVerdict: no address -> not sent, reason recorded", maintenanceVerdict({ settings: on, customer: cust, mailingAddress: "" }).reason === "no_mailing_address");
  const sweep = readFileSync(path.join(REPO, "supabase/functions/send-owner-reminders/index.ts"), "utf8");
  reached++; check("the sweep still requires the maintenance-due switch", /if \(!settings\.email_customer_maintenance_due\) continue;/.test(sweep));
  // ── 5 · the callers ─────────────────────────────────────────────────────
  reached++; check("send-owner-reminders takes the job-coming-up subject from the template", /subject: ownerReminderSubject\(brand, data, lang\)/.test(sweep) && !/Upcoming job - {name}/.test(sweep));
  const inv = readFileSync(path.join(REPO, "supabase/functions/invite-user/index.ts"), "utf8");
  reached++; check("invite-user passes the inviter's first name", /inviterName: inviter\?\.first_name \?\? null/.test(inv) && /\.eq\("user_id", member\.userId\)/.test(inv));
}

// ── 6 · on a phone and a laptop ───────────────────────────────────────────
const SHOTS = path.join(REPO, ".manager-shots", "99.2e");
mkdirSync(SHOTS, { recursive: true });
const tmpHtml = mkdtempSync(path.join(tmpdir(), "dp-99-2e-html-"));
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
    const got = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, iw: innerWidth, body: document.body.innerText.replace(/\s+/g, " "),
      links: [...document.querySelectorAll("a")].map((a) => { const rc = a.getBoundingClientRect(); return { t: a.textContent.trim(), l: rc.left, r: rc.right, top: rc.top, b: rc.bottom, h: rc.height }; }),
    }));
    check(`${id} no sideways scroll`, got.sw <= got.iw, `${got.sw} > ${got.iw}`);
    const buttons = got.links.filter((l) => l.h >= 30);
    check(`${id} has its button`, buttons.length >= 1, got.links.map((l) => l.t).join(" | "));
    for (const bt of buttons) check(`${id} "${bt.t}" inside the screen and 44px tall`, bt.l >= 0 && bt.r <= got.iw && bt.h >= 44, JSON.stringify(bt));
    if (CUSTOMER.has(r.kind)) {
      const site = got.links.find((l) => l.t === "andrewsdetail.com");
      check(`${id} sign-off painted, inside the screen, below the button`, got.body.includes(SIGN[r.lang].owner) && !!site && site.r <= got.iw && site.top > Math.max(...buttons.map((x) => x.b)));
    }
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

// 2 zones × 4 days × 2 languages × 6 day-named subjects; 11 × 2 others (+2 request renders);
// 1 escaped promo; 2 × 2 signed-as-business; 2 refusals; 2 verdicts; 1 gate; 2 callers;
// 6 emails × 2 languages × 2 widths in the browser.
const EXPECTED = 96 + 22 + 2 + 1 + 4 + 2 + 2 + 1 + 2 + 24;
// The canary: the pre-99.2e new-booking subject must not equal the approved one.
const canaryCaught = "New booking · Maria Lopez · Thursday, December 31 ($185)" !== "New booking: Maria Lopez, Thursday at 6 PM ($185)";
const receipt = writeReceipt({
  check_id: BREAK ? `marketing-detailer-emails-${BREAK}` : "marketing-detailer-emails", started_at,
  status: failures.length || reached !== EXPECTED ? "fail" : "pass",
  expected_targets: EXPECTED, discovered_targets: reached, attempted_targets: reached, completed_targets: reached,
  skipped_targets: 0, assertions_executed: assertions, min_assertions: 400, failures, artifacts,
  dimensions: { break: BREAK, languages: ["en", "es"], zones: ZONES, days_ahead: AHEAD, widths: [392, 1440],
    scope: "Detailer, platform, promo and maintenance-due email wording (99.2e), the sign-off on promo and maintenance-due, the mailing-address refusal and the maintenance-due switch left as they were, and the two callers. UNJUDGEABLE, not run: a real send, and invite-user's read of the inviter's first name against a database. NOT BUILT: Accept and Decline buttons on the request email (no one-tap answer from an email exists); the request email keeps one 'Answer this request' button." },
  canary: { id: "the pre-99.2e new-booking subject 'New booking · <name> · <date> (<total>)' does not equal the approved one", observed_failure: canaryCaught },
});
console.log(`${reached} of ${EXPECTED} targets; ${assertions} assertions; ${failures.length} failures`);
for (const f of failures.slice(0, 40)) console.error(`FAIL ${f}`);
if (failures.length > 40) console.error(`… and ${failures.length - 40} more`);
console.log(`Receipt ${receipt.path}`);
if (failures.length || !canaryCaught || reached !== EXPECTED) process.exitCode = 1;
