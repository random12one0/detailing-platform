// 99.2f: consent belongs to the customer's successful public booking.
// No sending, no client timestamp/source, and this path never clears STOP.
// Existing evidence is kept; an unchecked box is not a withdrawal.
export async function saveBookingSmsConsent(
  db: any, businessId: string, customerId: string | null,
  consent: unknown, member: unknown,
) {
  if (consent !== true || member) return;
  if (!customerId) throw new Error("sms_consent_not_saved");
  const { error } = await db.from("customers")
    .update({ sms_consent_at: new Date().toISOString(), sms_consent_source: "booking_form" })
    .eq("business_id", businessId).eq("id", customerId)
    .is("sms_consent_at", null);
  if (error) {
    console.error("Booking text consent write failed:", error);
    throw new Error("sms_consent_not_saved");
  }
}
