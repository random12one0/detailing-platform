// ROADMAP 97.80 — THE PAYMENT PILL READS THE JOB'S OWN REFUND, NOT ONLY ITS STATUS.
// A refund made in Stripe leaves `payment_status` as it was; the webhook records it
// in `payment_problem.refunds`, by payment (97.68). So a job whose own card payment
// was refunded in full said "Paid" in green while THE MONEY said "Refunded".
// One function, because the job record and the booking card both draw this pill.
export const PAY_LABELS = {
  paid: "Paid", pending: "Unpaid", partial: "Part paid", waived: "Waived",
  refunded: "Refunded", part_refunded: "Part refunded",
};

export function payPill(b) {
  const own = b?.stripe_payment_intent ? b.payment_problem?.refunds?.[b.stripe_payment_intent] : null;
  const refunded = Number(own?.refunded_cents) || 0;
  // Only money that moved can be refunded: `pending` took nothing, `waived` was given away.
  if (refunded <= 0 || (b.payment_status !== "paid" && b.payment_status !== "partial")) return b?.payment_status;
  return refunded >= (Number(own.paid_cents) || 0) ? "refunded" : "part_refunded";
}
