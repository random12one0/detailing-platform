// ROADMAP 8.11 — a customer asks to be forgotten.
//
// *"There should be an option where if you click on a customer, they just
// delete their info."* This is the half `export_business` (item H) said it was
// owed; that function's own header names a deletion request as *"the one legal
// ask that arrives without warning."*
//
// Input:  { business_id, customer_id }
// Output: { ok, name, bookings_anonymised, photos_deleted }
//
// ---------------------------------------------------------------------------
// THREE THINGS THIS FUNCTION DECIDES THAT `forget_customer()` CANNOT.
// ---------------------------------------------------------------------------
//
// **(1) WHO. OWNER ONLY, and that is not the usual permission question.** The
// four permission ticks are `money`, `marketing`, `settings` and `requests`,
// and none of them means "may erase a person". This is the same reasoning
// roadmap 2.13 used to refuse a `team` tick and 2.20 used for the subscription
// row: where there is no tick that means the thing, and the thing cannot be
// undone, it belongs to the owner. Hiding the button is courtesy; this is the
// copy that holds.
//
// **(2) THE FILES.** `forget_customer()` deletes the `job_photos` ROWS, but a
// row is not a photo — the images live in the private `job-photos` bucket and
// SQL cannot reach object storage. So the paths are read and the objects
// removed HERE, BEFORE the SQL call, and a failure to remove them ABORTS: a
// deletion that leaves a stranger's car outside their own house in a bucket,
// while reporting success, is the worst outcome this endpoint has.
//
// **(3) THE ORDER, WHICH IS THE ONLY PART THAT CAN GO WRONG QUIETLY.** Files
// first, rows second. The other way round loses the paths — the rows that name
// them are gone — and the files are then unreachable and undeletable for ever.
//
// **NOTHING IS EMAILED AND NOTHING IS LOGGED ABOUT THE PERSON.** Writing
// "deleted dana@example.com" into a log is keeping the address after being
// asked to destroy it, which is the request failing in the one place nobody
// would look. The count comes back; the name comes back once, to the screen
// that just asked, so it can say whose record went.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { requireMember } from "../_shared/tenant.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json().catch(() => ({}));
    const businessId = String(body.business_id ?? "").trim();
    const customerId = String(body.customer_id ?? "").trim();
    if (!businessId || !customerId) {
      return json({ error: "business_id and customer_id are required" }, 400);
    }

    const member = await requireMember(req, businessId);
    if (!member) return json({ error: "not_found" }, 404);
    if (member.role !== "owner") {
      return json({
        error: "Only the owner can delete a customer's information.",
      }, 403);
    }

    // The photos of this person's car, by path. Read BEFORE anything is
    // deleted, because the rows are what name the files.
    const { data: photos, error: photoErr } = await supabase
      .from("job_photos")
      .select("path")
      .eq("business_id", businessId)
      .in("booking_id", (
        await supabase.from("bookings").select("id")
          .eq("business_id", businessId).eq("customer_id", customerId)
      ).data?.map((b: { id: string }) => b.id) ?? []);
    if (photoErr) {
      console.error("delete-customer could not list photos:", photoErr);
      return json({ error: "We could not complete that. Please try again." }, 500);
    }

    const paths = (photos ?? []).map((p: { path: string }) => p.path);
    let filesRemoved = 0;
    if (paths.length) {
      const { data: removed, error: rmErr } = await supabase.storage.from("job-photos").remove(paths);
      // ABORTS RATHER THAN CARRYING ON. Everything else here is recoverable by
      // pressing the button again; a file left behind after the rows naming it
      // are gone is not reachable by anything, ever.
      if (rmErr) {
        console.error("delete-customer could not remove photo files:", rmErr);
        return json({
          error: "We could not delete their photos, so nothing was deleted. Please try again.",
        }, 500);
      }
      filesRemoved = (removed ?? []).length;
      // **A `remove` THAT MATCHED NOTHING RETURNS AN EMPTY LIST AND NO ERROR**,
      // so "no error" is not "the files are gone". Without this the endpoint
      // reports a clean deletion while a stranger's car is still sitting in a
      // private bucket — the one outcome this whole path exists to prevent,
      // and the one nobody would ever look for because the screen said yes.
      if (filesRemoved !== paths.length) {
        console.error(
          `delete-customer removed ${filesRemoved} of ${paths.length} photo files; nothing else was deleted`,
        );
        return json({
          error: "We could not delete all of their photos, so nothing was deleted. Please try again.",
        }, 500);
      }
    }

    const { data, error } = await supabase.rpc("forget_customer", {
      p_business_id: businessId,
      p_customer_id: customerId,
    });
    if (error) {
      console.error("forget_customer failed:", error);
      return json({ error: "We could not complete that. Please try again." }, 500);
    }
    // A customer id that does not resolve in THIS business answers 404, the
    // same as a non-member — there is nothing to be learned here by guessing.
    if (!data?.ok) return json({ error: "not_found" }, 404);

    // **THE COUNT COMES FROM STORAGE, NOT FROM SQL.** `forget_customer`
    // returns how many job_photos ROWS it deleted, and a row is not a photo —
    // reporting that number would be a figure that cannot fail even when
    // nothing was removed from the bucket.
    return json({ ...data, photos_deleted: filesRemoved });
  } catch (err) {
    console.error("delete-customer:", (err as Error).message);
    return json({ error: "We could not complete that. Please try again." }, 500);
  }
});
