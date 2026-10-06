// THE BANK'S REASON IN THE BILLING EMAIL — OURS WHEN WE KNOW THE CODE.
//
// Stripe's `failure_message` is English only, so a Spanish "payment failed"
// email quoted "Your card has insufficient funds." (found reading the 3.4
// FAULT 4 renders, 2026-10-06). `declineText` in `_shared/emailTemplates.ts`
// now says the common decline codes in the reader's language and falls back to
// Stripe's own text ONLY for a code it does not know.
//
//   node --test tests/billing-decline.test.mjs      # credential-free, no network
//
// Sabotage it is built to catch: the mapping deleted (the provider text comes
// back in both languages), or the fallback deleted (an unknown code prints no
// reason at all, which drops the one line a detailer can act on).
import { test } from "node:test";
import assert from "node:assert/strict";
import { billingEmail } from "../supabase/functions/_shared/emailTemplates.ts";
import { platformBrand } from "../supabase/functions/_shared/platformBrand.ts";

const brand = platformBrand("https://detailingplatform.com");
const STRIPE = "Your card has insufficient funds.";
const mail = (reasonCode, lang, reason = STRIPE) => billingEmail(brand, {
  kind: "failed", businessName: "Ridgeline Auto Detail", billingUrl: "https://detailingplatform.com/app",
  amount: 60, reason, reasonCode,
}, lang).text;

test("a known code is said in our words, in the reader's language, and Stripe's English is not quoted", () => {
  const en = mail("insufficient_funds", "en");
  const es = mail("insufficient_funds", "es");
  assert.match(en, /Your bank said: The card did not have enough funds\./);
  assert.match(es, /Tu banco dijo: La tarjeta no tenía fondos suficientes\./);
  assert.doesNotMatch(en + es, /insufficient funds/i);
});

test("an unknown code, or none, falls back to the provider's own text", () => {
  for (const code of ["some_new_code_stripe_adds", null]) {
    assert.match(mail(code, "es"), /Tu banco dijo: Your card has insufficient funds\./, String(code));
    assert.match(mail(code, "en"), /Your bank said: Your card has insufficient funds\./, String(code));
  }
});

test("no code and no text prints no reason line at all", () => {
  assert.doesNotMatch(mail(null, "en", null), /Your bank said/);
});

test("lost and stolen cards get the plain declined sentence, never the reason", () => {
  for (const code of ["lost_card", "stolen_card", "fraudulent"]) {
    const en = mail(code, "en", "Your card was declined.");
    assert.match(en, /The card was declined\. Your bank can tell you why\./, code);
    assert.doesNotMatch(en, /lost|stolen|fraud/i, code);
  }
});
