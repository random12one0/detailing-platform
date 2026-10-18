// ROADMAP 97.80 — THE PAYMENT PILL READS THE JOB'S OWN REFUND, NOT ONLY ITS STATUS.
// A refund made in Stripe leaves `payment_status` as it was; the webhook records it
// in `payment_problem.refunds`, by payment (97.68). So a job whose own card payment
// was refunded in full said "Paid" in green while THE MONEY said "Refunded".
// One function, because the job record and the booking card both draw this pill.
export const PAY_LABELS = {
  paid: "Paid", pending: "Unpaid", partial: "Part paid", waived: "Waived",
  refunded: "Refunded", part_refunded: "Part refunded",
};

const ownRefund = (b) => (b?.stripe_payment_intent ? b.payment_problem?.refunds?.[b.stripe_payment_intent] : null);
export const refundedCents = (b) => Number(ownRefund(b)?.refunded_cents) || 0;

export function payPill(b) {
  const refunded = refundedCents(b);
  // Only money that moved can be refunded: `pending` took nothing, `waived` was given away.
  if (refunded <= 0 || (b.payment_status !== "paid" && b.payment_status !== "partial")) return b?.payment_status;
  return refunded >= (Number(ownRefund(b).paid_cents) || 0) ? "refunded" : "part_refunded";
}

// ROADMAP 97.81 — HOW MUCH OF `price` THE JOB KEPT, for any total that says "collected".
// The pill was fixed and the totals still read `payment_status` alone, so a job refunded
// in full counted as money kept on Today and in the accountant's file. Same reading as
// the pill, so the card and the figure under it cannot disagree.
export function keptOf(b, price) {
  const pill = payPill(b);
  if (pill === "refunded") return 0;
  return pill === "part_refunded" ? Math.max(0, price - refundedCents(b) / 100) : price;
}
