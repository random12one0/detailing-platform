// ROADMAP 99.2c — THE CUSTOMER BOOKING EMAILS SAY WHAT ANDREW APPROVED.
//
//   node scripts/booking-email-wording.mjs                # the real templates
//   node scripts/booking-email-wording.mjs --break=old    # the templates as they were before 99.2c
//   node scripts/booking-email-wording.mjs --break=utc    # "today" on the server's clock, not the business's
//
// Seven customer emails (booked, request received, accepted, declined, price,
// time changed, cancelled), English and Spanish, for an appointment today,
// tomorrow, three days out and nine days out, at two businesses whose own day
// is never the same as UTC's at the same moment (UTC+14 and UTC-11) — so at any
// hour of the day one of them catches a "today" taken from the server's clock.
// Every expected sentence is written out here by hand, never built by calling
// the product's own helper, or a wrong helper would agree with itself.
//
// Then the four emails with a new button or line are opened in a browser at
// 392 and 1440, in both languages: no sideways scroll, the button inside the
// screen, the console silent. No credentials, no network, no database.
//
// Both sabotages edit a scratch copy of `supabase/functions/_shared` and render
// the real templates from it; neither touches an assertion.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "../app/node_modules/playwright/index.mjs";
import { writeReceipt, REPO } from "./receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = process.argv.find((a) => a.startsWith("--break="))?.slice(8) || "";
if (BREAK && !["old", "utc"].includes(BREAK)) throw new Error("Unknown break");
const failures = [], artifacts = [];
let assertions = 0;
const check = (name, ok, detail = "") => { assertions++; if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`); };

const SHARED = path.join(REPO, "supabase/functions/_shared");
let dir = SHARED, scratch = null;
if (BREAK) {
  scratch = mkdtempSync(path.join(tmpdir(), "dp-booking-wording-"));
  cpSync(SHARED, scratch, { recursive: true });
  dir = scratch;
  const file = path.join(scratch, "emailTemplates.ts");
  const before = readFileSync(file, "utf8");
  if (BREAK === "old") {
    // The commit before 99.2c, both the templates and their Spanish.
    const at = (p) => execFileSync("git", ["show", `6f681160^:supabase/functions/_shared/${p}`], { cwd: REPO, encoding: "utf8" });
    writeFileSync(file, at("emailTemplates.ts"));
    writeFileSync(path.join(scratch, "strings/es.ts"), at("strings/es.ts"));
  } else {
    const after = before.replace('brand.timezone || "America/Los_Angeles"', '"UTC"');
    if (after === before) throw new Error("Sabotage did not land in emailTemplates");
    writeFileSync(file, after);
  }
  if (readFileSync(file, "utf8") === readFileSync(path.join(SHARED, "emailTemplates.ts"), "utf8")) throw new Error("Sabotage did not land");
}
const T = await import(pathToFileURL(path.join(dir, "emailTemplates.ts")).href);
const { brandFrom, htmlToText } = await import(pathToFileURL(path.join(dir, "emailKit.ts")).href);

// ── the expected words, by hand ───────────────────────────────────────────
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
const WANT = {
  en: (day, when, near) => ({
    confirmation: { subject: `You're booked for ${when}`, has: ["You're all set", `Thanks, Maria. Here's everything for ${day}.`, "Need to change or cancel? Use the button above. No call needed."] },
    request: { subject: `Got your request for ${when}`, has: ["We're holding this time for you", "Thanks, Maria. We're checking the schedule and will get back to you soon. Nothing is charged yet."] },
    accepted: { subject: `Confirmed: ${when}`, has: ["You're confirmed", "Need to change or cancel? Use the button above. No call needed."] },
    declined: { subject: `About your request for ${day}`, has: [`Sorry, we can't make ${when} work.`, "Pick another time"] },
    quote: { subject: "Your price is ready: $185", has: ["Here's your price", "Look it over"] },
    reschedule: { subject: `New time: ${when}`, has: ["Your appointment moved. Here's the new time."] },
    cancellation: { subject: near ? `Your appointment ${day} is cancelled` : `Your ${day} appointment is cancelled`, has: ["This one's off the calendar. Whenever you're ready, booking again takes a minute.", "Book again"] },
  }),
  es: (day, when, near) => ({
    confirmation: { subject: `Tu cita quedó reservada para ${when}`, has: ["Todo listo", `Gracias, Maria. Aquí está todo para ${day}.`, "¿Necesitas cambiar o cancelar? Usa el botón de arriba. No hace falta llamar."] },
    request: { subject: `Recibimos tu solicitud para ${when}`, has: ["Te estamos guardando este horario", "Gracias, Maria. Estamos revisando la agenda y te respondemos pronto. Todavía no se cobra nada."] },
    accepted: { subject: `Confirmada: ${when}`, has: ["Tu cita está confirmada", "¿Necesitas cambiar o cancelar? Usa el botón de arriba. No hace falta llamar."] },
    declined: { subject: `Sobre tu solicitud para ${day}`, has: [`Lo sentimos, no podemos atenderte ${when}.`, "Elegir otro horario"] },
    quote: { subject: "Tu precio está listo: $185", has: ["Este es tu precio", "Revisarlo"] },
    reschedule: { subject: `Nuevo horario: ${when}`, has: ["Tu cita cambió de horario. Este es el nuevo."] },
    cancellation: { subject: near ? `Tu cita de ${day} está cancelada` : `Tu cita para ${day} está cancelada`, has: ["Esta cita ya no está en la agenda. Cuando quieras, reservar otra vez toma un minuto.", "Reservar otra vez"] },
  }),
};

// ── 1 · every email, every day, both languages, both zones ────────────────
const SITE = "https://detailingplatform.com/book/demo-detail";
const rendered = [];
let reached = 0;
for (const tz of ZONES) for (const lang of ["en", "es"]) for (const n of AHEAD) {
  const brand = { ...brandFrom({ brandName: "Ridgeline Auto Detail", contactPhone: "(303) 555-0142", siteUrl: SITE }, "#38E08B"),
    contactEmail: null, dropoffAddress: null, googleReviewUrl: null, yelpReviewUrl: null, payment: [], messages: {}, timezone: tz };
  const dateStr = localDay(tz, n);
  const b = { id: "x", lang, customerName: "Maria Lopez", customerPhone: "(720) 555-0188", customerEmail: "m@example.com",
    customerAddress: "1234 Oak St, Denver, CO 80202", dateStr, startTime: "18:00", endTime: "20:00", serviceType: "mobile",
    vehicleSize: "Sedan", vehicleModel: null, customerNotes: null, serviceNames: ["Full detail"], addOnNames: [],
    subtotal: 185, siteDiscount: 0, siteDiscountPercent: 0, promoCode: null, promoDiscount: 0, total: 185,
    receiptUrl: "https://detailingplatform.com/booking/x" };
  const day = dayFor(dateStr, n, lang);
  const when = `${day} ${lang === "es" ? "a las" : "at"} 6 PM`;
  const want = WANT[lang](day, when, n <= 1);
  const oldDate = localDay(tz, n + 2);
  const mails = {
    confirmation: T.customerConfirmationEmail(brand, b, false),
    request: T.customerConfirmationEmail(brand, b, true),
    accepted: T.requestDecisionEmail(brand, b, "accepted", { manageUrl: b.receiptUrl }),
    declined: T.requestDecisionEmail(brand, b, "declined", { manageUrl: b.receiptUrl }),
    quote: T.requestDecisionEmail(brand, b, "quote", { manageUrl: b.receiptUrl, quotedAmount: 185 }),
    reschedule: T.rescheduleEmail(brand, b, oldDate, "10:00", false),
    cancellation: T.cancellationEmail(brand, b, false),
  };
  for (const [kind, m] of Object.entries(mails)) {
    reached++;
    const id = `${tz.split("/")[1]} ${lang} +${n}d ${kind}`;
    const text = htmlToText(m.html).replace(/\s+/g, " ");
    check(`${id} subject`, m.subject === want[kind].subject, `got "${m.subject}", want "${want[kind].subject}"`);
    for (const s of want[kind].has) check(`${id} says "${s}"`, text.includes(s));
    check(`${id} no whole-hour :00 or ISO date`, !/\b\d{1,2}:00\b|\d{4}-\d{2}-\d{2}/.test(`${m.subject} ${text}`));
    check(`${id} no "Keep this email"`, !/Keep this email|Guarda este correo/.test(text));
    check(`${id} no rot`, !/undefined|NaN|Invalid Date|\{[a-z]+\}/.test(`${m.subject} ${text}`));
    if (kind === "reschedule") {
      const was = text.indexOf(lang === "es" ? "Antes:" : "Was ");
      const newLong = T.formatDateLong(dateStr, lang);
      check(`${id} old time crossed out above the new one`, was >= 0 && was < text.lastIndexOf(newLong)
        && /line-through[^>]*>[^<]*(Was |Antes:)/.test(m.html));
    }
    if (kind === "declined" || kind === "cancellation") check(`${id} button goes to the booking page`, m.html.includes(`href="${SITE}"`));
    if (n === 3 && tz === ZONES[0] && ["confirmation", "declined", "cancellation", "reschedule"].includes(kind)) rendered.push({ id: `${lang}-${kind}`, m, lang });
  }
}

// ── 2 · the four with a new line or button, on a phone and a laptop ──────
const SHOTS = path.join(REPO, ".manager-shots", "99.2c");
mkdirSync(SHOTS, { recursive: true });
const tmpHtml = mkdtempSync(path.join(tmpdir(), "dp-booking-wording-html-"));
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
      const btn = [...document.querySelectorAll("a")].filter((a) => a.getBoundingClientRect().height >= 30).map((a) => {
        const rc = a.getBoundingClientRect(); return { t: a.textContent.trim(), l: rc.left, r: rc.right, h: rc.height };
      });
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, btn };
    });
    check(`${id} no sideways scroll`, got.sw <= got.iw, `${got.sw} > ${got.iw}`);
    const label = { confirmation: r.lang === "es" ? "Ver tu reserva" : "View your booking", declined: r.lang === "es" ? "Elegir otro horario" : "Pick another time",
      cancellation: r.lang === "es" ? "Reservar otra vez" : "Book again", reschedule: r.lang === "es" ? "Ver tu reserva" : "View your booking" }[r.id.split("-")[1]];
    const b = got.btn.find((x) => x.t === label);
    check(`${id} "${label}" button inside the screen`, !!b && b.l >= 0 && b.r <= got.iw && b.h >= 44, JSON.stringify(b || got.btn));
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

// 7 emails × 2 languages × 4 days × 2 zones, then 4 emails × 2 languages × 2 widths.
const EXPECTED = 7 * 2 * AHEAD.length * ZONES.length + 4 * 2 * 2;
// The canary: the subject rule must refuse the pre-99.2c English subject.
const old = "Booking confirmed · Wednesday, October 14";
const canaryCaught = old !== WANT.en("Wednesday", "Wednesday at 6 PM", false).confirmation.subject;
const receipt = writeReceipt({
  check_id: BREAK ? `booking-email-wording-${BREAK}` : "booking-email-wording", started_at,
  status: failures.length || reached !== EXPECTED ? "fail" : "pass",
  expected_targets: EXPECTED, discovered_targets: reached, attempted_targets: reached, completed_targets: reached,
  skipped_targets: 0, assertions_executed: assertions, min_assertions: 760, failures, artifacts,
  dimensions: { break: BREAK, zones: ZONES, days_ahead: AHEAD, widths: [392, 1440],
    scope: "The seven customer booking emails' subjects, headlines, opening lines and buttons (99.2c). Detailer emails (99.2e), after-job emails (99.2d) and the reminder's texting-consent routing (99.2i) are not covered." },
  canary: { id: "the pre-99.2c subject 'Booking confirmed · <date>' does not equal the approved one", observed_failure: canaryCaught },
});
console.log(`${reached} of ${EXPECTED} targets; ${assertions} assertions; ${failures.length} failures`);
for (const f of failures.slice(0, 40)) console.error(`FAIL ${f}`);
if (failures.length > 40) console.error(`… and ${failures.length - 40} more`);
console.log(`Receipt ${receipt.path}`);
if (failures.length || !canaryCaught || reached !== EXPECTED) process.exitCode = 1;
