// REMOVING A FORGOTTEN CUSTOMER'S PHOTO FILES FROM EVERY STORE THEY MAY BE IN.
// ROADMAP 0.11, SLICE 3 — and ROADMAP 8.11's promise, kept across the move.
//
// `delete-customer` has always read the paths off the customer's `job_photos`
// rows and removed the files BEFORE the SQL call that deletes the rows, because
// the rows are what name the files. When job photos moved to R2 that stopped
// being enough, and **it would have stopped being enough silently**: the SQL
// still deletes the rows, `storage.from("job-photos").remove` still answers
// without an error for paths it has never heard of, and a stranger's car stays
// in R2 for ever with nothing left that points at it. That is the one outcome
// `delete-customer`'s own header calls the worst this endpoint has.
//
// **TWO STORES, BECAUSE THE ROW DOES NOT SAY WHICH.** `job_photos.path` is the
// same string in both. Until the app switches, photos are in Supabase Storage;
// after, in R2; during the changeover (an old browser tab, a photo taken
// before the switch) a customer can have some of each. So every path is removed
// from BOTH, and the answer is "gone" only when it is confirmed gone from both.
//
// **"NO ERROR" IS NOT "GONE", IN EITHER STORE.** Supabase's `remove` returns an
// empty list and no error for a path that matched nothing; R2's DELETE answers
// success for a key that was never there. So each store is asked afterwards —
// R2 with a signed HEAD, Supabase with a listing — and a file that is still
// there is a refusal, not a count.
//
// **A KEY OF ANOTHER BUSINESS IS A REFUSAL, NOT A DELETION.** The paths come
// from rows scoped to the business, so this cannot happen; if it ever does, the
// row or the query is wrong, and the one thing that must not follow is a
// service-role client deleting somebody else's photograph. A path that does not
// parse as one of ours at all (an older shape) is removed from Supabase only —
// R2 only ever holds keys this product minted.
//
// Import-free but for `photoKey.ts`, so `tests/forget-photos.test.mjs` runs it
// with fakes.

import { businessOwnsKey, parseObjectKey } from "./photoKey.ts";

const BUCKET = "job-photos";

export interface ForgetStores {
  /** `null` when the R2 credentials are not configured. */
  r2: {
    del(bucket: string, key: string): Promise<void>;
    head(bucket: string, key: string): Promise<{ exists: boolean }>;
  } | null;
  supa: {
    /** The error, if any; how many it says it removed is deliberately not used. */
    remove(paths: string[]): Promise<{ error: unknown }>;
    /** Is the object still in the bucket? Throws when it cannot be told. */
    exists(path: string): Promise<boolean>;
  };
}

export type ForgetResult =
  | { ok: true; gone: number }
  | { ok: false; reason: "r2_unavailable" | "r2_failed" | "supabase_failed" | "still_there" | "foreign_path" };

export async function removePhotoFiles(
  businessId: string,
  paths: string[],
  stores: ForgetStores,
  log: (...a: unknown[]) => void = () => {},
): Promise<ForgetResult> {
  if (paths.length === 0) return { ok: true, gone: 0 };

  // Before anything is touched: every key that parses as ours must be THIS
  // business's. One foreign key stops the whole thing, nothing deleted.
  for (const p of paths) {
    if (parseObjectKey(p) !== null && !businessOwnsKey(businessId, p)) {
      log("delete-customer: a photo row named another business's file; nothing was deleted");
      return { ok: false, reason: "foreign_path" };
    }
  }

  const ours = paths.filter((p) => businessOwnsKey(businessId, p));
  if (ours.length > 0 && !stores.r2) {
    log("delete-customer: photos exist but R2 is not configured; nothing was deleted");
    return { ok: false, reason: "r2_unavailable" };
  }

  // R2: delete, then ask. Only the error NAME is ever logged: the runtime's own
  // message for a failed request includes the whole signed URL.
  for (const key of ours) {
    try {
      await stores.r2!.del(BUCKET, key);
      if ((await stores.r2!.head(BUCKET, key)).exists) {
        log("delete-customer: a photo file is still in R2 after its delete");
        return { ok: false, reason: "still_there" };
      }
    } catch (e) {
      log("delete-customer: R2 failed", e instanceof Error ? e.name : "error");
      return { ok: false, reason: "r2_failed" };
    }
  }

  // Supabase: remove them all, then ask for each.
  try {
    const { error } = await stores.supa.remove(paths);
    if (error) {
      log("delete-customer: Supabase could not remove photo files");
      return { ok: false, reason: "supabase_failed" };
    }
    for (const p of paths) {
      if (await stores.supa.exists(p)) {
        log("delete-customer: a photo file is still in Supabase after its remove");
        return { ok: false, reason: "still_there" };
      }
    }
  } catch (e) {
    log("delete-customer: Supabase storage failed", e instanceof Error ? e.name : "error");
    return { ok: false, reason: "supabase_failed" };
  }

  return { ok: true, gone: paths.length };
}
