// ROADMAP 8.18 — TWO LOGINS AT ONCE.
//
// His ask, in his own words: *"Maybe there's an account switcher — like how on
// Chrome you could log into multiple Google accounts and switch between
// accounts."*
//
// **THIS IS NOT `Switch business`, AND THE DIFFERENCE IS THE WHOLE ITEM.**
// That screen moves between the MEMBERSHIPS of one signed-in person, and the
// database has supported that since the staff-roles migration. This is two
// separate PEOPLE — two email addresses, two passwords — both signed in, with
// one press between them. A detailer who does the books for their partner's
// shop, or the owner and the one member of staff who share the van's tablet,
// have to type a password every time today.
//
// ---------------------------------------------------------------------------
// HOW IT WORKS, AND WHY IT IS A PARK RATHER THAN TWO CLIENTS
// ---------------------------------------------------------------------------
// A Supabase client holds exactly ONE session, and everything in this app —
// every `supabase.from()`, every edge call, `BusinessContext` itself — is bound
// to that one client. A second client would mean a second auth storage key, a
// second `onAuthStateChange`, and every call site having to know which one it
// meant. That is a fork of the data layer to buy a convenience.
//
// So there is still one live session, and the OTHERS ARE PARKED HERE: their
// access and refresh tokens, in this browser, beside the one Supabase already
// keeps. Switching is `parkCurrent()` then `supabase.auth.setSession()` on the
// tokens that come back out.
//
// **A PARKED SESSION IS NOT REFRESHED WHILE IT IS PARKED**, which is what makes
// this safe to do at all: nothing consumes its refresh token, so the token is
// still good when it is taken out. `setSession` then refreshes it, gets a new
// pair, and the next park writes those. A parked account that has gone stale
// (the password was changed, the session revoked elsewhere) fails at
// `setSession` and is dropped — see `useAccount` in BusinessContext.
//
// ---------------------------------------------------------------------------
// THE PART THAT IS SECURITY AND NOT CONVENIENCE
// ---------------------------------------------------------------------------
// **SIGNING OUT MUST EMPTY THE WHOLE PARK, NOT JUST THE LIVE SESSION.** A
// "Sign out" that leaves a second account's refresh token in this browser is a
// button that does not do what it says: the next person at the tablet presses
// the other name and is in. `BusinessContext.signOut` calls `forgetAll()`
// FIRST, before the live sign-out, so a failed network call cannot leave the
// park behind. `tests/two-logins.test.mjs` § 2 is that sentence with teeth.
//
// **AND PARKING DOES NOT CALL `signOut` AT ALL. THIS ONE COST A REBUILD AND
// IT IS THE FACT WORTH CARRYING.** The obvious version signs out with
// `{ scope: "local" }`, reading "local" as "just forget it here". It is not:
// GoTrue's `local` means *revoke the CURRENT session's refresh token* — the
// exact token that was written into the park a line earlier — so adding a
// second account silently destroyed the first, and it only showed up on
// trying to switch back. `global` revokes all of them and `others` revokes
// everything except the one being abandoned, so **no scope does what parking
// needs**, and `_signOut` POSTs `/logout` for every one of them.
//
// Proven rather than reasoned about: driving it end to end in a browser put
// the second account on the create-a-business screen, and pressing the first
// account's name there dropped the session entirely and landed on sign-in
// with `null` where the token should be. Reading the scope documentation had
// already produced the wrong answer twice.
//
// So `endSessionLocally()` drops the client's OWN storage entry and nothing
// else: the session ends in this browser and stays valid everywhere,
// including in the park. There is no public API for that — `signOut` is the
// only exit supabase-js offers — which is why it is written out here with
// its own fallback rather than hidden at a call site.
//
// **AND WAITING WAS NOT AN OPTION EITHER.** Leaving the first session LIVE
// while the second one signs in fails for a different reason: the client
// auto-refreshes, refresh tokens rotate, and the parked snapshot is revoked
// by the very session it is a snapshot of. The window has to be closed, not
// managed.
//
// This puts a second set of tokens in `localStorage` beside the set Supabase
// already keeps there, which is the same exposure on the same device rather
// than a new kind of it — anyone who can read one can read the other. What it
// is NOT is a way to reach an account from another machine.

const KEY = "dp.accounts";

// Wrapped, like every other localStorage reader in this app: a browser in
// private mode throws on access rather than returning null, and a switcher
// that cannot be listed must not take the dashboard down with it.
const readRaw = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};
const write = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* private mode */ }
};

/** Every account parked in this browser. Never includes the live one. */
export function listAccounts() {
  const list = readRaw();
  return Array.isArray(list)
    ? list.filter((a) => a && typeof a.userId === "string"
        && typeof a.access_token === "string" && typeof a.refresh_token === "string")
    : [];
}

/**
 * Put the live session in the park. `business` is this device's chosen
 * business for THAT account — parked with it, because the preference is keyed
 * on the device rather than on the person, so without this a switch back
 * lands on whichever membership happens to come first.
 */
export function parkCurrent(session, business) {
  if (!session?.user?.id || !session.access_token || !session.refresh_token) return;
  const rest = listAccounts().filter((a) => a.userId !== session.user.id);
  write([...rest, {
    userId: session.user.id,
    email: session.user.email ?? "",
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    business: business ?? null,
    parked_at: Date.now(),
  }]);
}

/** Take an account OUT of the park — it is about to become the live one. */
export function takeAccount(userId) {
  const found = listAccounts().find((a) => a.userId === userId);
  if (found) write(listAccounts().filter((a) => a.userId !== userId));
  return found ?? null;
}

/** Drop one parked account — used when its tokens turn out to be dead. */
export function forget(userId) {
  write(listAccounts().filter((a) => a.userId !== userId));
}

/** Empty the park. Every sign-out calls this. See the header. */
export function forgetAll() {
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
}

/**
 * End the session in THIS BROWSER without telling the server.
 *
 * See the header: every `signOut` scope revokes something, and parking needs
 * nothing revoked. supabase-js keeps its session under `sb-<ref>-auth-token`
 * and splits it across `.0`, `.1`… when it is too big for one entry, so both
 * shapes are matched.
 *
 * Returns false when it could not find the entry — a shape change in
 * supabase-js, or a browser that will not let us read the keys. The caller
 * must then take the honest exit (a real sign-out plus `forgetAll`) rather
 * than leave somebody signed in with a park they cannot see, which is the one
 * outcome worse than the feature not working.
 */
export function endSessionLocally() {
  try {
    const keys = Object.keys(localStorage).filter((k) => /^sb-.+-auth-token(\.\d+)?$/.test(k));
    if (keys.length === 0) return false;
    keys.forEach((k) => localStorage.removeItem(k));
    return true;
  } catch {
    return false;
  }
}

/**
 * END a parked session at the server, not just in this browser.
 *
 * **THIS IS THE HALF THE FIRST VERSION DID NOT DO, AND THE SECURITY REVIEW
 * CAUGHT IT.** `forgetAll()` removes the entry; it revokes nothing. And the
 * `signOut()` that follows runs as the LIVE user, so it revokes that user's
 * token family and leaves every parked one valid — for ever, because a parked
 * session is never refreshed and Supabase refresh tokens do not expire on
 * their own.
 *
 * The consequence is a button that no longer means what it says. On the shared
 * van tablet this feature exists for: the owner adds a second account, their
 * refresh token is written to `dp.accounts` in cleartext, the staff member
 * copies it, the owner presses Sign out believing the device is clean — and
 * the token still works from anywhere, because a refresh token is bound to
 * neither device nor origin. **Before this feature, sign-out really did end
 * the one session in this browser; keeping that true is the whole point.**
 *
 * A parked access token is usually expired (they last about an hour), so this
 * refreshes first and then logs out with the fresh one. Best effort by design:
 * the local copy is already gone before this runs, so a failure here is a
 * token that outlives the press, never a token still sitting in the browser.
 */
async function revokeParked(a, url, anonKey) {
  if (!url || !anonKey || !a?.refresh_token) return false;
  const head = { apikey: anonKey, "Content-Type": "application/json" };
  const r = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST", headers: head,
    body: JSON.stringify({ refresh_token: a.refresh_token }),
  });
  // Already dead — revoked elsewhere, or the password was changed. Nothing to
  // end, which is the outcome we wanted anyway.
  if (!r.ok) return true;
  const fresh = await r.json();
  if (!fresh?.access_token) return false;
  const out = await fetch(`${url}/auth/v1/logout?scope=global`, {
    method: "POST", headers: { ...head, Authorization: `Bearer ${fresh.access_token}` },
  });
  return out.ok;
}

/**
 * Empty the park AND end every session in it.
 *
 * **THE LOCAL CLEAR HAPPENS FIRST AND UNCONDITIONALLY.** A network round trip
 * that fails must not leave another account reachable from this browser — that
 * is the worse of the two failures by a distance, because it needs no attacker
 * at all, just the next person to pick the tablet up.
 */
export async function endParkedSessions(url, anonKey) {
  const parked = listAccounts();
  forgetAll();
  if (parked.length === 0) return;
  // `allSettled`, because one dead token must not stop the others being ended.
  await Promise.allSettled(parked.map((a) => revokeParked(a, url, anonKey)));
}
