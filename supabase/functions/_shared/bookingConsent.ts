// 99.2f: consent belongs to the customer's successful public booking.
// No sending, no client timestamp/source, and this path never clears STOP.
// Existing evidence is kept; an unchecked box is not a withdrawal.
export async function saveBookingSmsConsent(
  db: any, businessId: string, customerId: string | null,
  consent: unknown, member: unknown,
) {
  if (consent !== true || member || !customerId) return;
  const { error } = await db.from("customers")
    .update({ sms_consent_at: new Date().toISOString(), sms_consent_source: "booking_form" })
    .eq("business_id", businessId).eq("id", customerId)
    .is("sms_consent_at", null);
  if (error) throw error;
}
