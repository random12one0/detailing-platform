// What a DETAILER pays US — roadmap 2.20 stage 2.
//
// WHY THIS FILE EXISTS, and it is one sentence: this is the first place in the
// product where the repo's oldest rule is literally true rather than a
// metaphor. *A number PRINTED on a screen is not a number that is CHARGED* —
// `/pricing` prints, `lineItemsFor()` charges, and until this suite existed the
// only thing joining them was a person reading two files. `tests/
// landing-pricing.test.mjs` guards the printing; this guards the charging and
// the seam between them.
//
// WHAT IT HOLDS, in the order it would hurt:
//
//   1. THE TIE-OUT. Every rung on the pricing page, founding and list, against
//      the money `platform-billing` hands Stripe. A mismatch is a card charged
//      an amount nobody was shown, which is a chargeback and — with an
//      early-exit fee in the mix — the exact thing the FTC sued Adobe over.
//   2. THE SECOND COPY OF THE PRICE TABLE. `_shared/platformBilling.ts` cannot
//      import `app/src/landing/pricing.js` (a Deno bundle will not follow an
//      import out of `supabase/`), so there are two, exactly as there are two
//      copies of the colour engine. CLAUDE.md allows that and charges a test
//      for it. This is the test.
//   3. THE CONSENT SENTENCE. It is stored and quoted back in a dispute, so it
//      has to name the amount, the frequency, the commitment and the fee — and
//      must NOT invent a commitment on a plan that has none.
//   4. THE EXIT FEE. Arithmetic on money taken off somebody. Zero where there
//      is no term, zero once the term runs out, and equal to the worked
//      example `/pricing` itself prints.
//   5. THE WEBHOOK SIGNATURE. The one public endpoint in this repo that writes,
//      with no bearer token — the signature IS the authentication. A forged
//      `invoice.paid` is a free subscription; a forged
//      `customer.subscription.deleted` takes a competitor's booking page down.
//
// Credential-free, no dev server, no browser, no Stripe key.
//
//   node tests/platform-billing.test.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { PRICING } from "../app/src/landing/pricing.js";
// Node 24 strips the types, so these are the SAME modules the edge functions
// run — not a description of them.
import {
  PRICES, TERMS, consentSentence, dunningState, exitFeeCents, exitFeeCentsFor,
  firstChargeCents, isPlan, isTerm, lineItemsFor, ourStatus, planFor, planLabel,
  termEndDate, wholeMonthsBetween,
} from "../supabase/functions/_shared/platformBilling.ts";
import { flatten, verifyWebhook } from "../supabase/functions/_shared/stripe.ts";
import { billingEmail } from "../supabase/functions/_shared/emailTemplates.ts";
import { platformBrand, PLATFORM_NAME } from "../supabase/functions/_shared/platformBrand.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};
const usd = (c) => `$${(c / 100).toFixed(2)}`;

// ─── 1. THE TWO PRICE TABLES ARE ONE TABLE ────────────────────────────────
//
// Value by value, both directions. A figure added to `pricing.js` and not to
// `platformBilling.ts` is a page advertising a plan the checkout cannot sell;
// the reverse is a card charged a number no page has ever shown.
{
  console.log("\n1. the price table, mirrored");

  check("website setup",        PRICES.website.setup === PRICING.website.setup, `${PRICES.website.setup} vs ${PRICING.website.setup}`);
  check("website monthly",      PRICES.website.monthly === PRICING.website.monthly);
  check("website annual",       PRICES.website.annual === PRICING.annual);
  check("website month-to-month", PRICES.website.monthToMonth === PRICING.monthToMonth);
  check("booking only",         PRICES.bookingOnly.monthly === PRICING.bookingOnly.monthly);
  check("founding setup",       PRICES.founding.setup === PRICING.founding.setup);
  check("founding monthly",     PRICES.founding.monthly === PRICING.founding.monthly);
  check("founding annual",      PRICES.founding.annual === PRICING.founding.annual);
  check("founding month-to-month", PRICES.founding.monthToMonth === PRICING.founding.monthToMonth);
  check("the term",             PRICES.term.months === PRICING.term.months);
  check("the exit-fee share",   PRICES.term.exitFeeShare === PRICING.term.exitFeeShare);

  // AND NO KEY EXISTS ON ONE SIDE ONLY. The checks above name every field they
  // know about, which is exactly the shape that goes quietly stale when a
  // fourth way to pay is added — the same vacuous-check family as
  // `landing-pricing` 1 and `email-brand` 7a-ii.
  const ours = Object.keys(PRICES.website).sort().join(",");
  check("website has exactly the four fields both files agree on",
    ours === "annual,monthToMonth,monthly,setup", ours);
  const theirs = Object.keys(PRICING.founding).sort().join(",");
  check("founding has exactly the four fields both files agree on",
    theirs === "annual,monthToMonth,monthly,setup", theirs);
}

// ─── 2. THE TIE-OUT: WHAT THE PAGE PRINTS IS WHAT THE CARD IS CHARGED ──────
{
  console.log("\n2. the tie-out — printed vs charged");

  for (const founding of [false, true]) {
    const p = founding ? PRICING.founding : { ...PRICING.website, annual: PRICING.annual, monthToMonth: PRICING.monthToMonth };
    const who = founding ? "founding" : "list";

    // The three headline figures the page prints on its three rungs. Each one
    // is "what leaves the bank", never an effective monthly — the page's own
    // locked framing, and the reason this comparison is against the RECURRING
    // line rather than against some derived per-month number.
    const printed = {
      "annual-upfront": p.annual,
      "annual-monthly": p.monthly,
      "monthly": p.monthToMonth,
    };

    for (const term of TERMS) {
      const snap = planFor("website", term, founding);
      const items = lineItemsFor(snap);
      const recurring = items.find((i) => i.price_data.recurring);
      const oneOff = items.find((i) => !i.price_data.recurring);

      check(`${who} · ${term} · the recurring line is what the rung prints`,
        recurring.price_data.unit_amount === Math.round(printed[term] * 100),
        `${usd(recurring.price_data.unit_amount)} vs $${printed[term]}`);

      check(`${who} · ${term} · the setup fee is its own line`,
        oneOff && oneOff.price_data.unit_amount === Math.round(p.setup * 100),
        JSON.stringify(oneOff));

      check(`${who} · ${term} · first charge = setup + first period`,
        firstChargeCents(snap) === Math.round((p.setup + printed[term]) * 100),
        usd(firstChargeCents(snap)));

      check(`${who} · ${term} · the interval matches the figure`,
        recurring.price_data.recurring.interval === (term === "annual-upfront" ? "year" : "month"));

      check(`${who} · ${term} · every line is a whole number of cents in usd`,
        items.every((i) => Number.isInteger(i.price_data.unit_amount)
          && i.price_data.unit_amount > 0
          && i.price_data.currency === "usd"),
        JSON.stringify(items));
    }
  }

  // BOOKING-ONLY: one price, one month, no build fee, no term. `/pricing`'s
  // own button carries no `?term=` at all, so this normalises rather than
  // rejecting — and it must never pick up the website ladder's setup fee.
  const b = planFor("booking", "annual-monthly", true);
  check("booking-only charges $35 a month and nothing else",
    b.recurring_cents === PRICING.bookingOnly.monthly * 100 && b.setup_cents === 0
      && b.term_months === 0 && b.bill_interval === "month",
    JSON.stringify(b));
  check("booking-only ignores a term it was handed", b.term === "monthly", b.term);
  check("booking-only is never founding", b.founding === false);
  check("booking-only sends exactly one line item", lineItemsFor(b).length === 1);
}

// ─── 3. THE FOUNDING LADDER IS DERIVED, NOT A SECOND SET OF OPINIONS ───────
//
// The same two rules `landing-pricing` pins on the printing side, asserted
// here on the charging side: a new founding number that stops following them
// fails BOTH suites, which is what tells the owner a figure stopped making
// sense rather than merely that it changed.
{
  console.log("\n3. the ladder's own rules");

  for (const [who, p] of [["list", { monthly: PRICING.website.monthly, annual: PRICING.annual, m2m: PRICING.monthToMonth }],
                          ["founding", { monthly: PRICING.founding.monthly, annual: PRICING.founding.annual, m2m: PRICING.founding.monthToMonth }]]) {
    const monthsFree = (p.monthly * 12 - p.annual) / p.monthly;
    check(`${who} · annual is a whole number of months free`,
      Number.isInteger(monthsFree) && monthsFree === 2, String(monthsFree));
    check(`${who} · month-to-month is the 25% no-commitment premium`,
      p.m2m === p.monthly * 1.25, `${p.m2m} vs ${p.monthly * 1.25}`);
  }
}

// ─── 4. THE CONSENT SENTENCE ──────────────────────────────────────────────
//
// AB 2863 wants express affirmative consent, and what makes the consent worth
// storing is the WORDS. It is generated from the snapshot rather than typed
// into the screen so the sentence and the charge cannot disagree — these
// checks are what stops it disagreeing with itself.
{
  console.log("\n4. the consent sentence");

  const term = consentSentence(planFor("website", "annual-monthly", true));
  check("names the recurring amount", term.includes("$40"), term);
  check("names the build fee", term.includes("$499"), term);
  check("says it renews by itself", /renews by itself/i.test(term), term);
  check("says cancelling is possible and where", /cancel any time/i.test(term), term);
  check("names the twelve-month commitment", /12 months/.test(term), term);
  check("names the exit fee as a percentage", /50%/.test(term), term);
  // THE WORKED EXAMPLE IS THE PART PEOPLE MISREAD. "Half of what's left" reads
  // to most people as half the whole thing, which is why /pricing prints an
  // example and why the tick does too.
  check("carries a worked example of the fee", /for example \$120/.test(term), term);

  const noTerm = consentSentence(planFor("website", "monthly", false));
  check("month-to-month names its own price", noTerm.includes("$75"), noTerm);
  // A COMMITMENT INVENTED ON A PLAN THAT HAS NONE IS THE WORST FAILURE THIS
  // SENTENCE CAN HAVE: it is a promise to charge a fee we would have no right
  // to take.
  check("month-to-month promises NO commitment and NO fee",
    !/committing/i.test(noTerm) && !/%/.test(noTerm), noTerm);
  check("pay-for-the-year promises no commitment either",
    !/committing/i.test(consentSentence(planFor("website", "annual-upfront", false))));
  check("pay-for-the-year says every year, not every month",
    /every year/.test(consentSentence(planFor("website", "annual-upfront", false))));
}

// ─── 5. THE EXIT FEE ──────────────────────────────────────────────────────
{
  console.log("\n5. the early-exit fee");

  const row = (over) => ({
    recurring_cents: 6000, term_months: 12, exit_fee_share: 0.5, term_ends_on: null, ...over,
  });

  // THE WORKED EXAMPLE /pricing PRINTS. Six months left, $60 a month, half:
  // $180. If this and the page ever disagree, the page has promised one number
  // and the card has taken another.
  check("halfway through a year = half of the six months left",
    exitFeeCents(row({ term_ends_on: "2027-03-05" }), new Date("2026-09-05T00:00:00Z")) === 18000,
    usd(exitFeeCents(row({ term_ends_on: "2027-03-05" }), new Date("2026-09-05T00:00:00Z"))));

  check("nothing to pay once the term has run out",
    exitFeeCents(row({ term_ends_on: "2026-09-01" }), new Date("2026-09-05T00:00:00Z")) === 0);
  check("nothing to pay on a plan with no term",
    exitFeeCents(row({ term_months: 0, exit_fee_share: 0, term_ends_on: "2027-09-05" })) === 0);
  check("nothing to pay when no end date was ever recorded",
    exitFeeCents(row({ term_ends_on: null })) === 0);
  // A DATE FAR IN THE FUTURE MUST NOT CHARGE MORE THAN THE TERM. A row whose
  // end date was extended by hand would otherwise bill years of months.
  check("never more than the whole term, whatever the date says",
    exitFeeCents(row({ term_ends_on: "2040-01-01" }), new Date("2026-09-05T00:00:00Z")) === 36000);
  check("never negative", exitFeeCentsFor(6000, -5, 0.5) === 0);
  check("a garbled date charges nothing rather than NaN",
    exitFeeCents(row({ term_ends_on: "not-a-date" })) === 0);

  // WHOLE months only, floored — the conservative reading, because this
  // number is multiplied by money we take off somebody.
  check("a part-month is not a month",
    wholeMonthsBetween(new Date("2026-09-20T00:00:00Z"), new Date("2026-10-19T00:00:00Z")) === 0);
  check("a full month is a month",
    wholeMonthsBetween(new Date("2026-09-20T00:00:00Z"), new Date("2026-10-20T00:00:00Z")) === 1);
  check("a past date is zero, never negative",
    wholeMonthsBetween(new Date("2026-10-20T00:00:00Z"), new Date("2026-09-20T00:00:00Z")) === 0);

  // THE MONTH-OVERFLOW CASE, the same clamp `tests/plans.test.mjs` pins for
  // `addPeriod` — 31 January plus twelve months has to land somewhere real.
  check("a term started on the 31st ends on a real date",
    /^\d{4}-\d{2}-\d{2}$/.test(termEndDate(new Date("2026-01-31T00:00:00Z"), 12)),
    String(termEndDate(new Date("2026-01-31T00:00:00Z"), 12)));
  check("twelve months from today is a year out",
    termEndDate(new Date("2026-09-05T00:00:00Z"), 12) === "2027-09-05",
    String(termEndDate(new Date("2026-09-05T00:00:00Z"), 12)));
  check("no term means no end date", termEndDate(new Date(), 0) === null);
}

// ─── 6. STRIPE'S EIGHT STATUSES INTO OUR FIVE ─────────────────────────────
{
  console.log("\n6. the status mapping");

  check("active is active", ourStatus("active") === "active");
  check("trialing counts as active", ourStatus("trialing") === "active");
  check("past_due is past_due", ourStatus("past_due") === "past_due");
  check("unpaid is our suspended", ourStatus("unpaid") === "suspended");
  check("canceled is canceled", ourStatus("canceled") === "canceled");
  check("incomplete_expired is a cancellation, not a limbo",
    ourStatus("incomplete_expired") === "canceled");
  // THE ONE THAT MATTERS MOST AND LOOKS LIKE A DETAIL. A status Stripe adds
  // later must not default to anything: `active` gives the product away and
  // `suspended` takes a paying detailer's booking page down because Stripe
  // shipped a feature we do not use. Null means the caller keeps what it had.
  check("a status we have never heard of maps to nothing",
    ourStatus("some_future_status") === null && ourStatus(undefined) === null);

  // The five words are what the schema's own check constraint allows. A sixth
  // reaching an UPDATE is a write that fails at 3am inside a webhook.
  const allowed = ["incomplete", "active", "past_due", "suspended", "canceled"];
  const migration = read("supabase/migrations/20260905000000_platform_billing.sql");
  for (const w of allowed) {
    check(`the schema allows "${w}"`, migration.includes(`'${w}'`));
  }
  const mapped = new Set(["active", "trialing", "past_due", "unpaid", "paused", "canceled", "incomplete", "incomplete_expired"]
    .map(ourStatus));
  check("every status the mapping produces is one the schema allows",
    [...mapped].every((m) => allowed.includes(m)), [...mapped].join(","));
}

// ─── 7. THE DUNNING WORDS ARE THE PROMISE /pricing PRINTS ─────────────────
//
// The pricing page says, in print: *"we try the card again over the following
// two weeks and email you each time. If it still has not gone through after
// that, the site goes offline until it is paid. Nothing is deleted."* That is
// a promise the checkout is bound by, so the words the detailer is shown have
// to keep it — and they must not count retries out loud, because the retry
// schedule lives in Stripe's dashboard and a product that prints "2 tries
// left" lies the day somebody changes it.
{
  console.log("\n7. what the detailer is told");

  const ok = dunningState({ status: "active", dunning_attempts: 0 });
  check("an active subscription says nothing at all",
    ok.level === "ok" && ok.headline === "" && ok.detail === "");
  check("no subscription says nothing at all", dunningState(null).level === "ok");

  const late = dunningState({ status: "past_due", dunning_attempts: 1 });
  check("past due warns rather than alarms", late.level === "warn");
  check("past due promises two weeks of retries", /two weeks/i.test(late.detail), late.detail);
  check("past due says the page goes offline after that", /offline/i.test(late.detail), late.detail);
  check("past due promises nothing is deleted", /deleted/i.test(late.detail), late.detail);
  check("past due does not count attempts out loud",
    !/\d+ of \d+|tries? left|attempts? left/i.test(late.detail), late.detail);

  const down = dunningState({ status: "suspended", dunning_attempts: 4 });
  check("suspended is the loudest level", down.level === "down");
  check("suspended says the page is offline", /offline/i.test(down.headline), down.headline);
  // THE SENTENCE THAT STOPS A PANIC. A detailer whose page just went dark
  // assumes their customer list went with it.
  check("suspended says nothing has been deleted", /deleted/i.test(down.detail), down.detail);
  check("suspended says what brings it back", /payment goes through/i.test(down.detail), down.detail);
}

// ─── 8. THE WEBHOOK SIGNATURE — the only authentication that endpoint has ──
{
  console.log("\n8. the webhook signature");

  const SECRET = "whsec_test_secret";
  const body = JSON.stringify({ id: "evt_1", type: "invoice.paid", data: { object: {} } });
  const now = 1_757_000_000;

  const sign = async (payload, secret, t) => {
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
    return Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  };
  const rejects = async (raw, header, secret = SECRET, t = now) => {
    try { await verifyWebhook(raw, header, secret, 300, t); return false; } catch { return true; }
  };

  const good = `t=${now},v1=${await sign(body, SECRET, now)}`;
  const event = await verifyWebhook(body, good, SECRET, 300, now);
  check("a correctly signed event is accepted and parsed", event.id === "evt_1");

  check("no signature header is refused", await rejects(body, null));
  check("a header with no v1 is refused", await rejects(body, `t=${now}`));
  check("a wrong signature is refused",
    await rejects(body, `t=${now},v1=${"0".repeat(64)}`));
  check("the right signature under the WRONG SECRET is refused",
    await rejects(body, `t=${now},v1=${await sign(body, "whsec_someone_else", now)}`));

  // A TAMPERED BODY IS THE ATTACK. Same timestamp, same header, one field
  // changed — this is what "give me a free subscription" actually looks like.
  const tampered = JSON.stringify({ id: "evt_1", type: "invoice.paid", data: { object: { hacked: true } } });
  check("a tampered body under a valid signature is refused",
    await rejects(tampered, good));

  // REPLAY. Without a tolerance a captured request works for ever.
  check("a signature from six minutes ago is refused",
    await rejects(body, `t=${now - 400},v1=${await sign(body, SECRET, now - 400)}`));
  check("a signature from the future is refused too",
    await rejects(body, `t=${now + 400},v1=${await sign(body, SECRET, now + 400)}`));
  check("four minutes old is still accepted",
    !(await rejects(body, `t=${now - 240},v1=${await sign(body, SECRET, now - 240)}`)));

  // A ROTATING SECRET MEANS TWO v1 VALUES. Refusing the second is an outage
  // in the middle of a key rotation.
  check("one good signature among several is enough",
    !(await rejects(body, `t=${now},v1=${"0".repeat(64)},v1=${await sign(body, SECRET, now)}`)));

  check("an unconfigured secret refuses everything", await rejects(body, good, ""));

  // AND THE RAW BODY IS WHAT IS SIGNED. Re-serialising drops whitespace and
  // reorders keys, so a handler that parses before verifying verifies nothing.
  const spaced = `{ "id": "evt_1", "type": "invoice.paid" }`;
  check("whitespace changes the signature (the raw body is the subject)",
    await rejects(spaced, `t=${now},v1=${await sign(JSON.parse(spaced) && JSON.stringify(JSON.parse(spaced)), SECRET, now)}`));
}

// ─── 9. FORM ENCODING — a mis-nested key is silently ignored by Stripe ─────
//
// Stripe does not reject an unrecognised parameter; it stores what it
// understood. So a broken `line_items[0][price_data][unit_amount]` is a
// checkout session that succeeds with no amount on it.
{
  console.log("\n9. form encoding");

  const enc = (o) => new URLSearchParams(flatten(o)).toString();
  check("a nested object brackets its path",
    enc({ a: { b: 1 } }) === "a%5Bb%5D=1", enc({ a: { b: 1 } }));
  check("an array indexes its path",
    decodeURIComponent(enc({ a: [{ b: 1 }, { b: 2 }] })) === "a[0][b]=1&a[1][b]=2",
    decodeURIComponent(enc({ a: [{ b: 1 }, { b: 2 }] })));
  check("null and undefined are dropped, never sent as words",
    enc({ a: null, b: undefined, c: 1 }) === "c=1", enc({ a: null, b: undefined, c: 1 }));
  check("false and zero are NOT dropped",
    decodeURIComponent(enc({ a: false, b: 0 })) === "a=false&b=0", enc({ a: false, b: 0 }));

  // The real payload, end to end.
  const wire = decodeURIComponent(enc({ line_items: lineItemsFor(planFor("website", "annual-monthly", true)) }));
  check("the real line items encode the founding monthly price",
    wire.includes("line_items[0][price_data][unit_amount]=4000"), wire);
  check("the real line items encode the build fee",
    wire.includes("line_items[1][price_data][unit_amount]=49900"), wire);
  check("the real line items encode the interval",
    wire.includes("line_items[0][price_data][recurring][interval]=month"), wire);
}

// ─── 10. THE SEAM: THE PAGE, THE SCREEN AND THE SERVER USE ONE VOCABULARY ──
//
// `/pricing` puts `?term=` in its own links, `CreateBusiness` carries it,
// `Billing.jsx` reads it and `platform-billing` validates it. Four files, one
// set of three strings — and a rung whose string nothing recognises is a
// button that silently falls back to a different plan from the one pressed.
{
  console.log("\n10. one vocabulary across four files");

  const pricingPage = read("app/src/landing/PricingPage.jsx");
  for (const term of TERMS) {
    check(`/pricing links to "${term}"`, pricingPage.includes(`buy("${term}")`), term);
  }

  const billing = read("app/src/screens/more/Billing.jsx");
  for (const term of TERMS) {
    check(`the billing screen has a rung for "${term}"`, billing.includes(`"${term}"`), term);
  }
  // AND NO FOURTH RUNG THE SERVER HAS NEVER HEARD OF. A rung whose key fails
  // `isTerm` falls back to annual-monthly on the server, so the detailer would
  // be charged for a plan they did not press.
  const rungKeys = [...billing.matchAll(/^\s*\["([a-z-]+)",/gm)].map((m) => m[1]);
  check("every rung on the screen is a term the server accepts",
    rungKeys.length === TERMS.length && rungKeys.every(isTerm), rungKeys.join(","));

  check("isTerm refuses anything else", !isTerm("annual") && !isTerm("") && !isTerm(null));
  check("isPlan is closed too", isPlan("website") && isPlan("booking") && !isPlan("pro"));

  // THE LABEL A DETAILER SEES ON THEIR CARD STATEMENT. Not "sub_1AbC" and not
  // a product id — the one thing standing between an unrecognised line on a
  // bank statement and a chargeback.
  check("the charge names itself in plain words",
    /website/i.test(planLabel(planFor("website", "monthly", false)))
      && /booking/i.test(planLabel(planFor("booking", "monthly", false))),
    planLabel(planFor("website", "monthly", false)));
}

// ─── 11. THE KEY IS NOWHERE IT COULD REACH A BROWSER ──────────────────────
//
// A Stripe SECRET key in the frontend bundle is a total compromise of the
// account: it can charge, refund and read every customer. `VITE_` is the only
// prefix Vite inlines, so this is the one thing worth asserting mechanically
// rather than remembering.
{
  console.log("\n11. the key");

  const appFiles = [
    "app/src/lib/api.js", "app/src/screens/more/Billing.jsx",
    "app/src/landing/PricingPage.jsx", "app/src/App.jsx",
    "app/src/context/BusinessContext.jsx", "app/src/screens/CreateBusiness.jsx",
  ];
  for (const f of appFiles) {
    const src = read(f);
    check(`${f} carries no Stripe key`,
      !/VITE_STRIPE|sk_live|sk_test|whsec_/.test(src));
  }
  // The env file the owner will eventually fill in must not be the place a
  // Stripe key lands either — these are Supabase FUNCTION secrets, set on the
  // project, and a key in `.env` is a key one `git add -f` from being public.
  const stripeSrc = read("supabase/functions/_shared/stripe.ts");
  check("the key is read from the function environment and nowhere else",
    stripeSrc.includes('Deno.env.get("STRIPE_SECRET_KEY")')
      && !/sk_live_[A-Za-z0-9]/.test(stripeSrc));
  check("the webhook secret is read the same way",
    stripeSrc.includes('Deno.env.get("STRIPE_WEBHOOK_SECRET")'));

  // AND THE WEBHOOK VERIFIES BEFORE IT PARSES. `req.json()` anywhere before
  // `verifyWebhook` means the signature was checked over a re-serialised body,
  // which is to say not checked at all.
  const hook = read("supabase/functions/stripe-webhook/index.ts");
  check("the webhook reads the raw body, never req.json()",
    hook.includes("await req.text()") && !hook.includes("await req.json()"));
  check("the webhook verifies before it does anything else",
    hook.indexOf("verifyWebhook") < hook.indexOf("stripe_events"), "order");
  check("the webhook takes an idempotency lock before acting",
    hook.indexOf("stripe_events") < hook.indexOf("await handle("), "order");
}

// ─── 12. THE SCHEMA CANNOT BE WRITTEN FROM A BROWSER ──────────────────────
//
// A row in `platform_subscriptions` says money moved. The policies are SELECT
// only, owner only — a client that could write `status = 'active'` could give
// itself a free subscription with one PATCH through PostgREST.
{
  console.log("\n12. the schema's own guard");

  const m = read("supabase/migrations/20260905000000_platform_billing.sql");
  // The migration aligns its RLS statements into a column, and a check that
  // depends on the alignment goes red the day somebody tidies the file.
  const flat = m.replace(/[ 	]+/g, " ");
  for (const t of ["platform_subscriptions", "platform_invoices", "stripe_events"]) {
    // Whitespace-tolerant: the migration aligns these three statements into a
    // column, and a check that depends on the alignment is a check that goes
    // red the day somebody tidies the file.
    check(`${t} has RLS enabled and forced`,
      flat.includes(`${t} enable row level security`)
        && flat.includes(`${t} force row level security`), t);
  }
  const policies = [...m.matchAll(/create policy (\S+) on public\.(\S+)\s+for (\w+)/g)];
  check("every policy on these tables is a SELECT",
    policies.length > 0 && policies.every((p) => p[3] === "select"),
    policies.map((p) => `${p[1]}:${p[3]}`).join(","));
  check("the subscription is readable by the owner and nobody else",
    /platform_subscriptions_owner_select[\s\S]*?is_business_owner\(business_id\)/.test(m));
  check("stripe_events has no policy at all — service role only",
    !m.includes("create policy stripe_events"));
  // THE PRICES ARE SNAPSHOTTED. A column that could be null is a subscription
  // whose price has to be looked up later, which is the whole failure this
  // table was shaped to avoid.
  check("the charged amount cannot be null", m.includes("recurring_cents integer not null"));
  check("the consent text has somewhere to live", m.includes("consent_text text"));
}

// ─── 13. THE TWO EMAILS THAT KEEP THE PROMISE ─────────────────────────────
//
// `/pricing` prints, in the terms a customer reads before paying: *"we try the
// card again over the following two weeks and email you each time. If it still
// has not gone through after that, the site goes offline until it is paid.
// Nothing is deleted."*
//
// Stripe can send its own failed-payment emails and should — but that is a
// checkbox in another company's dashboard, and a printed promise resting on a
// setting nobody in this repo can read is a promise resting on nothing. So we
// send both halves ourselves, and these checks are what stop the sentence that
// matters most going missing in a rewrite.
{
  console.log("\n13. the billing emails");

  const brand = platformBrand("https://detailingplatform.com");
  const url = "https://detailingplatform.com/app?settings=billing";
  const B = "Ridgeline Auto Detail";
  const late = billingEmail(brand, { kind: "failed", businessName: B, billingUrl: url, amount: 60, reason: "Insufficient funds." });
  const down = billingEmail(brand, { kind: "suspended", businessName: B, billingUrl: url, amount: 60, reason: null });

  check("the failed email names the amount", late.html.includes("$60.00"), late.subject);
  check("the failed email promises two weeks of retries", /two weeks/i.test(late.html));
  check("the failed email says nothing gets deleted", /deleted/i.test(late.html));
  check("the failed email passes on the bank's own words",
    late.html.includes("Insufficient funds."), "the reason is what a detailer can act on");
  check("the failed email links to the billing screen", late.html.includes(url));

  check("the suspended email says the page is offline",
    /offline/i.test(down.subject) && /offline/i.test(down.html));
  // THE SENTENCE THAT STOPS A PANIC. A detailer whose page just went dark
  // assumes their customer list went with it.
  // IN THE BODY, NOT ONLY IN THE PREHEADER. The first version of this check
  // passed with the sentence removed from the email entirely, because the
  // hidden preheader line says it too — a check that cannot reach the case it
  // is about reads exactly like a check that passes. It asserts the reassuring
  // half by NAMING WHAT SURVIVES, which is the part a frightened detailer
  // actually reads.
  // AGAINST THE PLAIN-TEXT HALF, WHICH IS THE BODY WITH THE PREHEADER REMOVED.
  // The first version of this check tested the HTML and passed with the
  // sentence deleted from the email, because the hidden preheader line says it
  // too — a check that cannot reach the case it is about reads exactly like a
  // check that passes. `htmlToText` drops the preheader, so this can only be
  // satisfied by words a reader is actually shown.
  check("the suspended email says nothing has been deleted",
    /nothing has been deleted/i.test(down.text), down.text.slice(0, 200));
  // AND THE FACT THEIR FIRST QUESTION IS ABOUT: the people already booked in.
  check("the suspended email says existing customers are not stranded",
    /already booked/i.test(down.html));
  check("a missing reason draws no empty line", !/Your bank said/.test(down.html));

  // TRANSACTIONAL, NOT COMMERCIAL. `shell`'s legal footer is optional and is
  // the campaign's alone (roadmap 2.19). An unsubscribe link on "your site is
  // offline" invites somebody to switch off the only warning they will get.
  for (const [name, mail] of [["failed", late], ["suspended", down]]) {
    check(`the ${name} email carries no opt-out link`, !/unsubscribe/i.test(mail.html));
    check(`the ${name} email has a plain-text half`, mail.text.length > 80, String(mail.text.length));
    check(`the ${name} email renders nothing broken`,
      !/undefined|NaN|\[object Object\]|href=""/.test(mail.html));
  }

  // THE SENDER. `send-email` puts the BUSINESS's name in the From line, which
  // is right for every other email in the product and wrong for this one: an
  // email from "Ridgeline Auto Detail" telling Ridgeline their card failed
  // reads as a phishing attempt.
  const relay = read("supabase/functions/send-email/index.ts");
  check("send-email can send as the platform", relay.includes("sender_name"));
  check("a platform send does not stamp a bounce on a customer",
    relay.includes("!fromPlatform) await markAddress")
      && relay.includes("res.status < 500 && !fromPlatform"));
  check("a platform send does not reply-to the tenant",
    relay.includes("!fromPlatform && business.contact_email"));
  const hook = read("supabase/functions/stripe-webhook/index.ts");
  check("the webhook sends as the platform", hook.includes("senderName: PLATFORM_NAME"));
  check("the platform signs as itself", PLATFORM_NAME === "Detailing Platform");
  // THE MASTHEAD AND FOOTER SAY WHO SENT IT; THE SUBJECT SAYS WHAT IT IS
  // ABOUT. An email whose furniture carries the detailer's own name, telling
  // them their own card failed, is what phishing looks like — the same
  // argument that put `sender_name` on the From line, one inch lower.
  check("the platform's own name is the brand on the email",
    brand.brandName === PLATFORM_NAME, brand.brandName);
  check("the business is named in the subject, not in the furniture",
    down.subject.startsWith(B) && late.subject.endsWith(B), down.subject);
  // IT GOES TO THE OWNER'S OWN ADDRESS, never the booking-notification list —
  // a detailer may well have pointed that at a shared inbox or a staff member,
  // and a declined card is not their team's business.
  // COMMENTS STRIPPED FIRST — this file's own prose explains the rule by naming
  // the thing it bans, and a check that fails on its own documentation gets
  // deleted rather than fixed. Same technique as `email-brand` 7a.
  const hookCode = hook.replace(/^[ 	]*\/\/.*$/gm, "");
  check("the webhook emails the business contact, not the notification list",
    hookCode.includes("contact_email") && !hookCode.includes("notification_emails"));
}

// ─── 14. WHAT THE SECURITY REVIEW FOUND, PINNED ───────────────────────────
//
// Every check here exists because a review of this item's own code on
// 2026-09-05 found the code doing something its comments said it did not. They
// are source assertions rather than behaviour tests, which is the weaker kind
// — but the alternative is a Stripe account and a live webhook, and a weak
// check on a money path beats a comment.
{
  console.log("\n14. the security review's findings");

  const hook = read("supabase/functions/stripe-webhook/index.ts");
  const fn = read("supabase/functions/platform-billing/index.ts");

  // THE ONE EXPLOITABLE DEFECT. `cancel` raises a ONE-OFF invoice for the exit
  // fee, and it carries `metadata.business_id`, so it resolved to a business
  // and drove the dunning state machine in both directions: PAYING it brought
  // a suspended booking page back online with the subscription still unpaid,
  // and a DECLINED one suspended a fully paid detailer on the first failure
  // (a manual invoice has no `next_payment_attempt`, so "retries exhausted"
  // was true immediately).
  check("only a SUBSCRIPTION invoice can move the account's state",
    hook.includes("const isSubscriptionInvoice ="),
    "the exit-fee invoice must not drive dunning");
  check("both invoice handlers apply that test",
    (hook.match(/if \(!isSubscriptionInvoice\(invoice\)\) return;/g) ?? []).length === 2,
    `${(hook.match(/if \(!isSubscriptionInvoice\(invoice\)\) return;/g) ?? []).length} of 2`);
  // A one-off is still MIRRORED — it is a real charge and belongs on the
  // receipts list. The guard must come AFTER that write, not before it.
  check("a one-off invoice is still recorded on the receipts list",
    hook.indexOf("await mirrorInvoice") < hook.indexOf("if (!isSubscriptionInvoice"),
    "the guard must sit after the mirror");

  // AND THE ROW MUST BE THE LIVE ONE. Stripe does not promise the order events
  // land in, so a late `invoice.paid` could otherwise revive a cancelled row.
  check("a late payment cannot revive a cancelled subscription",
    hook.includes('sub.status === "canceled") return'));

  // THE MODULE'S OWN RULE, APPLIED TO ITSELF: an unknown Stripe status must
  // never resolve to "they have paid".
  check("an unknown status at checkout leaves the row incomplete",
    hook.includes('ourStatus(sub.status) ?? "incomplete"')
      && !hook.includes('ourStatus(sub.status) ?? "active"'));

  // THE PORTAL'S LOCK IS IN THIS REPO, NOT IN STRIPE'S DASHBOARD. `flow_data`
  // decides where a customer LANDS; the portal CONFIGURATION decides what they
  // can reach around it — and a portal offering cancellation lets somebody
  // leave a twelve-month term without the exit fee ever being charged.
  check("the portal session names a configuration",
    fn.includes("configuration: await cardOnlyConfiguration()"));
  check("that configuration forbids cancelling",
    fn.includes("subscription_cancel: { enabled: false }"));
  check("and forbids changing the plan",
    fn.includes("subscription_update: { enabled: false }"));

  // A REUSED ROW MUST NOT CARRY THE LAST SUBSCRIPTION'S ID. `cancel` and
  // `resume` address Stripe by it, so in the window before
  // `checkout.session.completed` lands they would act on the ended one.
  check("re-subscribing clears the previous cycle",
    fn.includes("stripe_subscription_id: null,")
      && fn.includes("exit_fee_charged_cents: null,"));

  // MONEY THAT HAS LEFT A CARD IS RECORDED BEFORE ANYTHING THAT CAN THROW.
  check("the exit fee is recorded the moment it is taken",
    fn.indexOf("exit_fee_charged_cents: fee") < fn.indexOf("cancel_at_period_end: true }"),
    "record before the cancellation call");

  // A 500 IS NOT A DATABASE ERROR STRING.
  check("an unexpected failure says nothing was charged",
    fn.includes("Nothing was charged.") && !fn.includes("(err as Error).message }, 500"));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
