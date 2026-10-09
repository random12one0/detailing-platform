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

import { api } from "./api.js";
import { supabase } from "./supabase.js";
import { shrink, budgetFor, SIGNED_FOR } from "./photos.js";
import { roomFor, storagePath } from "./photo-rules.js";
import {
  DOOR_BATCH, DOOR_WORDS, RECEIPTS_VIA_DOOR, doorError,
  readReceiptFinish, readReceiptStart, readRemoved, readUrls,
} from "./photo-door.js";

export const BUCKET = "expense-receipts";

// ── ROADMAP 0.11 SLICE 5, THE APP HALF — ONE DOOR, CHOSEN ONCE ───────────
// Every function below is two paths and `RECEIPTS_VIA_DOOR` picks between
// them. **Not a fallback**: nothing here catches a door failure and writes to
// Supabase Storage instead, because that is the second door `photo-door.js`
// forbids — live exactly when the function is down, which is exactly when the
// cap would stop counting. The flag is read once per call and the other path
// is never reached in the same breath.
//
// **WHY THE OLD PATH IS STILL HERE AT ALL.** `photo-door` is written and
// tested and NOT PUBLISHED. Deleting the Supabase path today would break a
// feature that works, on the next push, before Andrew has published the
// function — and `FOR-ANDREW.md`'s publish list now names this flag beside
// `photo-door` so the two move together. When it flips, the three
// `supabase.storage` blocks below are dead code and should go.
const door = async (businessId, body) => {
  try { return await api.photoDoor(businessId, { store: "receipt", ...body }); }
  catch (e) { throw doorError(e); }
};

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
  // **SHRINK BEFORE CLAIMING, on both paths.** The door checks `claimed_bytes`
  // at start and the size R2 actually stored at finish, and an under-claim is
  // caught there with the object deleted — so the number sent has to be the
  // size of the blob that is really going up, not the file the person picked.
  if (RECEIPTS_VIA_DOOR) {
    const { blob, width, height } = await shrink(file);
    const type = blob.type || "image/jpeg";
    // THE APP MINTS THE ID AND NEVER THE PATH. The server mints the key and
    // returns it; `readReceiptStart` refuses to go on unless it is the one
    // this press asked for, to the character. A path built in the browser is
    // the one thing the isolation cannot check.
    const fileId = crypto.randomUUID();
    const { uploadUrl, key } = readReceiptStart(await door(businessId, {
      action: "start", expense_id: expenseId, file_id: fileId,
      content_type: type, claimed_bytes: blob.size,
    }), { businessId, expenseId, fileId, type });

    let put;
    try { put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": type }, body: blob }); }
    catch (e) { throw doorError(e); }
    if (!put.ok) throw new Error(DOOR_WORDS.putFailed);

    // A RETRIED FINISH RETURNS THE SAME EXPENSE RATHER THAN AN ERROR, which is
    // the door's contract and the reason this is not wrapped in a guard: a lost
    // reply is retried by pressing again, and the second finish is a no-op that
    // answers with the row already there.
    return readReceiptFinish(await door(businessId, {
      action: "finish", expense_id: expenseId, file_id: fileId, width, height,
    }), { expenseId, key });
  }

  const budget = await budgetFor(businessId);
  const { blob, width, height } = await shrink(file);
  if (!roomFor(blob.size, budget)) {
    const e = new Error("full");
    e.code = "BUDGET_FULL";
    // THE NUMBERS TRAVEL WITH THE REFUSAL — ROADMAP 0.11d1. The screen has to
    // name what is used and what the limit is, and this is the only place that
    // holds them: it read the budget one line above to make this very decision,
    // and `ExpenseModal` has no budget of its own to read.
    e.budget = budget;
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
  // REPLACING A RECEIPT IS REMOVE THEN ADD, on both paths. The door refuses a
  // second one with 409 rather than swapping it, exactly so the old object
  // cannot be orphaned — which is what this function's own name has always
  // promised and what the comment below already described for the old path.
  if (RECEIPTS_VIA_DOOR) {
    readRemoved(await door(businessId, { action: "remove", expense_id: expense.id }));
    return;
  }
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
  // ONE KEY THROUGH AN ACTION THAT TAKES A HUNDRED. Kept as a one-key helper
  // because that is every caller this product has; a list of expenses should
  // use `signedReceiptUrls` below and ask once rather than once per row.
  if (RECEIPTS_VIA_DOOR) return (await signedReceiptUrls([path]))[path] ?? null;
  const { data, error } = await supabase.storage.from(BUCKET)
    .createSignedUrl(path, SIGNED_FOR);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

/**
 * Signed URLs for many receipts at once — the door's `urls` action, which takes
 * up to `DOOR_BATCH` keys. **A key the caller may not read is simply absent
 * from the map rather than an error**, so a missing entry means "cannot be
 * shown", never "the call failed".
 *
 * **NOTHING CALLS THIS YET AND THAT IS NOT AN OVERSIGHT.** Measured 2026-10-08:
 * `receipt_path` is read nowhere in `app/src`, so the product can attach a
 * receipt and has no screen that shows one. This exists because the contract
 * asks `signedReceiptUrl` to become the `urls` action, and a one-key helper
 * that quietly made one request per row would be the thing that clause exists
 * to prevent. The business is read off the keys, the same way `signedUrls`
 * does it for job photos.
 */
export async function signedReceiptUrls(paths) {
  if (!paths.length) return {};
  if (!RECEIPTS_VIA_DOOR) {
    // **ONE REQUEST ON THIS PATH TOO — ROADMAP 9.20 (c).** The first version
    // looped `signedReceiptUrl` per path, which is one round trip per row and
    // is exactly what this function exists to prevent; the door path was the
    // only half that honoured its own rule. `createSignedUrls` (plural) takes
    // the whole array and answers in one call, so the clause holds with the
    // flag in either position.
    // **AN ENTRY THAT CANNOT BE SIGNED IS SIMPLY ABSENT**, never an error: the
    // map's contract is "a missing key means cannot be shown", and a row the
    // screen cannot draw a thumbnail for must not take the screen down.
    const { data, error } = await supabase.storage.from(BUCKET)
      .createSignedUrls(paths, SIGNED_FOR);
    if (error) throw error;
    const out = {};
    for (const row of data ?? []) {
      if (row?.signedUrl && !row.error) out[row.path] = row.signedUrl;
    }
    return out;
  }
  const businessId = String(paths[0]).split("/")[0];
  if (paths.some((p) => String(p).split("/")[0] !== businessId)) {
    throw new Error("signedReceiptUrls: keys from more than one business in one call");
  }
  const out = {};
  for (let i = 0; i < paths.length; i += DOOR_BATCH) {
    Object.assign(out, readUrls(await door(businessId, {
      action: "urls", keys: paths.slice(i, i + DOOR_BATCH),
    })));
  }
  return out;
}
