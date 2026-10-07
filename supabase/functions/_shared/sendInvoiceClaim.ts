// ROADMAP 6.4 — A REPEATED "SEND INVOICE" LEAVES ONE EMAIL, NOT TWO. The server half of a client key.
//
// `send-invoice` writes no row of its own, so unlike a booking it has no natural key that can tell a
// RETRY from a deliberate "send it again": the same booking, the same customer, the same invoice, twice.
// `retry-safety` (`tests/retry-safety.test.mjs`) counts rows and so could not see it. The only thing that
// can tell the two apart is the CLIENT, which knows whether this press is a repeat of the last one.
//
// THE CONTRACT, which `FOR-ANDREW.md` and ROADMAP 6.4 repeat for the app:
//   * the app sends `idempotency_key`, a UUID, made ONCE per intent to send, and sends the SAME key on any
//     retry of that intent (a lost answer, a timeout, a second press while the first is unanswered);
//   * a deliberate second send, after the first answered, is a NEW intent and takes a NEW key;
//   * no key at all is what every existing client sends and means "send", exactly as before.
//
// THE STATES, per (booking, key): `sending` -> `sent` | `failed`.
//   * first claim of a key  -> the caller sends.
//   * the key is `sent`      -> NOTHING is sent; the answer is `duplicate: true` with what the first answered.
//   * the key is `sending`   -> another press is in flight: `busy` (409), unless it has sat longer than
//                               `STALE_SENDING_MS`, which is a crash and not a send in progress, and then
//                               ONE caller takes it over.
//   * the key is `failed`    -> the earlier attempt did not send, so a retry may: ONE caller takes it.
//   "ONE caller" is a compare-and-set on the state, never a read followed by a write, because two presses
//   at once are the whole case.
//
// **A STORE THAT CANNOT BE READ DOES NOT STOP THE INVOICE.** The table is a migration (not yet applied, and
// applying is Andrew's), so a function published before it exists would otherwise refuse every invoice. In
// that case the answer is `unavailable`: the caller sends, as it always did, and says `idempotent: false` so
// the screen can tell that nothing was deduped. The cost is the old duplicate, and it is reported, never silent.
//
// IMPORT-FREE, so `tests/send-invoice-key.test.mjs` runs this exact text in Node with an in-memory store.

export const STALE_SENDING_MS = 2 * 60 * 1000;
// Case-insensitive: some clients write a UUID in capitals, and `uuid` columns compare them equal. The key is lower-cased
// before it touches the store, so the capital and the small form are ONE key, never two.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type State = "sending" | "sent" | "failed";
export interface Attempt { state: State; response: { thank_you_sent?: boolean } | null; updated_at: string }

export interface ClaimStore {
  /** Inserts the claim as `sending`. `false` means the key is already there. Throws when the store is unusable. */
  insert(businessId: string, bookingId: string, key: string, nowIso: string): Promise<boolean>;
  get(bookingId: string, key: string): Promise<Attempt | null>;
  /** Moves the state from one of `from` to `to` ONLY IF it is still in one of them (and, when `olderThanIso` is
   *  given, has not been touched since). Atomic. `true` means this caller won. */
  move(bookingId: string, key: string, from: State[], to: State, nowIso: string, olderThanIso?: string, response?: Attempt["response"]): Promise<boolean>;
}

export type Claim =
  | { kind: "nokey" }
  | { kind: "bad" }
  | { kind: "go" }
  | { kind: "duplicate"; thankYouSent: boolean }
  | { kind: "busy" }
  | { kind: "unavailable" };

export const validKey = (k: unknown): k is string => typeof k === "string" && UUID.test(k);

export async function claim(store: ClaimStore, now: Date, businessId: string, bookingId: string, key: unknown): Promise<Claim> {
  if (key === undefined || key === null) return { kind: "nokey" };
  // PRESENT BUT MALFORMED IS AN ERROR, never "no key": ignoring it would send a second invoice the caller
  // believes it has protected against.
  if (!validKey(key)) return { kind: "bad" };
  key = key.toLowerCase();
  const nowIso = now.toISOString();
  try {
    if (await store.insert(businessId, bookingId, key, nowIso)) return { kind: "go" };
    const row = await store.get(bookingId, key);
    if (!row) return { kind: "go" }; // deleted between the two calls: nothing is holding it
    if (row.state === "sent") return { kind: "duplicate", thankYouSent: row.response?.thank_you_sent === true };
    if (row.state === "failed") {
      return (await store.move(bookingId, key, ["failed"], "sending", nowIso)) ? { kind: "go" } : { kind: "busy" };
    }
    const cutoff = new Date(now.getTime() - STALE_SENDING_MS).toISOString();
    return (await store.move(bookingId, key, ["sending"], "sending", nowIso, cutoff)) ? { kind: "go" } : { kind: "busy" };
  } catch {
    return { kind: "unavailable" };
  }
}

/** Records that the send happened and what it answered. Best-effort: see the note in `send-invoice`. */
export async function settleSent(store: ClaimStore, now: Date, bookingId: string, key: string, thankYouSent: boolean): Promise<boolean> {
  try { return await store.move(bookingId, key, ["sending"], "sent", now.toISOString(), undefined, { thank_you_sent: thankYouSent }); }
  catch { return false; }
}

/** Records that the send did not happen, so a retry with the same key may try again. */
export async function settleFailed(store: ClaimStore, now: Date, bookingId: string, key: string): Promise<boolean> {
  try { return await store.move(bookingId, key, ["sending"], "failed", now.toISOString()); }
  catch { return false; }
}
