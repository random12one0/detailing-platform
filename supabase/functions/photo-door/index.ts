// The photo door — ROADMAP 0.11. The one place a photo may be authorised, signed
// for, measured and recorded. All the rules are in `_shared/photoDoor.ts`
// (import-free, so a Node test runs them); this file only connects them to the
// real database and the real R2.
//
// Input / output: the contract at the top of `app/src/lib/photo-door.js`.
// Since 0.11 slice 5 the same door also signs for `expense-receipts`, asked
// for with `store: "receipt"`; the differences are the STORES table in
// `_shared/photoDoor.ts` and what ROADMAP 0.11 tells the app half to send.
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
import { makeR2, mediaBase, publicUrl, r2Config } from "../_shared/r2.ts";

const getPhoto = async (businessId: string, photoId: string): Promise<PhotoRow | null> => {
  const { data, error } = await supabase.from("job_photos").select("*")
    .eq("id", photoId).eq("business_id", businessId).maybeSingle();
  if (error) throw error;
  return data;
};

const deps = (): PhotoDeps => {
  const { config, missing } = r2Config((n) => Deno.env.get(n));
  if (!config) console.error("photo-door: not configured, missing", missing.join(", "));
  // `business-media` is public-read, so it needs an address as well as a
  // credential — and a missing one is a different failure from a missing key,
  // so it is logged by its own NAME. ROADMAP 0.11 slice 4.
  const { base, missing: noBase } = mediaBase((n) => Deno.env.get(n));
  if (!base) console.error("photo-door: no public image address, missing", noBase.join(", "));
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

    // ---------------------------------------------------- receipts, slice 5
    // EVERY ONE OF THESE FILTERS ON `business_id` AS WELL AS `id`. The service
    // role bypasses RLS, so the isolation the storage policies give a browser
    // has to be written out here; a query by id alone would read and write
    // another tenant's expense with no error anywhere.
    async expenseBelongs(businessId, expenseId) {
      const { data } = await supabase.from("expenses").select("id")
        .eq("id", expenseId).eq("business_id", businessId).maybeSingle();
      return !!data;
    },
    async getReceipt(businessId, expenseId) {
      const { data, error } = await supabase.from("expenses")
        .select("id, business_id, receipt_path, receipt_bytes, receipt_width, receipt_height, receipt_uploaded_at")
        .eq("id", expenseId).eq("business_id", businessId).maybeSingle();
      if (error) throw error;
      return data;
    },
    async saveReceipt(row) {
      // `.eq("business_id", ...)` again on the WRITE, not only the read above:
      // the read and the write are two round trips and the guard belongs on
      // the one that changes something.
      const { data, error } = await supabase.from("expenses")
        .update({
          receipt_path: row.receipt_path, receipt_bytes: row.receipt_bytes,
          receipt_width: row.receipt_width, receipt_height: row.receipt_height,
          receipt_uploaded_at: row.receipt_uploaded_at,
        })
        .eq("id", row.id).eq("business_id", row.business_id)
        .select("id, business_id, receipt_path, receipt_bytes, receipt_width, receipt_height, receipt_uploaded_at")
        .single();
      if (error) throw error;
      return data;
    },
    async clearReceipt(businessId, expenseId) {
      const { error } = await supabase.from("expenses")
        .update({
          receipt_path: null, receipt_bytes: null, receipt_width: null,
          receipt_height: null, receipt_uploaded_at: null,
        })
        .eq("id", expenseId).eq("business_id", businessId);
      if (error) throw error;
    },

    // ------------------------------------------- business-media, slice 4
    // No row and no query: the whole wiring is one address. `null` when none
    // is configured, and the door turns that into a sentence rather than a
    // signed upload nobody could ever read back.
    mediaUrl: base ? (key) => publicUrl(base, key) : undefined,

    r2: config ? makeR2(config) : null,
    log: (...a) => console.error(...a),
  };
};

Deno.serve((req) => handlePhotoDoor(req, deps()));
