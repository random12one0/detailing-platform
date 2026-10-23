// ROADMAP 5.3 — CAN THE OWNER FIND THE RECEIPT FOR A JOB SOMEBODY PAID FOR?
//
//   node scripts/e2e-receipt-trail.mjs                 # the whole run
//   node scripts/e2e-receipt-trail.mjs --headed        # watch it
//   node scripts/e2e-receipt-trail.mjs --break=<id>    # sabotage one target
//   BASE=http://localhost:5181 node scripts/e2e-receipt-trail.mjs --to=e2e@fixture.test
//                                                      # another copy of the app, mail free
//   node scripts/receipt.mjs receipts/e2e-receipt-trail.json
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS, AND WHY IT IS NOT `e2e-payment.mjs`
// ---------------------------------------------------------------------------
// 14.5 proved a card SETTLES. It proved nothing about what the settlement
// leaves behind, and said so in its own words: *"No email was sent.
// `handleConnected()` marks the row and sends nothing."* A1 P1-04 asked the
// next question — *are receipts and invoices findable* — and marked it **needs
// verification, not a proven missing feature**, because the payment it would
// have been asked about had never been made.
//
// **IT HAS NOW. Measured 2026-09-18, on a real $195 test payment:** the
// booking went `paid` with a Stripe intent on it, and the number of emails the
// product sent about that payment was **zero**, and the number of rows in
// `email_sends` it produced was **zero**. The receipt existed — `send-invoice`
// builds one and its subject is literally `Receipt · $195 · <business>` — but
// nothing sent it and the job record did not offer to. Worse, the one button
// that would was behind `canFinalize`, so a customer who paid from their own
// link BEFORE the detailer closed the job left the detailer looking at a
// record that said **Finalize payment** and had no way to send a receipt at all.
//
// So this file asks the done-when, in the owner's own words: **what was sent,
// when, to whom, did it arrive, can I send it again — without hunting.**
//
// ---------------------------------------------------------------------------
// IT PAYS FOR ITS OWN SUBJECT. THAT IS THE POINT.
// ---------------------------------------------------------------------------
// A receipt check handed a row somebody flipped to `paid` by hand proves that
// a template renders. This one drives `e2e-payment.mjs` first — Stripe's own
// hosted page, a real test card, the real webhook — and then asks its
// questions about **that** payment. If the payment leg fails, this file has no
// subject and says so rather than testing a fixture.
//
// ---------------------------------------------------------------------------
// THE ONE ANSWER THIS CANNOT GIVE, SAID OUT LOUD RATHER THAN FAKED
// ---------------------------------------------------------------------------
// **"DID IT ARRIVE" STOPS AT `sent` TODAY, AND IT IS NOT THIS PRODUCT'S
// FAULT.** `resend-webhook` is deployed and its signing secret is set; what
// has never happened is somebody adding the endpoint in Resend's own
// dashboard, which is three minutes of Andrew's time and row 1 of
// `FOR-ANDREW.md`. Measured here every run: every email ever sent to
// `delivered@resend.dev` — an address Resend guarantees accepts instantly —
// is still sitting at `sent`. So § 5 asserts the row EXISTS and carries a
// provider id, which is the half that is ours, and PRINTS the delivery gap
// rather than asserting a state nothing can currently produce. A check that
// demanded `delivered` would be red for a reason that is not a defect, and a
// check that quietly skipped the question would be this repo's oldest failure.

import "../tests/_env.mjs";           // root .env -> process.env, before anything reads it

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { realMail } from "../tests/_mail.mjs";
import { money } from "../app/src/lib/format.js";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

const SLUG = "demo-detail";
const OWNER = demoOwner();
// The copy of the app to drive, read from BASE as e2e-booking.mjs does, so the
// audit can point it at its test copy (ROADMAP 101.6). Unset: the dev server.
const DASH = process.env.BASE || "http://localhost:5173";
// Resend's own always-accepts simulator. The receipt in this run is a REAL
// send to a REAL provider — an `@example.com` address is refused by
// `send-email` before Resend is ever called, which would leave a `skipped` row
// and prove nothing about a message that actually went out.
// `--to=` overrides it, as in e2e-booking.mjs: `--to=e2e@fixture.test` runs
// free, and § 5 then says out loud that the provider leg went unproven.
const SINK = process.argv.find((a) => a.startsWith("--to="))?.slice(5) ?? realMail("delivered@resend.dev",
  "§ 4 sends a real receipt so §§ 5 and 6 have a real row to find");
// The subject `invoiceEmail` writes. Asserted as a FACT ABOUT THE PRODUCT and
// not read back out of it: if the template stops calling this document a
// receipt, the detailer's screen and the customer's inbox have started using
// two different words for one thing, and that is the defect this item is about.
const RECEIPT_WORD = /^(your receipt|receipt)\b/i;

let assertions = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`  ok    ${name}`); return true; }
  failures.push(`${name} ${detail}`.trim());
  console.error(`  FAIL  ${name} ${detail}`);
  return false;
};

// ---------------------------------------------------------------------------
// GUARDS. A SKIPPED RUN MUST NOT READ LIKE A PASSING ONE.
// ---------------------------------------------------------------------------
if (!URL_ || !SERVICE || !ANON) {
  console.error("\nSKIPPED — needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY in the root .env.");
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
// AN ALLOW-LIST, NOT A DENY-LIST (101.6 follow-up). This script takes a payment
// and sends mail, so it runs ONLY against a database named here and refuses every
// other project: the real business's ref is not confirmed, and CLAUDE.md says any
// project that is not the platform's own is "stop and ask", whatever its ref.
// Matched on the URL's host, so a ref buried in a path or a lookalike host fails.
const ALLOWED_HOSTS = [
  "kguqylyzgyzfktkfnhjb.supabase.co",   // this platform's own development project
  "txskfjumploppqajbmxx.supabase.co",   // the belt audit's TEST COPY (STAGING_URL in .env.staging, ROADMAP 101.6)
  "127.0.0.1", "localhost",             // a local Supabase or stub on this machine
];
const DB_HOST = (() => { try { return new URL(URL_).hostname; } catch { return ""; } })();
if (URL_.includes("adtlnvihwrcqcasqcjwd")) {
  console.error(`\nREFUSED — ${URL_} is the real business's project. This script takes a payment and sends mail.`);
  console.error("NOTHING ran and NO receipt was written.");
  process.exit(2);
}
if (!ALLOWED_HOSTS.includes(DB_HOST)) {
  console.error(`\nREFUSED — ${URL_} is not one this script may use (the platform's development project, the audit's test copy, or a local one). This script takes a payment and sends mail.`);
  console.error("NOTHING ran and NO receipt was written. Stop and ask Andrew before adding a project.");
  process.exit(2);
}
// Checked before § 1 pays for anything, so an unreachable copy is a SKIP that
// says so, not a payment spent and a pile of screen failures.
if (!(await fetch(DASH).then((r) => r.ok).catch(() => false))) {
  console.error(`\nSKIPPED — nothing is serving ${DASH}. Start it with \`npm run dev --prefix app\`.`);
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}

const svc = async (path, init = {}) => {
  const res = await fetch(URL_ + path, {
    ...init,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
};

const fn = async (name, payload, token) => {
  const res = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ART = new URL("../artifacts/e2e-receipt-trail/", import.meta.url);
mkdirSync(ART, { recursive: true });
const artifacts = [];
const keep = (name, data) => {
  writeFileSync(new URL(name, ART), typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n");
  artifacts.push("artifacts/e2e-receipt-trail/" + name);
};

// ===========================================================================
console.log("\nROADMAP 5.3 — the receipt trail for one real payment"
  + (BREAK ? `   [SABOTAGE: ${BREAK}]` : ""));
console.log(`  project ${URL_}`);

// Six targets, named up front. `expected` never comes from counting what was
// found — that is the arithmetic `receipt.mjs` exists to check.
const TARGETS = ["payment", "silence", "document", "send", "record", "screen"];
const expected_targets = TARGETS.length;
let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "an-unsent-receipt-must-not-look-sent", observed_failure: false };

const browser = await chromium.launch({ headless: !HEADED });
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });

try {
  // -------------------------------------------------------------------------
  console.log("\n§ 1 — payment: a card really settles, and this run makes it");
  discovered++; attempted++;

  // SABOTAGE `nopay`: skip the payment and use whatever paid booking is lying
  // about. Everything downstream still has a subject, so the run LOOKS the
  // same — which is exactly the shape of check this repo keeps finding, and §
  // 1 is what must catch it.
  let paymentRan = false;
  if (BREAK !== "nopay") {
    try {
      // THE REAL THING, DRIVEN RATHER THAN IMITATED. Its own 22 assertions and
      // its own canary run inside this one; a failure there is a failure here.
      execFileSync(process.execPath, ["scripts/e2e-payment.mjs"], {
        cwd: new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
        stdio: "inherit",
      });
      paymentRan = true;
    } catch {
      paymentRan = false;
    }
  }
  check("the payment leg ran and passed", paymentRan === true,
    BREAK === "nopay" ? "(sabotage: no payment was made)" : "e2e-payment.mjs exited non-zero");

  const bizRes = await svc(`/rest/v1/businesses?select=id,name,timezone&slug=eq.${SLUG}`);
  const BIZ = bizRes.body?.[0]?.id;
  if (!BIZ) throw new Error(`no business with slug "${SLUG}" — run node scripts/seed-demo.mjs`);

  // THE SUBJECT IS THE BOOKING THAT PAYMENT PAID FOR, found by its Stripe
  // intent and not by its name. A row named after this test that was never
  // paid is not this test's subject.
  const paidRes = await svc(
    `/rest/v1/bookings?select=id,customer_name,customer_email,customer_phone,customer_id,final_amount,`
    + `payment_status,paid_online_at,stripe_payment_intent,finalized_at`
    + `&business_id=eq.${BIZ}&deleted_at=is.null&payment_status=eq.paid`
    + `&stripe_payment_intent=not.is.null&order=paid_online_at.desc&limit=1`,
  );
  const job = paidRes.body?.[0] ?? null;
  keep("paid-booking.json", job);
  check("there is a booking a card actually paid for", Boolean(job?.stripe_payment_intent),
    JSON.stringify(paidRes.body));
  check("it was paid ONLINE, with the moment recorded", Boolean(job?.paid_online_at));
  // 14.5's finding, re-asserted because the whole item rests on it: a card
  // payment does NOT close the job, so every screen that gates a receipt on
  // "finalized" hides it from exactly the customer who already paid.
  check("and paying did NOT finalize it — the receipt cannot be gated on that",
    job?.finalized_at === null || job?.finalized_at === undefined,
    `finalized_at ${job?.finalized_at}`);
  if (failures.length === 0) completed++;

  if (!job) {
    console.error("\nNO SUBJECT — the payment leg produced no paid booking, so there is nothing to ask about.");
    finish();
  }

  const BOOKING = job.id;

  // ── CLEAR ONLY WHAT THIS CHECK MADE LAST TIME ──────────────────────────
  //
  // **FOUND BY SABOTAGE, AND IT IS THE REASON THIS BLOCK EXISTS.**
  // `--break=nosend` skips the send entirely, and § 6 stayed GREEN: the screen
  // still showed a receipt subject and still offered to send it "again",
  // because YESTERDAY'S RUN had put one on this same address for this same
  // $195. A screen check that cannot tell this run's row from the last one is
  // not measuring this run.
  //
  // So the rows this file's own sends leave are cleared before it sends
  // again — scoped to this address AND to the two subjects `send-invoice`
  // writes, so the reminder and confirmation rows other checks leave on the
  // same sink are untouched. ROADMAP 0.3 is flag-don't-delete about FIXTURES
  // a person might look at; these are this check's own bookkeeping, and
  // `e2e-ten-features.mjs` clears its own the same way.
  for (const like of ["Receipt%", "Your receipt%", "Thank you for choosing%", "Thanks from%"]) {
    await svc(`/rest/v1/email_sends?to_email=eq.${encodeURIComponent(SINK)}`
      + `&subject=like.${encodeURIComponent(like)}`, { method: "DELETE" });
  }
  const token = (await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify(OWNER),
  }).then((r) => r.json())).access_token;

  // -------------------------------------------------------------------------
  console.log("\n§ 2 — silence: the payment itself emailed nobody, and that is the finding");
  discovered++; attempted++;

  const afterPay = await svc(
    `/rest/v1/email_sends?select=id,subject,to_email,sent_at&business_id=eq.${BIZ}`
    + `&sent_at=gte.${encodeURIComponent(job.paid_online_at)}`,
  );
  keep("emails-the-payment-sent.json", afterPay.body);
  // ASSERTED AS THE PRODUCT'S CURRENT BEHAVIOUR, NOT AS A GOOD ONE. If a
  // future change makes the webhook send the receipt itself, THIS LINE GOES
  // RED — and that is correct: the sentence on the customer's paid screen was
  // narrowed to match this silence and would need putting back in the same
  // change. It is a tripwire on a decision, not a preference.
  check("nothing was emailed by the payment itself (handleConnected sends nothing)",
    Array.isArray(afterPay.body) && afterPay.body.length === 0,
    `${afterPay.body?.length} row(s): ${JSON.stringify(afterPay.body).slice(0, 160)}`);
  if (failures.length === 0) completed++;

  // -------------------------------------------------------------------------
  console.log("\n§ 3 — document: the receipt page the customer opens exists and is public");
  discovered++; attempted++;

  const rec = await fn("get-booking-receipt", { id: BOOKING });
  keep("receipt-endpoint.json", rec.body);
  check("the receipt page's data loads without a login", rec.status === 200);
  check("it is this job", rec.body?.booking?.id === BOOKING);
  check("it carries the amount the customer was charged",
    Number(rec.body?.booking?.final_amount) === Number(job.final_amount),
    `${rec.body?.booking?.final_amount} vs ${job.final_amount}`);
  // THE ONE THING THE PUBLIC RECEIPT STILL DOES NOT SAY, RECORDED RATHER THAN
  // ASSERTED EITHER WAY. `payment_status` is deliberately withheld from this
  // endpoint (its own `SERVER_ONLY_COLUMNS`), so a customer reopening their
  // receipt tomorrow sees no trace that they paid. That is a real finding and
  // it is a change to a PUBLIC allow-list, which is not this item's to make.
  const saysPaid = rec.body?.booking?.payment_status !== undefined;
  console.log(`  ..    the public receipt ${saysPaid ? "DOES" : "does NOT"} state that it was paid`
    + `${saysPaid ? "" : " — FOUND.md, not fixed here"}`);
  if (failures.length === 0) completed++;

  // -------------------------------------------------------------------------
  console.log("\n§ 4 — send: the owner can email that receipt, on a job nobody finalized");
  discovered++; attempted++;

  // A DELIVERABLE ADDRESS, AND A CUSTOMER ROW TO FILE IT AGAINST. The paid
  // fixture carries an `@example.com` address that `send-email` refuses before
  // Resend sees it, which would leave a `skipped` row — the one row shape that
  // cannot prove a message went out.
  let cust = (await svc(`/rest/v1/customers?select=id&business_id=eq.${BIZ}`
    + `&phone=eq.${encodeURIComponent(job.customer_phone)}`)).body;
  if (!Array.isArray(cust) || cust.length === 0) {
    cust = (await svc("/rest/v1/customers", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        business_id: BIZ, name: job.customer_name, phone: job.customer_phone, email: SINK,
      }),
    })).body;
  } else {
    await svc(`/rest/v1/customers?id=eq.${cust[0].id}`,
      { method: "PATCH", body: JSON.stringify({ email: SINK }) });
  }
  await svc(`/rest/v1/bookings?id=eq.${BOOKING}`, {
    method: "PATCH",
    body: JSON.stringify({ customer_email: SINK, customer_id: cust[0].id }),
  });

  // SABOTAGE `nosend`: never press it. §§ 5 and 6 must both notice — the row
  // is not there and the screen has nothing to show. This is the closest thing
  // to the defect the item was written about, which was never a broken
  // template: it was that nobody could send one.
  const sent = BREAK === "nosend"
    ? { status: 0, body: { skipped: "sabotage: the receipt was never sent" } }
    : await fn("send-invoice", { booking_id: BOOKING, business_id: BIZ }, token);
  keep("send-invoice.json", sent);
  check("the product sent the receipt for a job that was never finalized",
    sent.status === 200 && sent.body?.success === true, JSON.stringify(sent.body));
  if (failures.length === 0) completed++;

  // -------------------------------------------------------------------------
  console.log("\n§ 5 — record: it left a row saying what, when, to whom");
  discovered++; attempted++;

  await sleep(4000);
  const rows = (await svc(
    `/rest/v1/email_sends?select=id,subject,to_email,status,provider_id,customer_id,sent_at`
    + `&business_id=eq.${BIZ}&to_email=eq.${encodeURIComponent(SINK)}&order=sent_at.desc&limit=10`,
  )).body;
  keep("email-rows.json", rows);
  const receiptRow = (Array.isArray(rows) ? rows : [])
    .find((r) => RECEIPT_WORD.test(String(r.subject || ""))
      && new Date(r.sent_at) >= new Date(job.paid_online_at));
  check("the receipt left a row of its own", Boolean(receiptRow),
    JSON.stringify(rows).slice(0, 200));
  // WHAT — the subject is the human's handle on which email this was, and it
  // is the word the screen uses. TO WHOM — the address, read off the row and
  // not off the booking. WHEN — the instant. NOT one assertion about a row
  // existing: the done-when names four separate questions and each one is
  // asked here, so a row that exists with a blank subject cannot pass.
  check("it says WHAT was sent, in the product's own word",
    RECEIPT_WORD.test(String(receiptRow?.subject || "")), receiptRow?.subject);
  check("it says TO WHOM", receiptRow?.to_email === SINK, receiptRow?.to_email);
  check("it says WHEN", Boolean(receiptRow?.sent_at));
  // THE PROVIDER ID IS THE HALF OF "DID IT ARRIVE" THAT IS OURS: it means
  // Resend accepted the message and gave it a name. The other half is Resend
  // calling us back, and nothing here can make that happen — see the header.
  // A reserved-domain `--to=` (101.6) is skipped by `send-email` before Resend,
  // so there is no provider id to ask for: ask that the row says `skipped`
  // instead, and print that the provider leg went unproven.
  if (/(^|\.)(test|invalid|localhost|example)$|^example\.(com|net|org)$/.test(SINK.split("@").pop().toLowerCase())) {
    console.log(`  SKIPPED  the provider leg: ${SINK} is a reserved domain, so Resend was never asked`);
    check("the row says the reserved address was skipped, not sent", receiptRow?.status === "skipped",
      `status ${receiptRow?.status}`);
  } else {
    check("the provider took it and named it", Boolean(receiptRow?.provider_id),
      `status ${receiptRow?.status}, detail on the row`);
  }
  check("and it is filed against the customer, so the client record draws it",
    Boolean(receiptRow?.customer_id));

  // MEASURED EVERY RUN, ASSERTED NEVER. This is the number that tells Andrew
  // whether his three minutes in Resend have been done.
  const sink = (await svc(`/rest/v1/email_sends?select=status&to_email=eq.${encodeURIComponent(SINK)}`)).body;
  const tally = {};
  for (const r of (Array.isArray(sink) ? sink : [])) tally[r.status] = (tally[r.status] || 0) + 1;
  keep("delivery-reports.json", tally);
  console.log(`  ..    every send ever to ${SINK}: ${JSON.stringify(tally)}`);
  console.log(tally.delivered
    ? "  ..    Resend's delivery reports ARE arriving — \"did it arrive\" is answerable"
    : "  ..    NO delivery report has ever arrived — the rows stop at \"On its way\"."
      + " FOR-ANDREW.md row 1, three minutes in Resend's dashboard.");
  if (failures.length === 0) completed++;

  // -------------------------------------------------------------------------
  console.log("\n§ 6 — screen: the owner finds all of it on the job, without hunting");
  discovered++; attempted++;

  // THE SAME SELECTORS `sweep-widths.mjs` SIGNS IN WITH, and they are its
  // business: there is one sign-in form in this product and two spellings of
  // it in two scripts is one of them being wrong on the day it changes.
  await page.goto(DASH + "/app", { waitUntil: "domcontentloaded" });
  // `/app`, NOT `/`. On localhost the root is the LANDING page and has no
  // sign-in form on it at all; the form lives behind the dashboard route and
  // `sweep-widths.mjs` has always gone there. Cost this file one run.
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  await page.fill("input[type=email]", OWNER.email);
  await page.fill("input[type=password]", OWNER.password);
  await page.click("form button.btn.primary");
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  // EVERY TAB GUIDE MARKED SEEN BEFORE ANYTHING IS READ. A guide arrives the
  // first time this browser opens a tab and it swallows pointer events on
  // purpose; a fresh browser meets one on every tab. sweep-widths.mjs lost a
  // whole run to this the day the guides shipped.
  await page.evaluate(() => {
    try {
      localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
      localStorage.setItem("dp.tour", "1");
    } catch { /* private mode */ }
  });
  await page.goto(DASH + "/job/" + BOOKING, { waitUntil: "domcontentloaded" });
  // THE ROWS ARRIVE FROM A SECOND QUERY AFTER THE RECORD PAINTS. Waiting for
  // the SUBJECT rather than for a timer is the difference between measuring
  // the screen and measuring the network — `docs/gotchas.md` on sleeps.
  await page.waitForSelector("text=/Receipt/i", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const shot = new URL("job-record.png", ART).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  // Viewport frame, not fullPage: fullPage paints a position: fixed element in the wrong place (ROADMAP 9.11d).
  await page.screenshot({ path: shot }).catch(() => {});
  artifacts.push("artifacts/e2e-receipt-trail/job-record.png");

  // `innerText` AND NOT `textContent` — gotchas.md: `textContent` hands back
  // the text of things nobody can see, which on a record full of collapsed
  // sections is most of it.
  const seen = await page.evaluate(() => document.body.innerText);
  keep("job-record.txt", seen);

  // SABOTAGE `screen`: read the DASHBOARD the record was opened from rather
  // than the record itself. It is a real screen this owner really sees, it
  // carries this customer and this job, and it carries none of the six
  // answers below — which is how a screen check quietly stops measuring the
  // screen it names while still reading a page full of plausible words.
  const text = BREAK === "screen"
    ? await (async () => { await page.goto(DASH + "/app", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2000); return page.evaluate(() => document.body.innerText); })()
    : seen;

  check("the record has a Receipt section", /receipt/i.test(text));
  check("it offers the page the customer sees", /receipt page/i.test(text));
  // READ FROM THE BUTTON, not from the page — same instrument the canary uses,
  // so the two cannot disagree about what "the screen says a receipt went" means.
  const button = BREAK === "screen" ? "" : await page.evaluate(() =>
    ([...document.querySelectorAll("button")].map((b) => b.innerText)
      .find((x) => /email (the receipt|it again)/i.test(x)) ?? ""));
  check("it offers to send it again, having already sent one", /again/i.test(button),
    `the button reads "${String(button).trim()}"`);
  check("it names the address it goes to", text.includes(SINK));
  check("the receipt's own subject is on the job record",
    new RegExp(`receipt[^\\n]*${String(money(job.final_amount)).replace("$", "\\$")}`, "i").test(text),
    "the subject line is not drawn on this screen");
  check("and it says what became of it", /on its way|delivered|bounced|not sent/i.test(text));
  if (failures.length === 0) completed++;

  // -------------------------------------------------------------------------
  console.log("\n§ 7 — THE CANARY: an unsent receipt must not look sent");
  // NOT A TARGET. The negative control, and it is the defect this item found:
  // a paid job with NO receipt behind it must read as one that has not had
  // one. A screen that says "Email it again" over a job nobody emailed is
  // telling the detailer a customer has something they do not have.
  //
  // A SECOND BOOKING, PAID AND NEVER EMAILED, rather than an assertion about
  // the first one with the mail hidden — the row has to be genuinely absent.
  const madeRes = await svc("/rest/v1/bookings", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      business_id: BIZ,
      customer_name: "ROADMAP 5.3 NO RECEIPT",
      // **THE SAME ADDRESS THE PAID JOB USES, AND THAT IS THE WHOLE CANARY.**
      // An unused address makes this trivial — of course a screen with no rows
      // claims nothing. This one has every receipt from every run of this file
      // sitting on it, so the record must tell "a receipt went to this person"
      // apart from "a receipt went for THIS JOB". The first version of the
      // screen could not, and said "Email it again" over a job nobody had ever
      // emailed. A unique amount below is what separates them.
      customer_email: SINK,
      customer_phone: "562-555-0146",
      start_at: "2026-09-12T17:00:00+00:00",
      end_at: "2026-09-12T19:00:00+00:00",
      service_type: "dropoff",
      vehicle_size: "large",
      // A PRICE NOTHING ELSE HAS. The receipt subject carries the amount, so a
      // figure no other job shares is a subject no other row can match.
      subtotal: 70, total_price: 70, final_amount: 73.21,
      status: "completed", payment_status: "paid",
      paid_online_at: new Date().toISOString(),
    }),
  });
  const canaryId = madeRes.body?.[0]?.id;
  if (!canaryId) throw new Error(`could not create the canary booking: ${JSON.stringify(madeRes.body)}`);
  await page.goto(DASH + "/job/" + canaryId, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=/Receipt/i", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const canaryText = await page.evaluate(() => document.body.innerText);
  keep("canary-job-record.txt", canaryText);

  // SABOTAGE `canary`: stand in a product where the screen claims a receipt
  // went out on a job nobody sent one for. The canary must then report that it
  // did not fail, and `receipt.mjs` must refuse the whole run.
  // **THE CLAIM, NOT THE PAGE.** The first version of this line failed the
  // whole run on a canary that was behaving perfectly: it read the body text
  // for "on its way", and the trail under a job HONESTLY carries that about
  // the other mail this person has had. A list headed "Emails to this address"
  // saying true things about other emails is not a claim about this job.
  //
  // The claim is the BUTTON: "Email it again" over a job whose receipt has
  // never gone tells the detailer their customer is holding something they
  // have never been sent. So the button is read by itself, from the DOM, and
  // that is a NARROWER instrument rather than a looser assertion — the thing
  // 14.5 had to learn twice about its own sabotages.
  const canaryButton = await page.evaluate(() =>
    ([...document.querySelectorAll("button")].map((b) => b.innerText)
      .find((x) => /email (the receipt|it again)/i.test(x)) ?? "NO RECEIPT BUTTON AT ALL"));
  keep("canary-button.txt", canaryButton);
  console.log(`  ..    the canary job's receipt button reads "${canaryButton.trim()}"`);
  const canaryLooksSent = BREAK === "canary"
    ? true
    : /again/i.test(canaryButton);
  canary.observed_failure = !canaryLooksSent;
  console.log(canary.observed_failure
    ? "  ok    a job with no receipt behind it does not claim one — the check can tell them apart"
    : "  FAIL  the record claims a receipt was sent for a job that never had one");
  if (!canary.observed_failure) {
    failures.push("the canary passed: an unsent receipt looked sent on the job record");
  }
  await svc(`/rest/v1/bookings?id=eq.${canaryId}`,
    { method: "PATCH", body: JSON.stringify({ deleted_at: new Date().toISOString() }) });
} finally {
  await browser.close();
}

// ---------------------------------------------------------------------------
// A VERDICT AND A RECEIPT ON EVERY EXIT, including the early one where the
// payment leg produced nothing to ask about. The first outing of this file
// died on a null with no receipt written at all — a run that left no trace
// of what it found, which is the exact shape `receipt.mjs` exists to stop.
function finish() {
const status = failures.length === 0 && completed === expected_targets ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "e2e-receipt-trail",
  started_at,
  status,
  expected_targets,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  // **THIS COMMENT SAID 20 AND THE NUMBER SAID 21, AND THE NUMBER WAS RIGHT —
  // resolved 2026-09-22 by counting, and the disagreement is kept rather than
  // tidied away.** Andrew spotted the two disagreeing. There are **21
  // `check(` call sites in this file**, every one of them unconditional
  // within its section and not one of them in a loop, so a clean run executes
  // 21 — which is exactly what the receipt of 2026-09-19 recorded. The "20"
  // was prose that had drifted from its own number, the same class of
  // unreliable derived tally `docs/gotchas.md` describes.
  //
  // **COUNTED, NOT RUN, AND THE REASON MATTERS: this script drives a real
  // card payment** (§ 1 shells out to `e2e-payment.mjs`). Re-running it to
  // settle a comment would have spent money to check arithmetic that reading
  // answers exactly. Whoever next runs it for its own sake regenerates the
  // receipt and clears it.
  min_assertions: 21,
  // **DECLARED BECAUSE A FLOOR EQUAL TO ITS OWN COUNT CANNOT BIND** —
  // `receipt.mjs` refuses a receipt that does not say why.
  // **AND THE FIRST VERSION OF THIS DECLARATION WAS WRONG, DISPROVED BY THE
  // VERY NEXT RUN — 2026-09-23.** It said the count "cannot fall without a
  // diff". It fell to 4 the first time this file was actually run: § 1
  // catches the payment leg's failure and carries on, so a run that loses its
  // subject completes, writes a receipt, and executes a fraction of its
  // assertions. **The floor genuinely binds here**, which is the opposite of
  // the four checks the new rule was written for — in those a thrown error
  // aborts before any receipt exists, so a receipt implies the full count.
  // Kept as a correction rather than rewritten, because "this floor is
  // decoration" and "this floor is the only thing that catches a half-run"
  // are opposite claims about the same number.
  assertion_floor:
    "21 unconditional check() call sites, none inside a loop, so a CLEAN run executes "
    + "exactly 21 — which is why it equals the count on a pass. It is NOT inert: § 1 "
    + "catches its own failure and the run continues, so a run that loses its subject "
    + "completes with far fewer (measured: 4 on 2026-09-23) and the floor is what "
    + "catches it. Equal on a pass, binding on a half-run.",
  failures,
  artifacts,
  warnings: BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : [],
  dimensions: {
    slug: SLUG,
    recipient: SINK,
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expected_targets} targets, ${assertions} assertions, `
  + `${failures.length} failure(s). Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
}
finish();
