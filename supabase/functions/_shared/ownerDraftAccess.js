const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export async function ownerDraft(
  req,
  {
    flags,
    requireMember,
    markedPreview,
    json,
    preflight,
  },
) {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const deny = () => json({ error: "not_found" }, 404);
  try {
    if (
      req.headers.get("Origin") !==
        (flags.origin || "https://detailingplatform.com") ||
      flags.enabled !== "1" ||
      !uuid.test(flags.owner) ||
      !uuid.test(flags.business)
    )
      return deny();
    const raw = await req.text();
    if (raw.length > 64000) return json({ error: "too_large" }, 413);
    let b;
    try {
      b = JSON.parse(raw);
    } catch {
      return json({ error: "invalid_request" }, 400);
    }
    if (b?.action !== "access" || b.business_id !== flags.business) return deny();
    const m = await requireMember(req, flags.business, { allowUnpaid: true });
    if (
      m?.role !== "owner" ||
      m.userId !== flags.owner ||
      m.businessId !== flags.business
    )
      return deny();
    if (
      await markedPreview(
        (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""),
      )
    )
      return deny();
    return json({owner:m.userId,business:m.businessId,mode:"off"});
  } catch {
    return deny();
  }
}
