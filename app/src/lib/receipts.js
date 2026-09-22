// Expense receipts — survey finding 6, the piece of paper behind the number.
//
// **THIS FILE IS DELIBERATELY THIN AND BORROWS EVERYTHING IT CAN.** The resize,
// the allowance, the refusal and the signed-URL expiry are all `photos.js` and
// `photo-rules.js`, imported rather than reimplemented: a second copy of
// "how big may a photo be" is how the two answers drift apart, and a second
// copy of the budget check is how the cap quietly stops being a cap.
//
// **WHAT IT DOES NOT SHARE IS THE STORAGE.** Different table (columns on
// `expenses`), different bucket (`expense-receipts`). A receipt and a
// photograph of a customer's car have different audiences, and
// `lib/photo-export.js` reads `job_photos` — so sharing the table would put a
// detailer's fuel receipts inside a zip built for a customer. The migration
// `20260921020000_a_receipt_is_not_a_job_photo.sql` says the same thing from
// the database's side.
//
// **IT COUNTS AGAINST THE SAME ALLOWANCE**, because that migration replaced
// `job_photo_budget()` to sum both stores. `budgetFor()` below is the job
// photos' own function, unchanged — there is one meter, and a receipt moves
// it.

import { supabase } from "./supabase.js";
import { shrink, budgetFor, SIGNED_FOR } from "./photos.js";
import { roomFor, storagePath } from "./photo-rules.js";

export const BUCKET = "expense-receipts";

/**
 * Attach a receipt to an expense. Refuses before it uploads when the business
 * is out of allowance, for the same reason and with the same words the job
 * photos use.
 *
 * The FILE goes up before the ROW is written and is removed again if the row
 * fails — `photos.js`'s order and its reasoning: the other way round leaves a
 * row pointing at nothing, which is a broken image on a screen for ever, and
 * this way the worst case is an orphaned file that shows nobody anything.
 */
export async function addReceipt({ file, businessId, expenseId }) {
  const budget = await budgetFor(businessId);
  const { blob, width, height } = await shrink(file);
  if (!roomFor(blob.size, budget)) {
    const e = new Error("full");
    e.code = "BUDGET_FULL";
    throw e;
  }
  // THE FIRST FOLDER IS THE BUSINESS ID, and that is not a convention: the
  // bucket's storage policy checks `(storage.foldername(name))[1]` against
  // `current_business_ids()`. The path is the isolation — so it is built by
  // `photo-rules.js`'s pure `storagePath`, which a credential-free suite
  // asserts against the shape the policy expects.
  const path = storagePath({
    businessId, ownerId: expenseId, id: crypto.randomUUID(), type: blob.type,
  });

  const up = await supabase.storage.from(BUCKET)
    .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
  if (up.error) throw up.error;

  const { data, error } = await supabase.from("expenses")
    .update({
      receipt_path: path,
      receipt_bytes: blob.size,
      receipt_width: width,
      receipt_height: height,
      receipt_uploaded_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .eq("business_id", businessId)
    .select()
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data;
}

/** Replacing one is removing then adding, so the old file never leaks. */
export async function removeReceipt({ expense, businessId }) {
  if (!expense?.receipt_path) return;
  const { error } = await supabase.from("expenses")
    .update({
      receipt_path: null, receipt_bytes: null, receipt_width: null,
      receipt_height: null, receipt_uploaded_at: null,
    })
    .eq("id", expense.id)
    .eq("business_id", businessId);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([expense.receipt_path]);
}

/** Private bucket, so every displayed receipt is a signed URL with an expiry. */
export async function signedReceiptUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET)
    .createSignedUrl(path, SIGNED_FOR);
  if (error) throw error;
  return data?.signedUrl ?? null;
}
