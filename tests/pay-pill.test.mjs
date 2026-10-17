// ROADMAP 97.80 — the payment pill reads the job's own refund (`payment_problem.refunds`,
// keyed by the job's own `stripe_payment_intent`), not `payment_status` alone. Credential-free.
// The job record and the booking card both call `payPill`; the browser half is
// `scripts/payment-problem-late.mjs` (--break=plain-pill).
import test from "node:test";
import assert from "node:assert/strict";
import { payPill, PAY_LABELS } from "../app/src/lib/payPill.js";

const refunds = (cents, intent = "pi_1") => ({ refunds: { [intent]: { paid_cents: 15000, refunded_cents: cents, at: "2026-10-16T15:00:00Z" } } });
const job = (over) => ({ payment_status: "paid", stripe_payment_intent: "pi_1", payment_problem: null, ...over });

test("a payment refunded in full reads Refunded, never Paid", () => {
  assert.equal(payPill(job({ payment_problem: refunds(15000) })), "refunded");
  assert.equal(payPill(job({ status: "cancelled", payment_problem: refunds(15000) })), "refunded");
  assert.equal(PAY_LABELS.refunded, "Refunded");
});

test("a payment refunded in part reads Part refunded", () => {
  assert.equal(payPill(job({ payment_problem: refunds(5000) })), "part_refunded");
  assert.equal(payPill(job({ payment_status: "partial", payment_problem: refunds(5000) })), "part_refunded");
  assert.equal(PAY_LABELS.part_refunded, "Part refunded");
});

test("the refused cases keep their own pill", () => {
  assert.equal(payPill(job({})), "paid", "nothing refunded");
  assert.equal(payPill(job({ payment_problem: refunds(0) })), "paid", "a zero refund");
  // A refund of a DIFFERENT payment (an extra one) is not this job's own money going back.
  assert.equal(payPill(job({ payment_problem: refunds(15000, "pi_2") })), "paid", "another payment's refund");
  assert.equal(payPill(job({ stripe_payment_intent: null, payment_problem: refunds(15000) })), "paid", "no card payment of its own");
  assert.equal(payPill(job({ payment_status: "waived", payment_problem: refunds(15000) })), "waived");
  assert.equal(payPill(job({ payment_status: "pending", payment_problem: refunds(15000) })), "pending");
});

test("every label the pill can show has a Spanish key", async () => {
  const { appEs: es } = await import("../app/src/lib/strings/appEs.js");
  for (const label of Object.values(PAY_LABELS)) assert.ok(es[label], `no Spanish for "${label}"`);
});
