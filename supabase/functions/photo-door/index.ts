// The photo door — ROADMAP 0.11. The one place a photo may be authorised, signed
// for, measured and recorded. All the rules are in `_shared/photoDoor.ts`
// (import-free, so a Node test runs them); this file only connects them to the
// real database and the real R2.
//
// Input / output: the contract at the top of `app/src/lib/photo-door.js`.
//
// **verify_jwt STAYS ON** — this is not in `PUBLIC_FUNCTIONS` in
// `scripts/deploy-functions.mjs` and must not be: every action needs the
// owner's or a team member's session.
//
// **CREDENTIALS: BY NAME, FROM THE ENVIRONMENT, NEVER PRINTED.** `R2_ACCOUNT_ID`,
// `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (`docs/services-and-secrets.md`).
// When one is missing the function answers 503 in words and logs only the
// NAME that is missing. `SUPABASE_ANON_KEY` is read for one thing: asking
// `job_photo_budget()` as the caller, which is the only way it answers (see the
// header of `_shared/photoDoor.ts`).
//
// **NOT DEPLOYED.** Publishing is Andrew's. Until it is, the app answers every
// photo action with "Photo storage is not set up on the server yet."

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { SUPABASE_URL, supabase } from "../_shared/db.ts";
import { can, requireMember } from "../_shared/tenant.ts";
import { LIMITS, withinLimits } from "../_shared/rateLimit.ts";
import { handlePhotoDoor, type PhotoDeps, type PhotoRow } from "../_shared/photoDoor.ts";
import { makeR2, r2Config } from "../_shared/r2.ts";

const getPhoto = async (businessId: string, photoId: string): Promise<PhotoRow | null> => {
  const { data, error } = await supabase.from("job_photos").select("*")
    .eq("id", photoId).eq("business_id", businessId).maybeSingle();
  if (error) throw error;
  return data;
};

const deps = (): PhotoDeps => {
  const { config, missing } = r2Config((n) => Deno.env.get(n));
  if (!config) console.error("photo-door: not configured, missing", missing.join(", "));
  return {
    requireMember,
    can,
    withinLimits: (limits) => withinLimits(supabase, limits),
    limit: LIMITS.photoDoorPerBusiness,
    async bookingBelongs(businessId, bookingId) {
      const { data } = await supabase.from("bookings").select("id")
        .eq("id", bookingId).eq("business_id", businessId).maybeSingle();
      return !!data;
    },
    async budget(businessId, token) {
      const anon = Deno.env.get("SUPABASE_ANON_KEY");
      if (!anon || !token) return null;
      const asCaller = createClient(SUPABASE_URL, anon, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      });
      const { data, error } = await asCaller.rpc("job_photo_budget", { p_business: businessId });
      if (error || !Array.isArray(data) || !data[0]) return null;
      return { used_bytes: Number(data[0].used_bytes), cap_bytes: Number(data[0].cap_bytes) };
    },
    getPhoto,
    async insertPhoto(row) {
      const { data, error } = await supabase.from("job_photos").insert(row).select().single();
      if (!error) return data;
      // 23505 = the id or the path is already there: a retry, or two presses at
      // once. The row that exists is the answer, never a second one.
      if (error.code === "23505") {
        const there = await getPhoto(row.business_id, row.id);
        if (there) return there;
      }
      throw error;
    },
    async deletePhoto(businessId, photoId) {
      const { error } = await supabase.from("job_photos").delete().eq("id", photoId).eq("business_id", businessId);
      if (error) throw error;
    },
    r2: config ? makeR2(config) : null,
    log: (...a) => console.error(...a),
  };
};

Deno.serve((req) => handlePhotoDoor(req, deps()));
