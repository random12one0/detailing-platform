import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { requireMember, markedPreview } from "../_shared/tenant.ts";
import { ownerDraft } from "../_shared/ownerDraftAccess.js";
function storeFor(m: { userId: string; businessId: string }) {
  const scope = { owner_id: m.userId, business_id: m.businessId };
  const table = () => supabase.from("owner_draft_private");
  const create = async (key: string, value: unknown) => {
    const { error } = await table().insert({
      ...scope,
      key,
      value,
      revision: 1,
    });
    if (error && error.code !== "23505") throw Error("storage_unavailable");
    return !error;
  };
  return {
    create,
    read: async (key: string) => {
      const { data, error } = await table()
        .select("value,revision")
        .match({ ...scope, key })
        .maybeSingle();
      if (error) throw Error("storage_unavailable");
      return data;
    },
    save: async (key: string, value: unknown, revision: number) => {
      if (!revision) return create(key, value);
      const { data, error } = await table()
        .update({ value, revision: revision + 1 })
        .match({ ...scope, key, revision })
        .select("revision");
      if (error) throw Error("storage_unavailable");
      return data?.length === 1;
    },
  };
}
Deno.serve(async (req) => {
  const r = await ownerDraft(req, {
    flags: {
      enabled: Deno.env.get("OWNER_DRAFT_ENABLED"),
      owner: Deno.env.get("OWNER_DRAFT_USER_ID"),
      business: Deno.env.get("OWNER_DRAFT_BUSINESS_ID"),
      ai: Deno.env.get("OWNER_DRAFT_AI_MODE"),
      secret: Deno.env.get("OWNER_DRAFT_WRAPPING_KEY"),
    },
    requireMember,
    markedPreview,
    storeFor,
    json,
    preflight,
  });
  r.headers.set("Cache-Control", "private, no-store");
  return r;
});
