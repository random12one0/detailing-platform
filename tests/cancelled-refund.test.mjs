// ROADMAP 14.4 — A PAID BOOKING CAN BE CANCELLED AND SOMEBODY IS TOLD ABOUT
// THE MONEY.
//
// THE DEFECT, MEASURED BEFORE IT WAS FIXED. A confirmed booking already marked
// `paid`, cancelled by an anonymous caller with no apikey and no Authorization
// header, on the deployed `cancel-booking`:
//
//   {"success":true,"booking":{"id":"dbfb72f9…","status":"cancelled"}}
//
// `final_amount` was 195 and stayed 195. `payment_status` was `paid` and
// stayed `paid`. Nothing refunded it, nothing flagged it, and nothing told the
// detailer that $195 was sitting in their Stripe balance for work that will
// not happen. `artifacts/cancelled-refund/before.json` is that run.
//
// ---------------------------------------------------------------------------
// WHY THE FIX IS AN INSTRUCTION AND NOT A REFUND
// ---------------------------------------------------------------------------
// The charge was a DIRECT charge on the detailer's own Stripe account — the
// whole of `_shared/connect.ts` is about why the platform must never hold or
// move that money. So the product cannot give it back, and pretending
// otherwise would be worse than saying nothing. What it can do is put the
// sentence in front of the one person who can act on it, which is what this
// check measures.
//
// ---------------------------------------------------------------------------
// WHAT A TARGET IS HERE, AND WHY IT GROWS BY ITSELF
// ---------------------------------------------------------------------------
// **One target per value `bookings.payment_status` is allowed to hold**, read
// off the CHECK constraint in the migration rather than typed into this file.
// There are four today. A migration that adds a fifth makes this check
// discover five, find no expectation written for it, and FAIL — which is the
// point. A list of four spelled out here would quietly keep passing while the
// new state went unconsidered, and that is this repo's most repeated failure.
//
//   node tests/cancelled-refund.test.mjs
//   node scripts/receipt.mjs receipts/cancelled-refund.json
//
// §§ 1–3 are credential-free. § 4 drives the DEPLOYED endpoint and needs the
// root `.env`; with no credentials it prints SKIPPED, loudly, and writes NO
// receipt — a receipt for a run that never called anything is the exact lie
// `scripts/receipt.mjs` exists to stop.
//
// § 4 SENDS NO EMAIL, DELIBERATELY. Its fixtures live in a business with no
// `contact_email` and carry no `customer_email`, so neither half of
// `cancellationEmail` is ever handed to Resend. The email is proved in § 2 by
// RENDERING it, which is free, deterministic and is what `render-emails.mjs`
// already does. A check that burns the daily send quota is a check nobody runs
// twice.

import "./_env.mjs";           // root .env -> process.env, before anything reads it

import { readFileSync } from "node:fs";
import { writeReceipt } from "../scripts/receipt.mjs";
// Node 24 strips the types, so these are the edge functions' OWN modules — not
// a copy and not a bundle. `connect.ts` has no `fetch` in it for this reason.
import { amountDueCents, refundInstruction, refundOwed } from "../supabase/functions/_shared/connect.ts";
import { cancellationEmail } from "../supabase/functions/_shared/emailTemplates.ts";
import { brandFrom, money } from "../supabase/functions/_shared/emailKit.ts";

const started_at = new Date().toISOString();
const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

let passed = 0;
const failures = [];
let assertions = 0;
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failures.push(`${name} ${detail}`.trim()); console.error(`  FAIL  ${name} ${detail}`); }
};

// ---------------------------------------------------------------------------
// THE EXPECTATION, WRITTEN OUT HERE AND NOT IMPORTED.
// ---------------------------------------------------------------------------
// `connect.ts` decides; this file states independently what the right answer
// is. Two copies on purpose — changing the rule without coming here is the
// change that has to be visible, the same posture `receipt-fields.test.mjs`
// takes toward the public field list.
//
// `partial` OWES WITH NO FIGURE. Nothing in the database records which part
// was paid, so a number here would be a number a detailer refunds. `payability`
// refuses to guess at it for the same reason and this agrees with it.
const EXPECTED = {
  pending: { owed: false, cents: 0 },   // nothing was ever taken
  paid:    { owed: true,  cents: null },  // null = "whatever amountDueCents says"
  partial: { owed: true,  cents: 0 },   // money moved, amount unknown
  waived:  { owed: false, cents: 0 },   // the detailer made this one free
};

// A booking worth $195 at the agreed final amount over a $180 quote — so a
// check that read `total_price` instead of `final_amount` reports the wrong
// figure rather than the same one.
const FIXTURE = { total_price: 180, final_amount: 195 };
const FIXTURE_CENTS = 19500;

// ---------------------------------------------------------------------------
console.log("\n§ 1 — every payment state the database allows has a considered answer");

const MIGRATION = "supabase/migrations/20260827000200_tenant_data.sql";
let statuses = [];
{
  const sql = read(MIGRATION);
  const m = /payment_status\s+text[^\n]*check\s*\(payment_status in \(([^)]*)\)\)/i.exec(sql);
  statuses = m ? [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]) : [];

  check("the migration's CHECK constraint was found and read",
    statuses.length > 0, `nothing parsed out of ${MIGRATION}`);
  // FAIL CLOSED ON A SHRINKING WORLD. Four is what the constraint holds today;
  // discovering fewer means the regex stopped matching, not that the product
  // got simpler, and a check that silently drops targets is the thing this
  // whole discipline exists to catch.
  check("at least the four payment states this file was written against exist",
    statuses.length >= 4, `only ${statuses.length}: ${statuses.join(", ")}`);

  for (const s of statuses) {
    check(`\`${s}\` has an expectation written for it`,
      s in EXPECTED,
      "a new payment state reached the database and nobody decided what cancelling it should say");
  }

  for (const s of statuses.filter((x) => x in EXPECTED)) {
    const want = EXPECTED[s];
    const got = refundOwed({ ...FIXTURE, payment_status: s });
    check(`\`${s}\` — owed is ${want.owed}`,
      got.owed === want.owed, `refundOwed said ${got.owed}`);
    const wantCents = want.cents === null ? amountDueCents(FIXTURE) : want.cents;
    check(`\`${s}\` — the figure is ${wantCents} cents`,
      got.amountCents === wantCents, `refundOwed said ${got.amountCents}`);
  }

  // THE FINAL AMOUNT BEATS THE QUOTE, AND THIS IS THE ONE ASSERTION THAT PROVES
  // IT. `_shared/connect.ts` says the detailer's agreed number wins because
  // that is what was actually charged; a refund instruction naming the quote
  // would send the customer the wrong amount back.
  check("the figure is the detailer's agreed final amount, not the original quote",
    refundOwed({ ...FIXTURE, payment_status: "paid" }).amountCents === FIXTURE_CENTS,
    `expected ${FIXTURE_CENTS} ($195.00), the quote was $180`);
  check(`the instruction prints that figure the way the product spells money (${money(195)})`,
    refundInstruction(refundOwed({ ...FIXTURE, payment_status: "paid" }), money).includes(money(195)),
    refundInstruction(refundOwed({ ...FIXTURE, payment_status: "paid" }), money));
  check("a partly paid booking is told to refund what they paid, with no invented figure",
    /what they paid/.test(refundInstruction(refundOwed({ ...FIXTURE, payment_status: "partial" }), money))
    && !/\$/.test(refundInstruction(refundOwed({ ...FIXTURE, payment_status: "partial" }), money)),
    refundInstruction(refundOwed({ ...FIXTURE, payment_status: "partial" }), money));
}

// ---------------------------------------------------------------------------
console.log("\n§ 2 — the owner's cancellation email, RENDERED, carries the instruction");

// Built by `brandFrom` rather than field by field, for the reason
// `render-emails.mjs` gives: a hand-assembled brand silently disagrees with
// production.
const brand = {
  ...brandFrom({
    brandName: "Ridgeline Auto Detail",
    contactPhone: "(303) 555-0142",
    siteUrl: "https://detailingplatform.com/book/demo-detail",
    logoUrl: null,
  }, "#1F6F4A"),
  contactEmail: "hello@ridgelinedetail.example",
};

const emailFixture = (payment_status) => ({
  id: "7f3ab210-55c1-4e0a-9d2e-31b6c4a90e77",
  lang: null,
  customerName: "Dana Ortiz",
  customerPhone: "(720) 555-0188",
  customerEmail: "dana.ortiz@example.com",
  customerAddress: "1420 Larimer St, Denver, CO 80202",
  dateStr: "2026-12-17",
  startTime: "10:00",
  endTime: "13:30",
  serviceType: "mobile",
  vehicleSize: "Mid-size SUV",
  vehicleModel: "2021 Subaru Outback",
  customerNotes: null,
  serviceNames: [],
  addOnNames: [],
  travelFee: 0,
  travelZone: null,
  adjustments: [],
  subtotal: 180,
  siteDiscount: 0,
  siteDiscountPercent: 0,
  promoCode: null,
  promoDiscount: 0,
  total: 180,
  receiptUrl: "https://detailingplatform.com/b/7f3ab210",
  refundNote: refundInstruction(refundOwed({ ...FIXTURE, payment_status }), money),
});

/** THE ONE COMPARATOR. § 2, the canary and nothing else all go through it. */
const ownerTellsThem = (html) => /Refund .* from your own Stripe/.test(html);

for (const s of statuses.filter((x) => x in EXPECTED)) {
  const want = EXPECTED[s].owed;
  const owner = cancellationEmail(brand, emailFixture(s), true);
  const customer = cancellationEmail(brand, emailFixture(s), false);

  check(`\`${s}\` — the owner's email ${want ? "says" : "does not say"} to refund it`,
    ownerTellsThem(owner.html) === want,
    `the rendered owner email ${ownerTellsThem(owner.html) ? "does" : "does not"} carry the instruction`);

  if (want) {
    check(`\`${s}\` — and the customer's half never names Stripe`,
      !/Stripe/i.test(customer.html),
      "the customer was handed an instruction written for the detailer");
  }
  // THE FIGURE IS IN THE SENTENCE, NOT ONLY IN THE FACTS TABLE. "Was worth
  // $180" already sat in this email and is the QUOTE; a detailer reading only
  // that would refund fifteen dollars too little.
  if (s === "paid") {
    // AND IT IS SPELLED THE WAY THE REST OF THE EMAIL SPELLS MONEY. The facts
    // table two rows above says "Was worth $180"; a sentence saying "$195.00"
    // beside it is two voices about one kind of fact, which is exactly what
    // looking at the rendered email caught.
    check(`\`paid\` — the owner's email prints ${money(195)}, the amount actually charged, in the house spelling`,
      owner.html.includes(`Refund ${money(195)} from your own Stripe`),
      "the instruction is missing, or spells the figure some other way");
  }
}

// ---------------------------------------------------------------------------
console.log("\n§ 3 — the job screen restates the same rule, for the paths that send no email");

// TWO OF THE THREE CANCEL PATHS SEND THE DETAILER NOTHING. `respond-to-booking`
// (declining a request) and `update-booking` (the "Cancel the job" button)
// write `status: "cancelled"` and email only the customer, or nobody. So the
// screen is not a nicety here — it is the ONLY place those two paths can say
// anything, and it works because it is a fact about the ROW rather than a
// message passed back from whichever endpoint did it.
//
// THIS SECTION READS SOURCE AND `docs/gotchas.md` IS RIGHT THAT SUCH A CHECK
// IS COUPLED TO A SPELLING. It is kept as a supporting assertion and NOT as a
// target for exactly that reason: the targets above and below are behaviour.
{
  const jsx = read("app/src/components/BookingDetail.jsx");
  const es = read("app/src/lib/strings/appEs.js");

  check("the screen's condition covers both states that owe money",
    /refundOwed\s*=\s*cancelled[\s\S]{0,200}"paid"[\s\S]{0,80}"partial"/.test(jsx),
    "the job screen does not draw the instruction for one of `paid` / `partial`");
  check("it reads the agreed final amount before the quote, like the endpoint does",
    /booking\.final_amount \?\? booking\.total_price/.test(jsx));

  // CLAUDE.md: a renamed English string falls back to English with no error
  // anywhere, so the pair is checked rather than assumed.
  for (const line of jsx.split("\n")) {
    const m = /t\("(This was paid\.[^"]*|Part of this was paid\.[^"]*)"/.exec(line);
    if (m) {
      check(`the Spanish key exists for "${m[1].slice(0, 34)}…"`,
        es.includes(m[1]), "renamed without its Spanish key — it will silently fall back to English");
    }
  }
}

// ---------------------------------------------------------------------------
console.log("\n§ 4 — the DEPLOYED cancel-booking, one real booking per payment state");

let discovered = 0, attempted = 0, completed = 0;
const probed = [];
const canary = { id: "owner-email-with-the-refund-note-stripped", observed_failure: false };

// A business with NO contact_email, so cancelling sends nothing to anybody.
const BIZ = "e25dd47a-2cc8-422a-95cc-cd85f51c0d5d";   // Phase1 Detailing A

if (!URL_ || !SERVICE) {
  console.log("  SKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.");
  console.log("  NOTHING in § 4 ran, and NO receipt was written. This is not a pass.");
} else if (!URL_.includes("kguqylyzgyzfktkfnhjb")) {
  // CLAUDE.md's first hard rule. This check WRITES, and the live business
  // project takes real customers' money.
  console.log(`  REFUSED — ${URL_} is not the development project. § 4 writes bookings.`);
  console.log("  NOTHING in § 4 ran, and NO receipt was written.");
} else {
  const svc = async (path, init = {}) => {
    const res = await fetch(URL_ + path, {
      ...init,
      headers: {
        apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
        "Content-Type": "application/json", Prefer: "return=representation",
        ...(init.headers ?? {}),
      },
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  // ONE FLAGGED FIXTURE PER STATE, REUSED RATHER THAN PILED UP. ROADMAP 0.3 is
  // flag, don't delete — so a run that finds its own row already cancelled
  // puts it back to `confirmed` instead of making a new one. Far-future dates
  // clear every cancellation window, and a day apart each so the database's
  // overlap constraint has nothing to complain about.
  const fixtureName = (s) => `ROADMAP 14.4 CHECK - ${s}`;
  const live = [];
  for (const [i, s] of statuses.entries()) {
    const name = fixtureName(s);
    const day = String(10 + i).padStart(2, "0");
    const found = (await svc(
      `/rest/v1/bookings?select=id,status,payment_status,total_price,final_amount`
      + `&business_id=eq.${BIZ}&customer_name=eq.${encodeURIComponent(name)}&deleted_at=is.null`,
    )).body;

    let row = Array.isArray(found) && found[0];
    if (!row) {
      row = (await svc("/rest/v1/bookings", {
        method: "POST",
        body: JSON.stringify({
          business_id: BIZ, customer_name: name, customer_phone: "555-0144",
          customer_email: null,                       // nothing is emailed
          start_at: `2027-03-${day}T18:00:00+00:00`, end_at: `2027-03-${day}T20:00:00+00:00`,
          service_type: "mobile", vehicle_size: "small",
          subtotal: 180, total_price: 180, final_amount: 195,
          payment_status: s, status: "confirmed", lang: "en",
        }),
      })).body?.[0];
    } else if (row.status !== "confirmed" || row.payment_status !== s) {
      row = (await svc(`/rest/v1/bookings?id=eq.${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "confirmed", payment_status: s, final_amount: 195 }),
      })).body?.[0];
    }
    if (row) live.push({ payment_status: s, row });
  }

  discovered = live.length;
  check("a live fixture exists for every payment state the database allows",
    discovered === statuses.length,
    `${discovered} of ${statuses.length}: missing ${statuses.filter((s) => !live.some((l) => l.payment_status === s)).join(", ")}`);

  for (const { payment_status: s, row } of live) {
    attempted++;
    // NO apikey AND NO Authorization. The booking's own uuid is the whole
    // credential — this is the customer clicking the link in their email, and
    // it is how the defect was reachable in the first place.
    const res = await fetch(`${URL_}/functions/v1/cancel-booking`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: row.id }),
    });
    const body = await res.json().catch(() => null);

    const want = EXPECTED[s] ?? { owed: null };
    check(`\`${s}\` — the deployed endpoint cancelled it`,
      res.status === 200 && body?.booking?.status === "cancelled",
      `${res.status} ${JSON.stringify(body).slice(0, 160)}`);
    check(`\`${s}\` — and its answer says owed=${want.owed}`,
      body?.refund?.owed === want.owed,
      `it said ${JSON.stringify(body?.refund)}`);
    check(`\`${s}\` — the customer ${want.owed ? "is" : "is not"} told about their money`,
      Boolean(body?.refund?.message) === want.owed,
      `message: ${JSON.stringify(body?.refund?.message)}`);
    if (want.owed) {
      // The refund instruction is the DETAILER's. A customer must never be
      // handed it, and the deployed answer is the one place that could leak it.
      check(`\`${s}\` — and is not handed the detailer's Stripe instruction`,
        !/Stripe/i.test(JSON.stringify(body)),
        "the public answer named Stripe");
    }
    // THE MONEY IS UNTOUCHED, WHICH IS THE POINT. The platform does not refund
    // on a connected account; if `payment_status` moved, something reached into
    // the detailer's books.
    const after = (await svc(`/rest/v1/bookings?select=status,payment_status&id=eq.${row.id}`)).body?.[0];
    check(`\`${s}\` — the row is cancelled and its payment state is untouched`,
      after?.status === "cancelled" && after?.payment_status === s,
      JSON.stringify(after));

    probed.push({ payment_status: s, id: row.id, refund: body?.refund ?? null });
    completed++;
  }

  // -------------------------------------------------------------------------
  // THE NEGATIVE CONTROL. Take the owner's cancellation email for the PAID
  // case — the one that must carry the instruction — build it with the note
  // dropped, and run § 2's own comparator over it. If that still reads as
  // clean, every green line in § 2 is worthless.
  const stripped = cancellationEmail(brand, { ...emailFixture("paid"), refundNote: null }, true);
  canary.observed_failure = ownerTellsThem(stripped.html) === false;
  canary.reported = ownerTellsThem(stripped.html) ? "still reported as carrying the instruction" : "caught";
  check("the canary — an owner email with the refund note dropped is caught",
    canary.observed_failure, "the comparator cannot see the defect it was handed on purpose");
}

// ---------------------------------------------------------------------------
const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions.`);

if (URL_ && SERVICE && discovered > 0) {
  const { path } = writeReceipt({
    check_id: "cancelled-refund",
    started_at,
    status: failed ? "fail" : "pass",
    expected_targets: statuses.length,
    discovered_targets: discovered,
    attempted_targets: attempted,
    completed_targets: completed,
    skipped_targets: 0,
    assertions_executed: assertions,
    // FOUR STATES x (2 in § 1 + 1 in § 2 + 4 in § 4) plus the fixed assertions
    // in §§ 1–3 and the canary. Lowering it is a visible diff somebody has to
    // justify, which is the only thing that makes a floor a floor.
    min_assertions: 36,
    failures,
    dimensions: {
      endpoint: "cancel-booking",
      auth: "none",
      payment_states: statuses,
      probed,
    },
    artifacts: ["artifacts/cancelled-refund"],
    canary,
  });
  console.log(`receipt: ${path}`);
} else {
  console.log("no receipt written — § 4 did not run.");
}

process.exit(failed ? 1 : 0);
