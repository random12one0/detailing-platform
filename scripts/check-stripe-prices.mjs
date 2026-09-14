// EVERY LOOKUP KEY THIS PRODUCT CAN ASK FOR EXISTS IN STRIPE, AND IS THE
// SHAPE THE PLAN THINKS IT IS — Andrew's ask, 2026-09-14.
//
//   set -a; . ./.env; set +a
//   node scripts/check-stripe-prices.mjs
//
// ============================================================================
// WHY THIS IS A SCRIPT AND NOT PART OF THE CREDENTIAL-FREE SUITE
// ============================================================================
// `tests/platform-billing.test.mjs` § 22 pins WHICH key each plan asks for and
// must never need a key to run. This one asks STRIPE whether those keys
// resolve — a different question, answerable only with the secret, and the
// only one that catches the failure that actually matters: a key the code
// resolves that nobody ever created.
//
// **THE FAILURE IT GUARDS IS A REFUSED CHECKOUT, NOT A WRONG CHARGE**, and
// that is by design — `_shared/stripePrices.ts` refuses rather than falling
// back. This script is how that refusal is found on a Tuesday afternoon
// instead of by the first detailer who tries to subscribe.
//
// IT READS AND NEVER WRITES. No price is created, archived or edited here; a
// missing key is reported for a person to create, because deciding what
// something costs is not a script's job.

import { ALL_LOOKUP_KEYS, LOOKUP_KEYS } from "../supabase/functions/_shared/stripePrices.ts";

const KEY = process.env.STRIPE_SECRET_KEY || "";
if (!KEY) {
  // PRINTS THAT IT SKIPPED. This repo's single most repeated failure is a
  // check that skips reading exactly like one that passed.
  console.error("SKIPPED — no STRIPE_SECRET_KEY in the environment.");
  console.error("  set -a; . ./.env; set +a   then run this again.");
  process.exit(1);
}

let passed = 0;
let failed = 0;
const check = (name, ok, detail = "") => {
  if (ok) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};

const money = (c) => `$${(c / 100).toFixed(2)}`;

// ONE CALL FOR THE WHOLE SET — Stripe's list endpoint takes repeated
// `lookup_keys[]`, and `active=true` matters: an archived price cannot be
// attached to a new subscription, so a key that resolves only to an archived
// price is a key that does not work.
const qs = new URLSearchParams();
for (const k of ALL_LOOKUP_KEYS) qs.append("lookup_keys[]", k);
qs.set("active", "true");
qs.set("limit", "100");

const res = await fetch(`https://api.stripe.com/v1/prices?${qs}`, {
  headers: { Authorization: `Bearer ${KEY}`, "Stripe-Version": "2024-06-20" },
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  // NEVER THE KEY, AND NEVER ANY PART OF IT — only Stripe's own sentence.
  console.error(`Stripe refused the list call: ${body?.error?.message ?? res.status}`);
  process.exit(1);
}

const mode = KEY.startsWith("sk_test_") ? "TEST" : "LIVE";
const found = new Map();
for (const p of body.data ?? []) if (p.lookup_key) found.set(p.lookup_key, p);

console.log(`\nStripe ${mode} mode · ${ALL_LOOKUP_KEYS.length} lookup keys the code can ask for\n`);

// ─── 1. EVERY KEY RESOLVES ────────────────────────────────────────────────
// The one that matters. A missing key is a checkout this product refuses.
for (const key of ALL_LOOKUP_KEYS) {
  const p = found.get(key);
  check(
    `1 · ${key} resolves to an active price`,
    !!p,
    "no active price carries this lookup key — create it in Stripe, or checkout refuses",
  );
}

// ─── 2. EACH ONE IS THE SHAPE ITS PLAN EXPECTS ────────────────────────────
// A key is a label somebody typed. `website_dashboard_yearly` pointing at a
// monthly price would bill twelve times a year at the annual rate, and every
// screen in this product would look correct while it happened.
const wantInterval = {
  [LOOKUP_KEYS.founding["annual-upfront"]]: "year",
  [LOOKUP_KEYS.standard["annual-upfront"]]: "year",
  [LOOKUP_KEYS.founding["annual-monthly"]]: "month",
  [LOOKUP_KEYS.standard["annual-monthly"]]: "month",
  [LOOKUP_KEYS.founding.monthly]: "month",
  [LOOKUP_KEYS.standard.monthly]: "month",
  [LOOKUP_KEYS.booking.monthly]: "month",
  [LOOKUP_KEYS.founding.setup]: null,
  [LOOKUP_KEYS.standard.setup]: null,
};
for (const [key, want] of Object.entries(wantInterval)) {
  const p = found.get(key);
  if (!p) continue; // already failed above; do not report the same gap twice
  const got = p.recurring?.interval ?? null;
  check(
    `2 · ${key} bills ${want === null ? "once" : `every ${want}`} (${money(p.unit_amount)})`,
    got === want,
    `Stripe says ${got === null ? "one-off" : `every ${got}`}`,
  );
}

// ─── 3. THE FOUNDING PRICE IS BELOW THE LIST PRICE ────────────────────────
// The founding offer is a DISCOUNT. A founding key priced at or above its
// standard twin is the offer silently inverted — a detailer told they are
// saving money while paying more, which is the one outcome worse than a
// refused checkout.
for (const term of ["annual-monthly", "annual-upfront", "monthly", "setup"]) {
  const f = found.get(LOOKUP_KEYS.founding[term]);
  const s = found.get(LOOKUP_KEYS.standard[term]);
  if (!f || !s) continue;
  check(
    `3 · founding ${term} (${money(f.unit_amount)}) is cheaper than standard (${money(s.unit_amount)})`,
    f.unit_amount < s.unit_amount,
    "the founding offer is a discount; this pair says otherwise",
  );
}

// ─── 4. NO TWO KEYS POINT AT ONE PRICE ────────────────────────────────────
// Two lookup keys on one price object means raising one raises the other —
// which is exactly the immutability guarantee this design was bought for,
// undone.
{
  const ids = [...found.values()].map((p) => p.id);
  check(
    `4 · each key is its own price object — ${ids.length} keys, ${new Set(ids).size} prices`,
    ids.length === new Set(ids).size,
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
  console.log("\nA missing or mis-shaped price does not charge anybody the wrong amount —");
  console.log("`_shared/stripePrices.ts` refuses the checkout instead. Create the price in");
  console.log("Stripe with the lookup key named above and run this again.");
}
process.exit(failed ? 1 : 0);
