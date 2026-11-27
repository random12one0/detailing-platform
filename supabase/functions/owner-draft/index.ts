import { json, preflight } from "../_shared/http.ts";
import { requireMember, markedPreview } from "../_shared/tenant.ts";
import { ownerDraft } from "../_shared/ownerDraftAccess.js";
Deno.serve(async (req) => {
  const r = await ownerDraft(req, {
    flags: {
      enabled: Deno.env.get("OWNER_DRAFT_ENABLED"),
      owner: Deno.env.get("OWNER_DRAFT_USER_ID"),
      business: Deno.env.get("OWNER_DRAFT_BUSINESS_ID"),
    },
    requireMember,
    markedPreview,
    json,
    preflight,
  });
  r.headers.set("Cache-Control", "private, no-store");
  return r;
});
