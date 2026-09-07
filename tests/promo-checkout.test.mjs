// ROADMAP 8.14 — A PROMO CODE ON *OUR* CHECKOUT.
//
// *"We should set up a promo code system within the buying process. I'm sure
// Stripe supports that."*
//
// ---------------------------------------------------------------------------
// THIS IS THE THIRD PLACE IN THIS PRODUCT WHERE "A NUMBER PRINTED IS NOT A
// NUMBER CHARGED" IS LITERALLY TRUE, AND THE FIRST WHERE THE DIFFERENCE IS THE
// WHOLE FEATURE.
// ---------------------------------------------------------------------------
// A code exists precisely to make the charge differ from the list price. So
// every check here is one of two questions:
//
//   1. **Does the discount reach EVERYTHING?** The invoice lines, the consent
//      sentence a detailer ticks, the exit fee if they leave early, and the
//      row that answers a chargeback. It reaches them because a code produces
//      a different `Snapshot` and those four all read the snapshot — § 1 is
//      that, asserted rather than assumed.
//   2. **Can a code be spent more times than it was meant to be?** § 3 asks
//      the database by taking a one-use code twice, concurrently.
//
// AND ONE THING IT DELIBERATELY DOES NOT CLAIM. There is no Stripe secret key
// outside the edge functions, so nothing here can read back what Stripe was
// actually sent. What is proven is that the endpoint's own answer, the row it
// writes and the pure function all carry the same figure, and § 2 pins that
// the endpoint builds Stripe's parameters from `linesFor(snapshot)` and
// decides nothing itself — the same standard § 18 of `platform-billing` holds
// for the payment form.
//
//   node tests/promo-checkout.test.mjs        (§ 1 and § 2 are credential-free)

import { readFileSync } from "node:fs";
import {
  applyPromo,
  consentSentence,
  exitFeeCentsFor,
  firstChargeCents,
  linesFor,
  planFor,
  promoProblem,
  STRIPE_MIN_CHARGE_CENTS,
} from "../supabase/functions/_shared/platformBilling.ts";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const strip = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/^\s*--.*$/gm, "");

const code = (over = {}) => ({
  code: "TEST",
  kind: "amount",
  value: 20000,
  off_setup: true,
  off_recurring: false,
  stacks_with_founding: false,
  max_redemptions: null,
  redeemed: 0,
  expires_at: null,
  active: true,
  ...over,
});

// ─── 1. The arithmetic, and what the discount has to reach ────────────────
console.log("1. a code makes a different snapshot, and everything reads it");
{
  const list = planFor("website", "annual-monthly", false);
  check("1a · the fixture is the plan with both a build fee and a monthly",
    list.setup_cents > 0 && list.recurring_cents > 0 && list.term_months > 0,
    "every check below needs all three to have something to take off");

  // MONEY OFF THE BUILD FEE — the ordinary "sign up today" code, and one-off
  // by nature because that line only appears on the first invoice.
  const build = applyPromo(list, code({ code: "BUILD200" }));
  check("1b · a $200 code takes $200 off the build",
    build.snapshot.setup_cents === list.setup_cents - 20000);
  check("1b-ii · and leaves the monthly alone",
    build.snapshot.recurring_cents === list.recurring_cents);

  // THE TIE-OUT. What the code says it takes off has to equal what the first
  // charge actually drops by — the same shape as `booking-engine` test 17 and
  // `money-export`'s, and the one that catches a rounding rule applied twice.
  check("1c · the saving it reports IS the drop in the first charge",
    firstChargeCents(list) - firstChargeCents(build.snapshot)
      === build.off_setup_cents + build.off_recurring_cents);

  const half = applyPromo(list, code({ code: "HALF", kind: "percent", value: 50, off_recurring: true }));
  check("1d · a percentage comes off both when it is set to",
    half.snapshot.setup_cents === Math.round(list.setup_cents / 2)
      && half.snapshot.recurring_cents === Math.round(list.recurring_cents / 2));
  check("1d-ii · and it ties out too",
    firstChargeCents(list) - firstChargeCents(half.snapshot)
      === half.off_setup_cents + half.off_recurring_cents);

  // ── THE FOUR THINGS THE DISCOUNT HAS TO REACH ─────────────────────────
  // Each of these is a place a `discount_cents` threaded through the endpoint
  // would have been forgotten, and each is right here only because the
  // snapshot itself changed.

  // THE INVOICE. A receipt that says $999 for a build somebody paid $799 for
  // is the complaint this feature would otherwise generate on day one.
  const lines = linesFor(half.snapshot);
  check("1e · the invoice lines carry the discounted money",
    lines.reduce((n, l) => n + l.cents, 0) === firstChargeCents(half.snapshot));

  // THE CONSENT SENTENCE. This is the one stored in `consent_text` and quoted
  // back in a card dispute; naming the list price there would be worse than
  // useless.
  const sentence = consentSentence(half.snapshot);
  check("1f · the sentence a detailer ticks names the discounted figures",
    sentence.includes("$499.50") && sentence.includes("$30"),
    sentence.slice(0, 140));
  check("1f-ii · and never the list price it was discounted from",
    !sentence.includes("$999") && !sentence.includes("$60"));

  // THE EXIT FEE. It is a share of the months still to run at the recurring
  // price, so a discounted subscription must cost less to leave, not the same.
  const listExit = exitFeeCentsFor(list.recurring_cents, 6, list.exit_fee_share);
  const cutExit = exitFeeCentsFor(half.snapshot.recurring_cents, 6, half.snapshot.exit_fee_share);
  check("1g · leaving early costs a share of what was actually charged",
    cutExit < listExit && cutExit === Math.round(listExit / 2));

  // ── THE REFUSALS ──────────────────────────────────────────────────────
  check("1h · an unknown code is refused", !!promoProblem(null, list));
  check("1h-ii · an inactive one is refused",
    /no longer/.test(promoProblem(code({ active: false }), list) ?? ""));
  check("1h-iii · an expired one is refused",
    /expired/.test(promoProblem(code({ expires_at: "2020-01-01T00:00:00Z" }), list) ?? ""));
  check("1h-iv · but not one that expires later",
    promoProblem(code({ expires_at: "2099-01-01T00:00:00Z" }), list) === null);
  check("1h-v · a fully redeemed one is refused",
    /as many times/.test(promoProblem(code({ max_redemptions: 3, redeemed: 3 }), list) ?? ""));
  check("1h-vi · and one with room is not",
    promoProblem(code({ max_redemptions: 3, redeemed: 2 }), list) === null);

  // THE FOUNDING STACK, refused by default. There are three of those spots and
  // they are already discounted; a code on top is the price for the life of an
  // account, decided by whoever forwarded a text message.
  const founding = planFor("website", "annual-monthly", true);
  check("1i · a code is refused on a founding account by default",
    /founding/.test(promoProblem(code(), founding) ?? ""));
  check("1i-ii · unless it says it may stack",
    promoProblem(code({ stacks_with_founding: true }), founding) === null);
  check("1i-iii · and stacking really does come off the founding price",
    applyPromo(founding, code({ stacks_with_founding: true })).snapshot.setup_cents
      === founding.setup_cents - 20000);

  // A CODE THAT CANNOT TOUCH THIS PLAN. The booking plan has no build fee, so
  // a build-fee code against it is a $0 discount presented as a discount.
  const booking = planFor("booking", "monthly", false);
  check("1j · a build-fee code is refused on the plan with no build fee",
    /nothing to take off/.test(promoProblem(code(), booking) ?? ""));
  check("1j-ii · a recurring code is not",
    promoProblem(code({ off_setup: false, off_recurring: true, value: 500 }), booking) === null);

  // NEVER MORE THAN THERE IS. A $9,999 code against a $60 line takes $60, not
  // a negative invoice line — and it is asked on the WEBSITE plan, where the
  // build fee keeps the first charge above the floor, so this measures the cap
  // rather than the floor. The first run of this check used the booking plan
  // and `applyPromo` threw: correct behaviour, and the wrong subject.
  const bigOnSmall = applyPromo(list, code({
    off_setup: false, off_recurring: true, value: 999_999,
  }));
  check("1k · a code larger than the line takes the whole line and no more",
    bigOnSmall.snapshot.recurring_cents === 0
      && bigOnSmall.off_recurring_cents === list.recurring_cents);
  // ...and is then refused, because Stripe cannot take a payment of nothing
  // and `default_incomplete` hands back no client secret — a subscription that
  // goes active with no card saved is a customer who can never be charged.
  check("1k-ii · but a first charge of nothing is refused before it gets there",
    /smallest amount/.test(promoProblem(code({
      off_setup: false, off_recurring: true, value: 999_999,
    }), booking) ?? ""));
  check("1k-iii · and the floor is Stripe's own, not an invented one",
    STRIPE_MIN_CHARGE_CENTS === 50);

  // DEFENCE IN DEPTH BEHIND THE TABLE'S CHECK CONSTRAINTS.
  check("1l · a percentage over 100 is refused",
    !!promoProblem(code({ kind: "percent", value: 150 }), list));
  check("1l-ii · a code that comes off nothing is refused",
    !!promoProblem(code({ off_setup: false, off_recurring: false }), list));

  // APPLYING A REFUSED CODE THROWS. A version that silently returned the
  // undiscounted snapshot would charge full price against a screen that had
  // just printed a saving.
  let threw = false;
  try { applyPromo(list, code({ active: false })); } catch { threw = true; }
  check("1m · applying a code that cannot be used throws rather than charging full price", threw);
}

// ─── 2. Where the decision happens, which no behaviour can show ───────────
console.log("2. the code is resolved in the same breath as the price");
{
  const fn = strip(read("supabase/functions/platform-billing/index.ts"));
  const mig = strip(read("supabase/migrations/20260907005000_platform_promo_codes.sql"))
    .replace(/'[^']*'/g, "''");
  const subAt = fn.indexOf("async function subscribe(");
  check("2a · the check has subjects — subscribe was found", subAt > 0);
  const body = fn.slice(subAt);

  // ROADMAP 8.5'S FINDING, APPLIED RATHER THAN RE-LEARNED. The price is
  // snapshotted once and never re-read, so a code resolved after it would
  // charge one number and record another.
  const redeemAt = body.indexOf("redeem_promo_code");
  const snapAt = body.indexOf("const snapshot = promoResult");
  check("2b · the redemption happens ABOVE the snapshot",
    redeemAt > 0 && snapAt > 0 && redeemAt < snapAt,
    "the code and the price have to be decided together");

  // THE UNDO. A redemption taken at intent-to-pay is spent by a declined card
  // unless something gives it back — and on a one-use code that is the offer.
  check("2c · a failure hands the redemption back",
    /release_promo_code/.test(body) && body.indexOf("release_promo_code") < redeemAt,
    "giveBack has to be defined before the claim it undoes");
  check("2c-ii · and giveBack is called on every path that already released the spot",
    (body.match(/await giveBack\(\)/g) ?? []).length >= 4);

  // THE ROW IS ALWAYS WRITTEN. This row is reused on a restart, and a stale
  // code left behind records a discount against prices nobody was charged.
  check("2d · all three promo columns are written unconditionally",
    /promo_code: promoResult \? typedCode : null/.test(body)
    && /promo_off_setup_cents: promoResult\?\.off_setup_cents \?\? 0/.test(body)
    && /promo_off_recurring_cents: promoResult\?\.off_recurring_cents \?\? 0/.test(body));

  // QUOTING MUST NOT SPEND. A code counted on every keystroke is exhausted by
  // three people thinking about it, and the count is what limits the offer.
  const quoteAt = fn.indexOf("async function quotePromo(");
  const quote = fn.slice(quoteAt, subAt);
  check("2e · the quote action redeems nothing", quoteAt > 0 && !/redeem_promo_code/.test(quote));
  // **THE GUARD, NOT THE MENTION OF IT.** The first version tested that
  // `withinLimits` and the bucket name appeared in the function, and
  // baselining walked straight through it: `if (false && !await
  // withinLimits(...))` keeps every one of those characters and gates
  // nothing. It reads the whole condition and the refusal now.
  check("2e-ii · and it is rate limited, which is the enumeration guard",
    /if \(!await withinLimits\(supabase, \[\{/.test(quote)
    && /bucket: "promo_quote"/.test(quote)
    && /\}\]\)\) \{[\s\S]{0,200}?\}, 429\);/.test(quote));
  check("2e-iii · it quotes against the DATABASE's founding answer, not the browser's",
    /plan_tier === "founding"/.test(quote));

  // THE ENDPOINT TRANSLATES AND DECIDES NOTHING. Stripe's parameters are built
  // from linesFor(snapshot), so a discounted snapshot is a discounted invoice
  // with no second place to forget it.
  check("2f · Stripe's amounts still come from linesFor(snapshot)",
    /const lines = linesFor\(snapshot\)/.test(body));
  // AND THE DISCOUNT IS NOT APPLIED A SECOND TIME ON THE WAY OUT. Every
  // `unit_amount` Stripe is sent comes from a LINE, never from a promo figure
  // — the promo columns below are the RECORD of what was taken off and must
  // never be arithmetic. A second subtraction here would halve a half-price
  // subscription and nothing on any screen would say so.
  const toStripe = body.slice(body.indexOf("const lines = linesFor"), body.indexOf("const invoice ="));
  check("2f-ii · every amount sent to Stripe comes from a line",
    /unit_amount: recurring\.cents/.test(toStripe)
    && /unit_amount: l\.cents/.test(toStripe)
    && (toStripe.match(/unit_amount:/g) ?? []).length === 2);
  check("2f-iii · and no promo figure is arithmetic anywhere below the snapshot",
    !/[-+*/]\s*promoResult/.test(body) && !/promoResult[^\s]*\s*[-+*/]/.test(body));

  // THE TABLE. Nobody's browser may read the codes or write their own price.
  check("2g · the codes table has RLS forced and no policies",
    /alter table public\.platform_promo_codes force row level security/.test(mig)
    && !/create policy[\s\S]*platform_promo_codes/.test(mig));
  check("2g-ii · and both functions are service_role only",
    /revoke all on function public\.redeem_promo_code\(text\) from public, anon, authenticated/.test(mig)
    && /grant execute on function public\.redeem_promo_code\(text\) to service_role/.test(mig));
  // ONE STATEMENT, or two people take the last redemption of a one-use code.
  check("2g-iii · the redemption is one statement, not a read and a write",
    /with taken as \([\s\S]*?update public\.platform_promo_codes[\s\S]*?returning code[\s\S]*?\)\s*select exists/.test(mig));
}

// ─── 3. The database, asked rather than read ──────────────────────────────
console.log("3. a one-use code, taken twice at once");
if (!URL_ || !SERVICE) {
  console.log("  SKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
} else {
  const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
  const rest = (p, init = {}) =>
    fetch(`${URL_}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  // **A `returns void` FUNCTION ANSWERS 204 WITH NO BODY, AND `.json()` ON
  // THAT THROWS `Unexpected end of JSON input`** — which reads as the API
  // being broken rather than as the function having nothing to say. It cost
  // this file its first run.
  const rpc = async (fn, args) => {
    const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
      method: "POST", headers: H, body: JSON.stringify(args),
    });
    const body = await r.text();
    return body ? JSON.parse(body) : null;
  };
  const CODE = `T${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const rowFor = async () =>
    (await rest(`platform_promo_codes?code=eq.${CODE}&select=*`).then((r) => r.json()))[0];

  try {
    const made = await rest("platform_promo_codes", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        code: CODE, kind: "amount", value: 20000, off_setup: true,
        max_redemptions: 1, note: "promo-checkout test",
      }),
    });
    const row = (await made.json())[0];
    check("3a · the throwaway code exists", !!row, "insert produced no row");
    check("3a-ii · and starts unredeemed", row?.redeemed === 0);

    // THE PROPERTY NO SOURCE READ CAN ESTABLISH. Both calls go out before
    // either answer comes back, which is the state two people pressing
    // subscribe at the same moment are in.
    const [a, b] = await Promise.all([
      rpc("redeem_promo_code", { p_code: CODE }),
      rpc("redeem_promo_code", { p_code: CODE }),
    ]);
    check("3b · exactly one of two simultaneous redemptions succeeds",
      [a, b].filter((x) => x === true).length === 1,
      `got ${JSON.stringify([a, b])}`);
    check("3b-ii · and the count is 1, not 2",
      (await rowFor())?.redeemed === 1);

    // A THIRD IS REFUSED, which is the ordinary case.
    check("3c · a code at its limit refuses",
      (await rpc("redeem_promo_code", { p_code: CODE })) === false);

    // CASE AND WHITESPACE. A code typed off a text message arrives however it
    // arrives; the column is upper-case and the function has to meet it there.
    await rpc("release_promo_code", { p_code: CODE });
    check("3d · a lower-case, padded code still redeems",
      (await rpc("redeem_promo_code", { p_code: `  ${CODE.toLowerCase()} ` })) === true);

    // RELEASE NEVER MANUFACTURES A REDEMPTION.
    await rpc("release_promo_code", { p_code: CODE });
    await rpc("release_promo_code", { p_code: CODE });
    await rpc("release_promo_code", { p_code: CODE });
    check("3e · releasing more than was taken never goes below zero",
      (await rowFor())?.redeemed === 0);

    // THE SHAPE IS ENFORCED AT THE DOOR. Three ways to write a code that
    // exists and can never be typed.
    const bad = async (patch) => (await rest("platform_promo_codes", {
      method: "POST",
      body: JSON.stringify({ code: "X", kind: "amount", value: 1, ...patch }),
    })).status;
    check("3f · a lower-case code is refused by the table",
      await bad({ code: `${CODE.toLowerCase()}x` }) >= 400);
    check("3f-ii · so is one with a space in it", await bad({ code: "A B C" }) >= 400);
    check("3f-iii · a percentage over 100 is refused",
      await bad({ code: "PCTBAD", kind: "percent", value: 101 }) >= 400);
    check("3f-iv · and a code that takes nothing off is refused",
      await bad({ code: "NOTHINGOFF", off_setup: false, off_recurring: false }) >= 400);

    // NOBODY'S BROWSER READS THIS TABLE. Reading it is reading every
    // unredeemed code in the business.
    if (ANON) {
      const anonRead = await fetch(`${URL_}/rest/v1/platform_promo_codes?select=code`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      const seen = anonRead.ok ? await anonRead.json() : [];
      check("3g · an anonymous browser cannot read the codes",
        !anonRead.ok || (Array.isArray(seen) && seen.length === 0),
        `status ${anonRead.status}, ${JSON.stringify(seen).slice(0, 80)}`);
      const anonRedeem = await fetch(`${URL_}/rest/v1/rpc/redeem_promo_code`, {
        method: "POST",
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_code: CODE }),
      });
      check("3g-ii · nor call the redemption function", anonRedeem.status >= 400,
        `status ${anonRedeem.status}`);
      check("3g-iii · and the count did not move", (await rowFor())?.redeemed === 0);
    } else {
      console.log("  NOT MEASURED  3g · the anonymous reader — needs SUPABASE_ANON_KEY");
    }
  } finally {
    await rest(`platform_promo_codes?code=eq.${CODE}`, { method: "DELETE" });
    check("3h · the throwaway code is gone", !(await rowFor()));
  }
}

// ─── 4. The deployed endpoint, and the money it writes down ───────────────
//
// § 1 proves the arithmetic and § 2 proves where it is called from. This is
// the only section that can answer the question the whole item exists for:
// **when a detailer types a code and presses subscribe, is the row that comes
// back the discounted one?**
console.log("4. a code typed at the real checkout");
if (!URL_ || !SERVICE || !ANON) {
  console.log("  SKIPPED — needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY");
} else {
  const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
  const rest = (p, init = {}) =>
    fetch(`${URL_}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const tag = Math.random().toString(36).slice(2, 8);
  const SLUG = `promo-fixture-${tag}`;
  const CODE = `P${tag.toUpperCase()}`;
  const OWNER = {
    email: `promo-${tag}@detailplatform.com`,
    password: `Aa1!${Math.random().toString(36).slice(2)}`,
  };
  let userId = null;

  const callAs = async (jwt, body) => {
    const r = await fetch(`${URL_}/functions/v1/platform-billing`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const t = await r.text();
    return { status: r.status, body: t ? JSON.parse(t) : null };
  };

  try {
    // ── THE FIXTURE ───────────────────────────────────────────────────────
    // **`is_demo: true` IS LOAD-BEARING AND NOT TIDINESS.** `subscribe` claims
    // a founding spot at intent to pay, and there are three of those in the
    // whole product; roadmap 6.2 excluded demo businesses from both
    // `founding_offer()` and `claim_founding_spot()`, so this fixture cannot
    // spend one — and it also keeps the test on the NON-founding path, which
    // is the one a code is allowed on by default.
    const [biz] = await rest("businesses", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        slug: SLUG, name: "Promo Fixture Detailing", timezone: "America/Los_Angeles",
        contact_email: OWNER.email, is_demo: true,
      }]),
    }).then((r) => r.json());
    check("4a · the fixture business exists", !!biz?.id, "insert produced no row");

    await fetch(`${URL_}/auth/v1/admin/users`, {
      method: "POST", headers: H,
      body: JSON.stringify({ ...OWNER, email_confirm: true }),
    });
    const users = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=200`, { headers: H })).json();
    userId = (users.users ?? []).find((u) => u.email === OWNER.email)?.id ?? null;
    check("4a-ii · and its owner has a login", !!userId);

    const memberRes = await rest("business_users", {
      method: "POST",
      body: JSON.stringify([{ business_id: biz.id, user_id: userId, role: "owner" }]),
    });
    // **THE SETUP ASSERTS ITS OWN SUCCESS.** A missing membership presents as
    // the OWNER being refused by the endpoint, which reads as a permission bug
    // in the product — roadmap 8.11 lost an hour to exactly that.
    check("4a-iii · and is a member of it", memberRes.status < 300, `status ${memberRes.status}`);

    const signIn = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify(OWNER),
    }).then((r) => r.json());
    const jwt = signIn.access_token;
    check("4a-iv · and can sign in", !!jwt, JSON.stringify(signIn).slice(0, 120));

    await rest("platform_promo_codes", {
      method: "POST",
      body: JSON.stringify({
        code: CODE, kind: "amount", value: 20000, off_setup: true,
        // **IT MUST STACK, BECAUSE THIS FIXTURE WILL BE FOUNDING BY THE TIME
        // IT PAYS.** `subscribe` claims a spot at intent to pay and there are
        // spots left, so a non-stacking code would be accepted by the quote
        // and refused at the till — which is the defect this section found and
        // `quotePromo` now predicts. Asserting the STACK here also exercises
        // the one path where a code comes off an already-discounted price.
        stacks_with_founding: true,
        max_redemptions: 5, note: "promo-checkout § 4",
      }),
    });

    // ── THE QUOTE ─────────────────────────────────────────────────────────
    // FOUNDING, because that is what the till will do — see the note on the
    // code above. If the three spots are ever all taken this fixture stops
    // being founding and these figures move with it, which is why the
    // expectation is COMPUTED rather than typed.
    // `founding_offer()`, and the check below is what caught the endpoint
    // calling a function that has not existed since roadmap 6.2 — PostgREST
    // answers PGRST202 and the prediction falls through to `false`, so a wrong
    // name looks exactly like a business with no spots left.
    const offer = await rest("rpc/founding_offer", { method: "POST", body: "{}" })
      .then((r) => r.json());
    check("4a-v · the founding count is readable, so the expectation is real",
      typeof offer?.left === "number", JSON.stringify(offer).slice(0, 120));
    const willFound = (offer?.left ?? 0) > 0;
    const listSnap = planFor("website", "annual-monthly", willFound);
    const expected = applyPromo(listSnap, {
      code: CODE, kind: "amount", value: 20000, off_setup: true, off_recurring: false,
      stacks_with_founding: true, max_redemptions: 5, redeemed: 0, expires_at: null, active: true,
    });

    const q = await callAs(jwt, {
      action: "promo", business_id: biz.id, code: CODE.toLowerCase(),
      plan: "website", term: "annual-monthly",
    });
    check("4b · the deployed endpoint accepts the code", q.body?.ok === true,
      JSON.stringify(q.body).slice(0, 160));
    // THE ONE THAT MATTERS: what it says the charge is, against what the pure
    // module says it is. These are two different machines agreeing.
    check("4b-ii · and quotes the SAME first charge the pure module computes",
      q.body?.amount_cents === firstChargeCents(expected.snapshot),
      `endpoint ${q.body?.amount_cents}, module ${firstChargeCents(expected.snapshot)}`);
    check("4b-iii · with the list price beside it, so the screen can strike one out",
      q.body?.was_cents === firstChargeCents(listSnap));
    // THE DEFECT THIS SECTION FOUND. The quote runs before the founding spot
    // is claimed, so quoting against `plan_tier` alone said one price and the
    // till said another — the code working, then not working, between two
    // presses with nothing on the screen having changed.
    check("4b-iii-b · and it quotes the price the TILL will use, not today's",
      q.body?.setup_cents === expected.snapshot.setup_cents
      && q.body?.recurring_cents === expected.snapshot.recurring_cents,
      `quote ${q.body?.setup_cents}/${q.body?.recurring_cents}, till `
        + `${expected.snapshot.setup_cents}/${expected.snapshot.recurring_cents}`);
    check("4b-iv · and the consent sentence already discounted",
      q.body?.consent === consentSentence(expected.snapshot));
    check("4b-v · a lower-case code was accepted, because a person types it",
      q.body?.code === CODE);
    // QUOTING SPENDS NOTHING.
    const afterQuote = (await rest(`platform_promo_codes?code=eq.${CODE}&select=redeemed`)
      .then((r) => r.json()))[0];
    check("4b-vi · and asking cost no redemption", afterQuote?.redeemed === 0);

    const bad = await callAs(jwt, {
      action: "promo", business_id: biz.id, code: "NOSUCHCODEHERE",
      plan: "website", term: "annual-monthly",
    });
    check("4c · an unknown code comes back as a refusal, not an error",
      bad.status === 200 && bad.body?.ok === false && !!bad.body?.problem);

    // ── THE CHARGE ────────────────────────────────────────────────────────
    // **THIS CREATES A REAL TEST-MODE STRIPE SUBSCRIPTION** in `incomplete`
    // state, because that is the only way to find out what the endpoint
    // actually wrote down. No card is confirmed and no money moves; Stripe
    // expires an unconfirmed subscription by itself. The fixture business is
    // deleted below, which takes our row with it.
    const paid = await callAs(jwt, {
      action: "subscribe", business_id: biz.id, plan: "website",
      term: "annual-monthly", consented: true, promo_code: CODE,
    });
    if (paid.status === 503) {
      console.log("  NOT MEASURED  4d · the charge — Stripe is not configured on this project");
    } else {
      check("4d · subscribing with the code succeeds", paid.status === 200,
        JSON.stringify(paid.body).slice(0, 200));
      check("4d-ii · and the amount it hands the card form is the DISCOUNTED one",
        paid.body?.amount_cents === firstChargeCents(expected.snapshot),
        `endpoint ${paid.body?.amount_cents}, module ${firstChargeCents(expected.snapshot)}`);

      const [row] = await rest(`platform_subscriptions?business_id=eq.${biz.id}&select=*`)
        .then((r) => r.json());
      check("4e · the row exists", !!row);
      // THE ROW IS WHAT THE EXIT FEE, THE RECEIPT AND ANY DISPUTE ARE COMPUTED
      // FROM, so a list price here is a bill nobody agreed to.
      check("4e-ii · its build fee is the discounted one",
        row?.setup_cents === expected.snapshot.setup_cents,
        `row ${row?.setup_cents}, module ${expected.snapshot.setup_cents}`);
      check("4e-iii · its recurring price is what was actually agreed",
        row?.recurring_cents === expected.snapshot.recurring_cents);
      check("4e-iv · the code is recorded on it",
        row?.promo_code === CODE);
      check("4e-v · with what it took off, so the list price stays recoverable",
        row?.promo_off_setup_cents === expected.off_setup_cents
        && row?.promo_off_recurring_cents === expected.off_recurring_cents);
      // THE STORED CONSENT NAMES THE DISCOUNTED MONEY. This is the sentence
      // quoted back in a chargeback; the list price in it would be a document
      // saying they agreed to something they did not.
      check("4e-vi · and the stored consent names the discounted figures",
        row?.consent_text === consentSentence(expected.snapshot),
        String(row?.consent_text).slice(0, 120));

      check("4f · the redemption was actually spent",
        ((await rest(`platform_promo_codes?code=eq.${CODE}&select=redeemed`)
          .then((r) => r.json()))[0])?.redeemed === 1);
    }

    // ── THE RATE LIMIT, which is the enumeration guard ────────────────────
    // Thirty an hour is far more than a person typing a code off a text
    // message and far less than a list. Asked last, because it spends the
    // bucket every other check in this section shares.
    let sawLimit = false;
    for (let i = 0; i < 34 && !sawLimit; i++) {
      const r = await callAs(jwt, {
        action: "promo", business_id: biz.id, code: `NOPE${i}`,
        plan: "website", term: "annual-monthly",
      });
      if (r.status === 429) sawLimit = true;
    }
    check("4g · guessing codes is throttled", sawLimit,
      "34 tries did not reach the limit");
  } finally {
    await rest(`platform_promo_codes?code=eq.${CODE}`, { method: "DELETE" }).catch(() => {});
    await rest(`businesses?slug=eq.${SLUG}`, { method: "DELETE" }).catch(() => {});
    if (userId) {
      await fetch(`${URL_}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: H })
        .catch(() => {});
    }
    // A login nobody remembers creating is exactly the credential CLAUDE.md
    // refuses to leave lying around, and a fixture business left behind is a
    // row on the owner's own back-office list.
    const left = await rest(`businesses?slug=eq.${SLUG}&select=id`).then((r) => r.json());
    check("4h · the fixture business is gone", Array.isArray(left) && left.length === 0);
    const codeLeft = await rest(`platform_promo_codes?code=eq.${CODE}&select=code`)
      .then((r) => r.json());
    check("4h-ii · and so is the throwaway code",
      Array.isArray(codeLeft) && codeLeft.length === 0);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
