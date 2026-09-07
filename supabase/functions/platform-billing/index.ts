// The detailer's side of MONEY IN — roadmap 2.20 stage 2.
//
// Four actions, one function, because they share a subject (this business's
// subscription), an authorisation rule (owner, never a permission tick) and a
// key. Splitting them into four deployments would be four places to forget the
// ownership check.
//
//   summary   -> everything the billing screen prints, computed server-side
//   promo     -> what a typed code would do, BEFORE anybody is charged
//   subscribe -> OUR OWN payment form: a Stripe client secret to confirm
//   portal    -> a Stripe-hosted page for updating the CARD, and only the card
//   cancel    -> stop the renewal, charging the early-exit fee if one is owed
//   resume    -> undo a cancellation before the period actually ends
//
// ============================================================================
// OWNER-ONLY, NOT A PERMISSION TICK
// ============================================================================
// Roadmap 2.13 refused a `team` permission because whoever can hand out
// permissions can hand themselves every other one. The same argument decides
// this: whoever can change what the business PAYS can change everything, and
// there is no tick a detailer could give a member that means "may cancel our
// subscription but nothing else". `role === "owner"` is the whole rule.
//
// ============================================================================
// CONSENT IS RECORDED BEFORE STRIPE IS CALLED, NOT AFTER
// ============================================================================
// AB 2863 wants express affirmative consent BEFORE billing details are taken.
// Stripe's page is where the card is entered, so the row is written — consent
// text and all — on the way TO it. A subscription that never completes leaves
// an `incomplete` row with a consent on it, which is exactly right: they
// agreed, then did not pay.
//
// AND THE SENTENCE IS GENERATED, NEVER SENT BY THE BROWSER. The screen prints
// `consentSentence(snapshot)` and this function stores `consentSentence(
// snapshot)` — the same function over the same snapshot — so a client cannot
// post a friendlier sentence than the one it showed. All the browser sends is
// that the box was ticked.
//
// ============================================================================
// `summary` EXISTS SO THE SCREEN NEVER DOES THE ARITHMETIC
// ============================================================================
// The billing screen has to PRINT the exact sentence this function will STORE,
// and the exact fee it will CHARGE. There were three ways to arrange that: a
// second copy of `platformBilling.ts` inside `app/` (a second implementation of
// a money path, which is the thing this repo has a rule against), an import
// across the `app/` -> `supabase/` boundary (which works and is strange), or
// asking the server. Asking the server is the only one where the words on the
// screen and the words in the database are produced by the SAME CALL to the
// SAME FUNCTION, so they cannot differ even in principle.
//
// It needs no Stripe key, which is what lets the whole screen be built and
// verified in a browser on a machine that has none. Only the last button does.
//
// ============================================================================
// THE PORTAL IS DELIBERATELY CRIPPLED, AND THE CRIPPLING IS IN THIS FILE
// ============================================================================
// Stripe's customer portal will happily let somebody cancel from it. That
// would skip the early-exit fee and skip our own `canceled_at`, so the row and
// the reality drift apart in the one place that must not.
// **`flow_data` ALONE WAS NOT ENOUGH and the security review was right about
// it**: a deep link decides where they LAND, and the portal CONFIGURATION
// decides what they can reach around it — dashboard state nothing here can
// read, which is the exact failure this item refused for the dunning emails.
// `cardOnlyConfiguration()` below creates that configuration from code with
// cancellation and plan changes off. The cancel button stays ours — and stays
// ONE CLICK, which is the fourth item on the FTC's Adobe list.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withinLimits } from "../_shared/rateLimit.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { requireMember } from "../_shared/tenant.ts";
import { PLATFORM_URL } from "../_shared/config.ts";
import { publishableKey, stripe, stripeConfigured, StripeError } from "../_shared/stripe.ts";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "../_shared/platformBrand.ts";
import {
  applyPromo,
  consentSentence,
  dunningState,
  exitFeeCents,
  firstChargeCents,
  isPlan,
  isTerm,
  linesFor,
  planFor,
  pricesFrom,
  type PriceTable,
  planLabel,
  type Promo,
  type PromoResult,
  promoProblem,
  termEndDate,
  TERMS,
} from "../_shared/platformBilling.ts";

// Where Stripe sends them back to. The dashboard opens on the billing screen
// in both cases — a detailer who abandoned the card form should land where
// they can try again rather than on a tab that says nothing about it.
const RETURN_URL = `${PLATFORM_URL}/app?settings=billing`;

type Obj = Record<string, unknown>;
const asObj = (v: unknown): Obj => (v && typeof v === "object" ? v as Obj : {});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json().catch(() => ({}));
    const member = await requireMember(req, body.business_id ?? null);
    if (!member) return json({ error: "Unauthorized" }, 401);
    if (member.role !== "owner") {
      return json({ error: "Only the owner can change the subscription." }, 403);
    }
    const businessId = member.businessId;

    const { data: sub } = await supabase
      .from("platform_subscriptions")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    switch (String(body.action || "")) {
      case "summary":   return await summary(businessId, sub);
      case "promo":     return await quotePromo(businessId, body);
      case "subscribe": return await subscribe(businessId, body, sub);
      case "portal":    return await portal(sub);
      case "cancel":    return await cancel(businessId, sub);
      case "resume":    return await resume(businessId, sub);
      default:          return json({ error: "Unknown action." }, 400);
    }
  } catch (err) {
    // Stripe's own message is written for the person paying and is worth
    // showing ("your card was declined"). Anything else is a database or
    // runtime error whose text is for the logs — even though the only reader
    // is the verified owner of this business.
    if (err instanceof StripeError) return json({ error: err.message }, err.status);
    console.error("platform-billing failed:", err);
    return json({ error: "Something went wrong. Nothing was charged." }, 500);
  }
});

// ---------------------------------------------------------------------------

/**
 * Everything the billing screen prints, in one call.
 *
 * THE THREE QUOTES ARE ALWAYS RETURNED, EVEN WHEN THERE IS A SUBSCRIPTION.
 * They cost nothing (pure arithmetic) and the alternative is a second round
 * trip the first time somebody's card is declined and they want to see what
 * the other ways to pay would cost.
 */
// ROADMAP 4.4 STAGE 4 — the owner's own prices, if he has set any.
//
// NOT CACHED, ON PURPOSE. A module-level cache lives as long as the warm
// isolate, so an edit made in the back office would keep charging the old
// figure for an unpredictable few minutes — which is indistinguishable from
// the edit not having saved, and is the one failure that would make him stop
// trusting the screen. It is one indexed read of a one-row table.
//
// `pricesFrom` decides what a bad row means, and it means the FILES: this
// returns the built-in table for a null column, an unparseable object, a
// missing key or a price that is not a positive number. The product then
// charges what it charged yesterday rather than something nobody chose.
async function priceTable(): Promise<PriceTable> {
  const { data } = await supabase.from("platform_settings").select("prices").limit(1).maybeSingle();
  return pricesFrom(data?.prices);
}

async function summary(businessId: string, sub: Record<string, unknown> | null) {
  const { data: business } = await supabase
    .from("businesses")
    .select("plan_tier")
    .eq("id", businessId)
    .single();
  const founding = business?.plan_tier === "founding";

  // AND THE LIST FIGURE BESIDE EACH FOUNDING ONE — the owner's ask, 2026-09-05:
  // *"it should visually show like the discount price vs the regular price for
  // the founder spots."* He is right, and the landing page has done it since
  // 2.2 (`<s className="was">` beside the setup fee and the monthly).
  //
  // IT IS COMPUTED HERE RATHER THAN ON THE SCREEN because `quotes` is already
  // resolved to ONE column by the time the browser sees it — a founding
  // account is handed founding figures and has no way to know what the list
  // price was. This is the same `planFor` with `founding: false`, so the struck
  // number is a REAL price the product charges somebody, never an anchor
  // invented to make the other one look smaller. That rule is written on
  // `LandingPage.jsx` and it applies here.
  const table = await priceTable();
  const quotes: Record<string, unknown> = {};
  for (const term of TERMS) {
    const snap = planFor("website", term, founding, table);
    const list = planFor("website", term, false, table);
    quotes[term] = {
      ...snap,
      consent: consentSentence(snap),
      first_charge_cents: firstChargeCents(snap),
      // Equal to the charged figure when there is no founding spot, so the
      // screen's test is "do these differ" rather than "am I founding".
      list_recurring_cents: list.recurring_cents,
      list_setup_cents: list.setup_cents,
    };
  }
  const bookingSnap = planFor("booking", "monthly", false, table);
  quotes.booking = {
    ...bookingSnap,
    consent: consentSentence(bookingSnap),
    first_charge_cents: firstChargeCents(bookingSnap),
  };

  // The receipts, newest first. Mirrored by the webhook, so this reads our own
  // table and Stripe is not called at all.
  const { data: invoices } = await supabase
    .from("platform_invoices")
    .select("id, number, amount_cents, status, hosted_url, pdf_url, period_start, period_end, paid_at, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(24);

  return json({
    subscription: sub,
    founding,
    quotes,
    invoices: invoices ?? [],
    // What cancelling costs TODAY, from the snapshotted figures on the row.
    exit_fee_cents: sub ? exitFeeCents(sub as never) : 0,
    dunning: dunningState(sub as never),
    // Whether the last button on the screen can do anything yet. False until
    // the owner's Stripe key is set as a function secret.
    configured: stripeConfigured(),
    // THERE IS NOTHING LEFT TO PAY, SO "UPDATE CARD" IS A DEAD END.
    //
    // The owner chose, 2026-09-05, to leave Stripe's default end-of-dunning
    // behaviour alone: when the retries run out the subscription is CANCELLED
    // rather than left unpaid. That is a fine choice and this is its one sharp
    // consequence — **there is no longer an invoice to settle.** The suspended
    // screen was still offering "Update card", and the suspended EMAIL still
    // promises *"the page comes back the moment a payment goes through"*, which
    // in that state cannot happen: a new card fixes nothing because nothing is
    // going to be charged. A detailer would update the card, wait, and phone.
    //
    // Told apart from a DELIBERATE cancellation by the two columns that already
    // record the difference: our own cancel button sets `cancel_at_period_end`,
    // and dunning never does.
    restartable: !!sub && (
      sub.status === "canceled"
      || (sub.status === "suspended" && !!sub.canceled_at && sub.cancel_at_period_end !== true)
    ),
    // HOW TO REACH A PERSON, SENT RATHER THAN TYPED INTO THE SCREEN.
    //
    // `Billing.jsx` could hold this number in two lines of JSX and that is
    // exactly what it must not do — it would be the fourth fact in one week
    // living in two files, and the one where being out of date means a
    // detailer whose booking page is dark dials somebody else. One constant in
    // `platformBrand.ts` feeds the billing emails AND this. `email` is null
    // until the owner has an inbox; the screen renders whichever exists.
    support: { phone: SUPPORT_PHONE, email: SUPPORT_EMAIL },
    // ROADMAP 8.14. `setup_cents` and `recurring_cents` on the row are the
    // DISCOUNTED figures, so without this the screen can print what somebody
    // pays and never why. Null when no code was used.
    promo: sub?.promo_code
      ? {
        code: sub.promo_code as string,
        off_setup_cents: (sub.promo_off_setup_cents as number) ?? 0,
        off_recurring_cents: (sub.promo_off_recurring_cents as number) ?? 0,
      }
      : null,
  });
}

/**
 * WHAT A TYPED CODE WOULD DO, ASKED BEFORE ANYBODY IS CHARGED — roadmap 8.14.
 *
 * **IT REDEEMS NOTHING.** A code that counted against `max_redemptions` on
 * every keystroke would be exhausted by three people thinking about it, and
 * the count is what makes a limited offer limited. The redemption happens in
 * `subscribe`, one line above the snapshot, in the same breath as the price.
 *
 * **AND THE SCREEN DOES NO ARITHMETIC WITH THE ANSWER.** It gets the finished
 * figures and the finished consent sentence back, exactly as `summary` already
 * works, because the whole point of the snapshot approach is that the words a
 * detailer ticks and the money they are charged come from one function over
 * one object.
 *
 * THE FOUNDING TIER IS READ FROM THE DATABASE HERE TOO. Quoting against
 * `founding: false` when the business holds a spot would print the wrong
 * saving and then refuse at the till, which is the worst order to discover a
 * rule in.
 */
async function quotePromo(businessId: string, body: Record<string, unknown>) {
  // THE ENUMERATION GUARD, AND THIS IS THE RIGHT PLACE FOR IT rather than a
  // vaguer error message. The caller is a signed-in owner, so this is not an
  // open endpoint — but it is the only one in the product that answers
  // "does this string exist", and 30 an hour is far more than a person typing
  // a code off a text message and far less than a list.
  if (!await withinLimits(supabase, [{
    bucket: "promo_quote",
    key: businessId,
    windowSeconds: 3600,
    limit: 30,
  }])) {
    return json({ error: "Too many tries. Give it a few minutes." }, 429);
  }

  const typed = String(body.code ?? "").trim().toUpperCase();
  if (!typed) return json({ error: "Type a code first." }, 400);

  const plan = isPlan(body.plan) ? body.plan : "website";
  const term = isTerm(body.term) ? body.term : "annual-monthly";
  const { data: business } = await supabase
    .from("businesses").select("plan_tier").eq("id", businessId).single();

  // **IT QUOTES AGAINST WHAT PRESSING SUBSCRIBE WOULD DO, NOT AGAINST TODAY —
  // and the first version did not, which is a defect this item's own test
  // found rather than a hypothetical.** `subscribe` CLAIMS a founding spot at
  // intent to pay, so a business that is not founding when it asks is founding
  // half a second later. Quoting against `plan_tier` alone meant a code could
  // be accepted here and then refused at the till with *"that code cannot be
  // used with the founding price"* — the code working and then not working,
  // between two presses, with nothing on the screen having changed.
  //
  // The prediction is read-only and claims nothing, so it can be wrong in
  // exactly one way: somebody else takes the last spot in the seconds between.
  // The till is the authority and says so; being wrong the other way — quoting
  // list and charging founding — would print a saving that is smaller than the
  // one taken, which is the direction that generates a complaint.
  //
  // **`founding_offer()`, NOT `founding_spots_left()`.** The first version
  // called the latter, which has not existed since roadmap 6.2 renamed it —
  // PostgREST answered PGRST202, `left` came back undefined, and the
  // prediction silently fell through to "not founding", so the fix looked
  // applied and changed nothing. Found by the test comparing the quote against
  // the charge rather than by reading. A missing RPC is a silent `false` here,
  // which is exactly the shape this repo keeps re-finding.
  let willBeFounding = business?.plan_tier === "founding";
  if (!willBeFounding && plan !== "booking") {
    const { data: offer } = await supabase.rpc("founding_offer");
    const left = (offer as { left?: number } | null)?.left;
    willBeFounding = typeof left === "number" && left > 0;
  }
  const snapshot = planFor(plan, term, willBeFounding, await priceTable());

  const promo = await promoRow(typed);
  const problem = promoProblem(promo, snapshot);
  if (problem) return json({ ok: false, code: typed, problem });

  const applied = applyPromo(snapshot, promo!);
  return json({
    ok: true,
    code: typed,
    label: applied.label,
    off_setup_cents: applied.off_setup_cents,
    off_recurring_cents: applied.off_recurring_cents,
    // What the screen prints. Both, so it can strike one through the other
    // without recomputing either.
    was_cents: firstChargeCents(snapshot),
    amount_cents: firstChargeCents(applied.snapshot),
    recurring_cents: applied.snapshot.recurring_cents,
    setup_cents: applied.snapshot.setup_cents,
    consent: consentSentence(applied.snapshot),
  });
}

/**
 * One code, or null. Upper-cased and trimmed by the caller, because the column
 * is constrained to that shape and a lower-case lookup finds nothing while
 * looking exactly like a code that does not exist.
 */
async function promoRow(code: string) {
  const { data } = await supabase
    .from("platform_promo_codes").select("*").eq("code", code).maybeSingle();
  return (data as unknown as Promo | null) ?? null;
}

async function subscribe(
  businessId: string,
  body: Record<string, unknown>,
  sub: Record<string, unknown> | null,
) {
  // A SUSPENDED ROW WHOSE STRIPE SUBSCRIPTION IS GONE MUST BE ALLOWED THROUGH.
  // With the owner's chosen end-of-dunning setting (cancel rather than leave
  // unpaid) that is the ordinary way back online, and refusing it here would
  // have made the restart button on the screen answer 409 — a way back that
  // does not work is worse than no way back. `restartable` is the same test
  // `summary` gives the screen, spelled once in each place it is enforced.
  const restartable = !!sub && (
    sub.status === "canceled"
    || (sub.status === "suspended" && !!sub.canceled_at && sub.cancel_at_period_end !== true)
  );
  if (sub && sub.status !== "incomplete" && !restartable) {
    return json({ error: "This business already has a subscription." }, 409);
  }
  if (body.consented !== true) {
    // The tick is the statute, so it is a server-side requirement rather than
    // a disabled button. A disabled button is a UI convenience; this is the
    // thing that would be quoted back in a card dispute.
    return json({ error: "The agreement has to be ticked before we can take payment." }, 400);
  }

  const plan = isPlan(body.plan) ? body.plan : "website";
  const term = isTerm(body.term) ? body.term : "annual-monthly";

  // **THE 503 MOVED ABOVE THE CLAIM — roadmap 8.5.** It used to sit below the
  // snapshot, with a note saying everything above it still runs "which is what
  // makes the screen testable". That reasoning is spent — Stripe is configured
  // — and it stopped being harmless the moment a founding SPOT was taken here:
  // claiming one and then answering *payments are not switched on yet* burns a
  // spot on a payment that could never have happened, and the only way back is
  // the back office releasing it by hand.
  if (!stripeConfigured()) {
    return json({ error: "Payments are not switched on yet." }, 503);
  }

  // FOUNDING IS THE DATABASE'S ANSWER, NEVER THE BROWSER'S. `create-business`
  // already refuses to believe `?offer=founding`; believing it here would put
  // the price back in the query string one step later.
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, plan_tier, contact_email")
    .eq("id", businessId)
    .single();

  // ── THE FOUNDING SPOT IS TAKEN HERE, AND ONLY HERE — roadmap 8.5 ────────
  // The owner: *"it should not be taken until they pay, obviously."* It used
  // to be claimed at SIGNUP, by `create-business`, so three people who made an
  // account and never came back consumed the whole offer.
  //
  // **IT IS ONE LINE ABOVE `planFor` FOR A REASON THAT IS NOT TIDINESS.** The
  // price is snapshotted here and never re-read, so a claim made LATER — at
  // the webhook, say, when the money actually lands — would quote and charge
  // LIST prices and then stamp a founding flag on a standard-priced
  // subscription. The claim and the price have to be decided in the same
  // breath or they can disagree, and the row would then say founding while the
  // detailer pays $60 a month for ever.
  //
  // **INTENT TO PAY, NOT PAYMENT.** This runs when the button is pressed, and
  // an abandoned `default_incomplete` checkout therefore holds a spot until
  // somebody releases it — which `platform-admin`'s `tier` action already does
  // in one click. A reservation with a TTL, and a re-quote path for when the
  // spot evaporates between quoting and paying, were both considered and
  // refused: they are a great deal of machinery for three spots.
  //
  // **AND IT IS ATTEMPTED FOR EVERYONE, not only for somebody who arrived
  // with `?offer=founding`.** The offer is *the first three detailers who pay*,
  // so who saw which page is not what decides it; the database counting spots
  // is. It is skipped when the business already holds one, because
  // `claim_founding_spot` would otherwise count this business against its own
  // cap on a retry after a declined card.
  // **AND NOT FOR THE BOOKING PLAN, WHICH HAS NO FOUNDING PRICE.** `planFor`
  // hard-codes `founding: false` for it — the founding ladder only ever
  // discounted the website plan, and $35 is $35 either way. Claiming here
  // would take one of three spots, decrement the count the landing page
  // prints to every visitor, and snapshot a subscription that says
  // `founding: false` at the list price: **the claim and the price
  // disagreeing, which is the exact failure the paragraph above says cannot
  // happen.** Found by this item's own security review, not by reading.
  const eligible = plan !== "booking";
  let founding = business?.plan_tier === "founding";
  // Whether THIS call took the spot, as opposed to finding one already held.
  // Only a spot taken here may be given back on a failure below.
  let claimedNow = false;
  if (eligible && !founding) {
    const { data: granted } = await supabase.rpc("claim_founding_spot", {
      p_business_id: businessId,
    });
    founding = granted === true;
    claimedNow = founding;
  }

  const listSnapshot = planFor(plan, term, founding, await priceTable());

  // Declared above `giveBack` because `giveBack` has to be able to hand it
  // back, and below the founding claim because whether the code is even
  // allowed depends on whether this business now holds a spot.
  let promoResult: PromoResult | null = null;
  let promoTaken: string | null = null;

  // **GIVING THE SPOT BACK WHEN THE CHECKOUT DIES AFTER THE CLAIM.** The claim
  // is intent-to-pay, so everything below can still fail with a spot already
  // taken — and nothing releases one automatically. It undoes only a claim
  // THIS call made: a business that already held the tier keeps it, and
  // `release_founding_spot` refuses outright to touch a business with a live
  // subscription, because that business has bought at that price.
  const giveBack = async () => {
    if (claimedNow) {
      claimedNow = false;
      await supabase.rpc("release_founding_spot", { p_business_id: businessId });
    }
    // ROADMAP 8.14 — THE SAME UNDO FOR THE SAME REASON. A redemption is taken
    // at intent to pay, so every failure below can leave one spent on a
    // checkout that never happened — and on a code with `max_redemptions = 1`
    // that is the whole offer, burned by a declined card.
    if (promoTaken) {
      const code = promoTaken;
      promoTaken = null;
      await supabase.rpc("release_promo_code", { p_code: code });
    }
  };

  // ── THE PROMO CODE, DECIDED IN THE SAME BREATH AS THE PRICE ─────────────
  // Roadmap 8.14, and the placement is roadmap 8.5's finding applied rather
  // than re-learned: **the price is snapshotted here and never re-read**, so a
  // code resolved anywhere later would charge one number and record another.
  //
  // **THE ROW IS READ, THEN THE REDEMPTION IS CLAIMED IN ONE STATEMENT.** The
  // read is what produces a sentence a person can act on; the claim is what
  // makes `max_redemptions` mean anything when two people press subscribe at
  // once. `promoProblem` can therefore pass and `redeem_promo_code` still say
  // no, which is not a contradiction — it is the last one going in the half
  // second between.
  const typedCode = String(body.promo_code ?? "").trim().toUpperCase();
  if (typedCode) {
    const promo = await promoRow(typedCode);
    const problem = promoProblem(promo, listSnapshot);
    if (problem) {
      await giveBack();
      return json({ error: problem }, 400);
    }
    const { data: took } = await supabase.rpc("redeem_promo_code", { p_code: typedCode });
    if (took !== true) {
      await giveBack();
      return json({ error: "That code has just run out." }, 409);
    }
    promoTaken = typedCode;
    promoResult = applyPromo(listSnapshot, promo!);
  }

  // FROM HERE DOWN NOTHING KNOWS A CODE WAS USED, AND THAT IS THE DESIGN.
  // `snapshot` is what the card is charged, what the consent sentence
  // describes, what the invoice lines are built from and what the exit fee is
  // computed against — so a discount that is IN it cannot be forgotten by any
  // of them.
  const snapshot = promoResult ? promoResult.snapshot : listSnapshot;
  const consent = consentSentence(snapshot);

  // A Stripe customer per business, reused if this is a second attempt.
  let customerId = (sub?.stripe_customer_id as string) || null;
  if (!customerId) {
    try {
      const created = await stripe("/customers", {
        name: business?.name,
        email: business?.contact_email || undefined,
        metadata: { business_id: businessId, slug: business?.slug },
      }, { idempotencyKey: `cust:${businessId}` });
      customerId = String(created.id);
    } catch (err) {
      await giveBack();
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OUR OWN PAYMENT FORM, NOT STRIPE'S HOSTED PAGE — the owner's choice,
  // 2026-09-05. Stripe offers three shapes and he picked the third:
  //
  //   1. a hosted page at checkout.stripe.com  (what this was until now)
  //   2. that page embedded in an iframe
  //   3. Elements — the fields are Stripe's, everything around them is ours
  //
  // *"so it can look like the rest of the website."* He is right, and the
  // reason is sharper than taste: the hosted page is white, it is titled with
  // the Stripe account's name rather than the product's, and it appears at the
  // exact moment a detailer is deciding whether to trust us with a card.
  //
  // WHAT DOES NOT CHANGE, AND MUST NOT: the CARD FIELDS THEMSELVES ARE STILL
  // STRIPE'S IFRAME. No card number ever reaches this product, this server or
  // this repo, so the PCI position is identical to the hosted page. What we
  // gained is the frame around it; what we did not gain is any exposure.
  //
  // AND THE MONEY IS DECIDED IN EXACTLY THE SAME PLACE. `planFor` produced the
  // snapshot above, `consentSentence` produced the words, and both are already
  // written before a single Stripe object exists. Only the surface changed.
  //
  // `default_incomplete` IS THE WHOLE MECHANISM: Stripe creates the
  // subscription without attempting payment and hands back a client secret,
  // the browser confirms it against the Payment Element, and the webhook we
  // already have turns `invoice.paid` into an active row. Nothing new listens.
  // EVERY AMOUNT AND EVERY NAME COMES FROM `linesFor`, WHICH IS THE FILE THE
  // TIE-OUT TEST READS. Building them here instead is what let § 2 go on
  // passing against `lineItemsFor` after nothing called it — so this endpoint
  // TRANSLATES and decides nothing. `product` is the one thing it adds,
  // because an id has to be fetched and a pure module cannot fetch.
  // ponytail: `productFor` is awaited while `params` is built, outside any
  // try, so a Stripe outage THERE still leaves a claimed spot behind — as does
  // a failed final upsert. Both are rarer than the three paths `giveBack`
  // covers and both are one click in the back office (`platform-admin`'s
  // `tier`). Wrap the whole post-claim body if that stops being true.
  const lines = linesFor(snapshot);
  const recurring = lines.find((l) => l.interval !== null)!;
  const oneOffs = lines.filter((l) => l.interval === null);

  const params: Record<string, unknown> = {
    customer: customerId,
    items: [{
      price_data: {
        currency: "usd",
        unit_amount: recurring.cents,
        recurring: { interval: recurring.interval },
        // A PRODUCT ID RATHER THAN `product_data`, WHICH THE CHECKOUT SESSION
        // ACCEPTED AND THIS ENDPOINT DOES NOT — measured, not assumed: it
        // answers *"Received unknown parameter: items[0][price_data]
        // [product_data]. Did you mean product?"*. The AMOUNT still comes from
        // this repo on every call; only the NAME lives in Stripe.
        product: await productFor(recurring.name),
      },
    }],
    payment_behavior: "default_incomplete",
    // Saves the card as the subscription's default when the first payment
    // succeeds, which is what makes every renewal after it work.
    payment_settings: { save_default_payment_method: "on_subscription" },
    // `confirmation_secret` is the newer field and needs a 2025+ API version;
    // this integration is pinned to 2024-06-20, where the same value lives at
    // `latest_invoice.payment_intent.client_secret`. The pin and this expand
    // must move together — see _shared/stripe.ts.
    expand: ["latest_invoice.payment_intent"],
    metadata: { business_id: businessId, term, plan: snapshot.plan },
  };

  // THE BUILD FEE IS A ONE-OFF ON THE FIRST INVOICE. On the hosted page it was
  // simply a second line item; here it is `add_invoice_items`, which Stripe
  // appends to the subscription's first invoice — so the customer is charged
  // one amount, once, exactly as before.
  if (oneOffs.length) {
    params.add_invoice_items = await Promise.all(oneOffs.map(async (l) => ({
      price_data: {
        currency: "usd",
        unit_amount: l.cents,
        product: await productFor(l.name),
      },
    })));
  }

  // Stripe Tax, with the same fallback and for the same reason as before: it
  // refuses without a head office address on the account, that is a dashboard
  // setting, and a checkout must not depend on one. See the note on
  // `taxNote()` below.
  let subscription: Record<string, unknown>;
  let taxOff: string | null = null;
  const key = `sub:${businessId}:${term}:${Date.now()}`;
  try {
    subscription = await stripe("/subscriptions", {
      ...params, automatic_tax: { enabled: true },
    }, { idempotencyKey: key });
  } catch (err) {
    const msg = err instanceof StripeError ? err.message : String(err);
    if (!/head office address/i.test(msg)) { await giveBack(); throw err; }
    taxOff = "No head office address on the Stripe account, so tax is not being calculated.";
    console.error(`automatic_tax refused: ${msg}`);
    subscription = await stripe("/subscriptions", params, { idempotencyKey: `${key}:notax` });
  }

  const invoice = asObj(subscription.latest_invoice);
  const intent = asObj(invoice.payment_intent);
  const clientSecret = typeof intent.client_secret === "string" ? intent.client_secret : null;
  if (!clientSecret) {
    // Reachable when the first invoice needs no payment at all. Nothing in this
    // product's pricing produces that today, and a screen that silently draws
    // an empty card form would be the worst way to find out it can.
    console.error("no client secret on the first invoice", { subscription: subscription.id });
    await giveBack();
    return json({ error: "Stripe did not ask for a payment. Nothing was charged." }, 502);
  }

  // The row goes in BEFORE the card form is drawn. See the header.
  const now = new Date();
  // THE PREVIOUS CYCLE'S COLUMNS ARE CLEARED IN THE SAME WRITE. This row is
  // reused when somebody cancels and comes back, and a stale
  // `stripe_subscription_id` is not cosmetic: `cancel` and `resume` address
  // Stripe by it.
  await supabase.from("platform_subscriptions").upsert({
    business_id: businessId,
    ...snapshot,
    consented_at: now.toISOString(),
    consent_text: consent,
    // ALWAYS WRITTEN, NEVER CONDITIONALLY. This row is reused when somebody
    // cancels and comes back, and a stale code left on a restart would record
    // a discount against prices nobody was charged — the same trap the
    // previous cycle's `stripe_subscription_id` had.
    promo_code: promoResult ? typedCode : null,
    promo_off_setup_cents: promoResult?.off_setup_cents ?? 0,
    promo_off_recurring_cents: promoResult?.off_recurring_cents ?? 0,
    stripe_customer_id: customerId,
    stripe_session_id: null,
    // WRITTEN NOW RATHER THAN WAITING FOR THE WEBHOOK, because with our own
    // form the subscription exists before the card is even typed — and if the
    // person closes the tab, `cancel` has to be able to find it.
    stripe_subscription_id: String(subscription.id),
    status: "incomplete",
    term_ends_on: termEndDate(now, snapshot.term_months),
    cancel_at_period_end: false,
    canceled_at: null,
    suspended_at: null,
    exit_fee_charged_cents: null,
    dunning_attempts: 0,
    last_failure_at: null,
    last_failure_reason: null,
    current_period_end: null,
  }, { onConflict: "business_id" });

  return json({
    client_secret: clientSecret,
    publishable_key: publishableKey(),
    label: planLabel(snapshot),
    amount_cents: firstChargeCents(snapshot),
    return_url: `${RETURN_URL}&checkout=done`,
    tax_off: taxOff,
  });

}

/**
 * A Stripe Product for a line on the invoice, created once and found again.
 *
 * THE AMOUNT NEVER LIVES HERE. `price_data.unit_amount` is sent from this repo
 * on every call, so the chain from `pricing.js` to the card is unbroken; a
 * Product carries only the NAME a detailer reads on their receipt. That is the
 * whole reason the hosted page could use `product_data` and this endpoint has
 * to use `product` — a difference in Stripe's API, not in where the money is
 * decided.
 *
 * Found by metadata rather than stored in a column, for the same reason the
 * portal configuration is: one extra GET on a screen somebody opens twice a
 * year, against a migration for one string.
 */
const PRODUCT_TAG = "dp-line";
async function productFor(name: string): Promise<string> {
  const list = await stripe("/products?limit=100&active=true");
  const found = (list.data as Record<string, unknown>[] | undefined)?.find((p) =>
    p.name === name && (p.metadata as Record<string, unknown> | undefined)?.tag === PRODUCT_TAG);
  if (found) return String(found.id);
  const made = await stripe("/products", { name, metadata: { tag: PRODUCT_TAG } });
  return String(made.id);
}

// The portal configuration this product uses, tagged so it can be found again.
const PORTAL_TAG = "dp-card-only";

/**
 * WHAT THE PORTAL IS ALLOWED TO DO, DECIDED IN THIS REPO RATHER THAN IN AN
 * ADMIN PANEL — the security review's own words turned back on this file.
 *
 * `flow_data` deep-links a customer into the card-update flow, but what they
 * can reach AROUND it is governed by the portal CONFIGURATION, which is Stripe
 * dashboard state that nothing here can read. That is precisely the failure
 * this item already refused for the dunning emails: *a guarantee resting on a
 * setting nobody in this repo can see is resting on nothing.* And the money at
 * stake is real — a portal that offers cancellation lets somebody leave a
 * twelve-month term without the early-exit fee ever being charged.
 *
 * So the configuration is created here, with cancellation and plan changes
 * OFF, and found again by its metadata tag rather than stored — one extra GET
 * on a screen somebody opens twice a year, against a migration for one string.
 */
async function cardOnlyConfiguration(): Promise<string> {
  const list = await stripe("/billing_portal/configurations?limit=100");
  const existing = (list.data as Record<string, unknown>[] | undefined)
    ?.find((c) => (c.metadata as Record<string, unknown> | undefined)?.tag === PORTAL_TAG);
  if (existing) return String(existing.id);

  const made = await stripe("/billing_portal/configurations", {
    business_profile: { headline: "Update the card on your subscription" },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      // ALL THREE OFF ON PURPOSE. Cancelling here would skip the exit fee and
      // our own `canceled_at`; changing the plan would charge a price no
      // screen in this product ever printed; editing the customer record is
      // Stripe's own address form rather than ours.
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
      customer_update: { enabled: false },
    },
    metadata: { tag: PORTAL_TAG },
  }, { idempotencyKey: `portalcfg:${PORTAL_TAG}` });
  return String(made.id);
}

async function portal(sub: Record<string, unknown> | null) {
  if (!sub?.stripe_customer_id) return json({ error: "There is no card on file yet." }, 409);
  const session = await stripe("/billing_portal/sessions", {
    customer: sub.stripe_customer_id,
    return_url: RETURN_URL,
    configuration: await cardOnlyConfiguration(),
    // The deep link on top of the configuration: they land on the card form
    // rather than on a menu with one item.
    flow_data: { type: "payment_method_update" },
  });
  return json({ url: session.url });
}

async function cancel(businessId: string, sub: Record<string, unknown> | null) {
  if (!sub?.stripe_subscription_id) return json({ error: "There is nothing to cancel." }, 409);
  if (sub.status === "canceled") return json({ success: true, already: true });

  // WHAT LEAVING COSTS IS COMPUTED FROM THE ROW, NEVER FROM pricing.js. The
  // figures were snapshotted at checkout precisely so a later price change
  // cannot rewrite a fee somebody already agreed to.
  const fee = exitFeeCents(sub as never);

  if (fee > 0) {
    // Charged NOW, to the card on file, which is what makes the button able to
    // stay one click. An invoice item plus an immediate invoice, so the
    // detailer gets a document naming what it was for — an unexplained charge
    // is a chargeback, and the disclosure is the whole defence.
    await stripe("/invoiceitems", {
      customer: sub.stripe_customer_id,
      amount: fee,
      currency: "usd",
      description: `Ending your ${sub.term_months}-month plan early`,
    }, { idempotencyKey: `exit:${businessId}:${sub.stripe_subscription_id}` });
    const invoice = await stripe("/invoices", {
      customer: sub.stripe_customer_id,
      auto_advance: false,
      metadata: { business_id: businessId, kind: "exit_fee" },
    }, { idempotencyKey: `exitinv:${businessId}:${sub.stripe_subscription_id}` });
    await stripe(`/invoices/${invoice.id}/pay`, {});
    // RECORDED THE MOMENT IT IS TAKEN, BEFORE THE CALL THAT CAN THROW. Money
    // has left their card; if the cancellation below fails, the fee must not
    // be a charge with no record of what it was for. The idempotency keys mean
    // a retry of this whole action reuses the same invoice item rather than
    // charging twice.
    await supabase.from("platform_subscriptions")
      .update({ exit_fee_charged_cents: fee })
      .eq("business_id", businessId);
  }

  // CANCEL AT PERIOD END, not immediately: they have paid for this month and
  // taking the site down the moment they press the button would be charging
  // for something we then withdrew. The refund policy says the current period
  // is not refunded, and that only reads as fair if they keep it.
  await stripe(`/subscriptions/${sub.stripe_subscription_id}`, { cancel_at_period_end: true });

  await supabase.from("platform_subscriptions").update({
    cancel_at_period_end: true,
    canceled_at: new Date().toISOString(),
  }).eq("business_id", businessId);

  return json({ success: true, exit_fee_cents: fee });
}

async function resume(businessId: string, sub: Record<string, unknown> | null) {
  if (!sub?.stripe_subscription_id || !sub.cancel_at_period_end) {
    return json({ error: "There is nothing to restart." }, 409);
  }
  await stripe(`/subscriptions/${sub.stripe_subscription_id}`, { cancel_at_period_end: false });
  // THE EXIT FEE IS NOT REFUNDED HERE AND THE SCREEN SAYS SO BEFORE THE PRESS.
  // Reversing it would mean an unpick nobody has asked for, and a detailer who
  // cancels and un-cancels twice in a week would otherwise be a free loop.
  await supabase.from("platform_subscriptions").update({
    cancel_at_period_end: false,
    canceled_at: null,
  }).eq("business_id", businessId);
  return json({ success: true });
}
