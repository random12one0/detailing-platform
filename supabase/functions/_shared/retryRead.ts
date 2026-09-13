// ---------------------------------------------------------------------------
// RETRYING A READ, AND ONLY A READ — 2026-09-13
// ---------------------------------------------------------------------------
// **THIS FILE HAS NO IMPORTS AND TOUCHES NO `Deno` GLOBAL, ON PURPOSE.** That
// is the same discipline `app/src/book/core.js` keeps and for the same reason:
// a rule that only the edge runtime can load is a rule nothing can test.
// `tests/gateway-retry.test.mjs` imports THIS FILE and runs THIS FUNCTION, so
// the check asserts what the code does rather than how it is spelled — which
// is CLAUDE.md trap (k), and three of one day's four false failures.
// **ABOUT 1.1% OF THIS PROJECT'S PostgREST CALLS COME BACK 504**, in bursts of
// three to six inside one second, and had done for at least a day before
// anybody noticed. `FOUND.md` § THE "GATEWAY TIMEOUT" IS OUR OWN CATCH BLOCK
// holds the measurement, the proof that the 500 was ours, and the list of what
// it is NOT (not slow queries, not connections, not locks, not the edge
// runtime's wall clock, not pg_net).
//
// **THE CONSEQUENCE IS ARITHMETIC, AND IT IS WHY THIS EXISTS.** A function's
// chance of dying is its NUMBER of database calls. `session-ping` makes one and
// survives ~99% of the time; `watch-jobs` makes three and survived 3 of 5
// scheduled ticks; the reminder sweep makes a dozen and survived **0 of 5** —
// so customers' reminder emails stopped going out on schedule.
//
// **READS ONLY. THE NAME IS THE WHOLE CONTRACT AND NOTHING CAN ENFORCE IT.**
// A 504 means the gateway stopped waiting. It does NOT mean the statement did
// not run. So retrying an insert can write two rows, and retrying a claim can
// claim twice — which is exactly why `claim_job_alerts` in `watch-jobs` is
// deliberately NOT wrapped even though it is that function's one fatal call.
// A caller that wraps a write has turned an intermittent outage into silent
// duplication, which is strictly worse than the failure it was fixing.
//
// **IT MATCHES ON THE STATUS, NEVER ON THE MESSAGE.** "Gateway Timeout" is a
// status text, and a check that names a spelling is coupled to the spelling
// rather than to the behaviour (CLAUDE.md trap (k)). 502, 503 and 504 are the
// behaviour. A real Postgres complaint arrives as 400/404/409 with a `code`
// and is returned untouched on the first try, because retrying it would just
// take three times as long to give the same right answer.
//
// **IF PostgREST EVER STOPS POPULATING `status`, THIS GOES INERT RATHER THAN
// WRONG — and it says so out loud when it fires.** That is the one design
// decision here: a retry that silently never happens is the eighth costume in
// `FOUND.md`'s list, so every retry writes a line to the edge logs and the
// count comes back to the caller. Nobody has to trust that it works; they can
// go and read whether it did.
const TRANSIENT_MIN = 500;

export type ReadResult = { error: unknown; status?: number };

export async function retryRead<T extends ReadResult>(
  label: string,
  run: () => PromiseLike<T>,
  tries = 3,
): Promise<T> {
  let last!: T;
  for (let attempt = 1; attempt <= tries; attempt++) {
    last = await run();
    const transient = !!last.error && typeof last.status === "number" &&
      last.status >= TRANSIENT_MIN;
    if (!transient) return last;
    if (attempt < tries) {
      console.warn(
        `retryRead: ${label} got ${last.status} on attempt ${attempt} of ${tries} — retrying`,
      );
      // The 504s arrive in bursts inside a single second, so the wait only has
      // to outlast the burst. 400ms then 800ms against a sweep that takes ~5s
      // under a 30s pg_net timeout: worst case adds 1.2s and cannot push the
      // caller past its own limit.
      await new Promise((r) => setTimeout(r, 400 * attempt));
    } else {
      console.error(
        `retryRead: ${label} still ${last.status} after ${tries} attempts — giving up`,
      );
    }
  }
  return last;
}

// ---------------------------------------------------------------------------
// A READ THAT FAILED IS NOT A READ THAT FOUND NOTHING — 2026-09-13
// ---------------------------------------------------------------------------
// **`retryRead` shortens the odds; it cannot make them zero, and this is what
// the caller does with the one in a thousand that still fails.** The bug it
// exists to stop is `const { data } = await supabase…` — the error destructured
// away, `data` null, and the function carrying on as though the row simply did
// not exist. That is the seventh costume in `FOUND.md`: an instrument reporting
// fine when it cannot tell.
//
// **IT COST A CUSTOMER A BOOKING.** `getSettings` swallowed its error, fell
// back to the no-settings-row defaults, and those defaults say
// `mobile_enabled: null` and `dropoff_enabled: null` — correct for a business
// nobody has set up, and in `available-slots` they make `isDropoff && isMobile`
// true for EVERY slot, which skips every one. The answer is `200`,
// `success: true`, a full month of days and **not one bookable time**, and
// nothing on the page can tell that from a detailer who is fully booked.
//
// **SO THE THREE OUTCOMES OF A READ ARE THREE, NOT TWO:** a row, no row, and
// *we could not find out*. `code === "read_failed"` is the third one, and a
// caller that turns it into a 503 has told the truth; one that returns an empty
// success has not. Same shape as the `up_to_date: true | false | null` contract
// Andrew already approved for the translation gauge.
export function readFailed(what: string, error: unknown): Error {
  const msg = (error as { message?: string } | null)?.message ?? String(error);
  const e = new Error(`could not read ${what}: ${msg}`);
  // The CODE is what callers branch on, never the sentence — a message gets
  // reworded and a check that matches one is coupled to the spelling
  // (CLAUDE.md trap (k)). `available-slots` reads this and answers 503.
  (e as Error & { code?: string }).code = "read_failed";
  return e;
}

// True for anything `readFailed` made, and false for a programmer's TypeError.
// The distinction decides whether the customer is told "try again" or the
// failure is ours, so it lives here beside the thrower rather than being
// re-derived at each catch block.
export function isReadFailure(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "read_failed";
}
