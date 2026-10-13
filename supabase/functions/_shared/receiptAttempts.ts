// 14.39. Reap recorded attempts, never infer permission from a bucket listing.
// Database claims exclude successful finishes and remain durable after a crash.
import { parseObjectKey } from "./photoKey.ts";
import type { R2Store } from "./r2.ts";

export const RECEIPT_BUCKET = "expense-receipts";
export interface ReceiptAttempt { key: string; business_id: string; expense_id: string; state: string }
export interface ReceiptCleanupDeps {
  claim(): Promise<ReceiptAttempt[]>;
  ack(attempt: ReceiptAttempt): Promise<void>;
  r2: Pick<R2Store, "del" | "head">;
}
export async function reclaimReceiptAttempts(deps: ReceiptCleanupDeps) {
  const attempts = await deps.claim();
  if (attempts.length > 1000) throw new Error("Receipt cleanup claim exceeded its ceiling");
  let removed = 0, failed = 0;
  for (const a of attempts) {
    const parsed = parseObjectKey(a.key);
    if (!parsed || parsed.businessId !== a.business_id || parsed.ownerId !== a.expense_id || a.state !== "reaping") {
      failed++; continue;
    }
    try {
      await deps.r2.del(RECEIPT_BUCKET, a.key);
      // DELETE may have lost its reply, or a faulty adapter may do nothing.
      // Only absence retires the claim; otherwise a later run retries it.
      if ((await deps.r2.head(RECEIPT_BUCKET, a.key)).exists) throw new Error("Receipt still stored");
      await deps.ack(a);
      removed++;
    } catch { failed++; }
  }
  return { claimed: attempts.length, removed, failed, batch_full: attempts.length === 1000 };
}

/** Save the attempt BEFORE signing. A lost start reply is still observable. */
export function withReceiptAttempts(store: R2Store, record: (key: string, business: string, expense: string) => Promise<void>): R2Store {
  return { ...store, async putUrl(bucket, key, type, expires, exactBytes) {
    if (bucket === RECEIPT_BUCKET) {
      const parsed = parseObjectKey(key);
      if (!parsed || expires > 600) throw new Error("Receipt upload attempt invalid");
      await record(key, parsed.businessId, parsed.ownerId);
    }
    return store.putUrl(bucket, key, type, expires, exactBytes);
  } };
}
