// ROADMAP 8.18 — THE ONE WAY OUT OF THIS PRODUCT.
//
// There were THREE `auth.signOut(` call sites when the account switcher was
// built — the gear's Sign out, the platform back office's, and the way out of
// a half-finished signup — and the item's own note named ONE. The other two
// were found by grepping for the call. Every one of them has to do the same
// three things now, and "the same three things in three places" is how the
// third one quietly stops doing the third thing.
//
// **AND THE THIRD THING IS NOT OPTIONAL, BECAUSE THE FIRST VERSION SHIPPED
// WITHOUT IT AND THE SECURITY REVIEW CAUGHT IT.** Emptying the park removes
// the parked tokens from THIS BROWSER and revokes nothing; the `signOut()`
// beside it runs as the LIVE user and ends that user's token family only. A
// parked refresh token is never refreshed while parked and Supabase refresh
// tokens do not expire on their own, so it stayed valid for ever — copyable
// out of `localStorage` in cleartext, usable from any machine, and untouched
// by the button that says Sign out. On the shared van tablet this feature is
// FOR, that is the owner pressing Sign out and handing over a working key.
//
// The order is load-bearing: the local clear happens first and unconditionally
// (a failed request must never leave another account reachable HERE), and the
// revocations are best effort after it.

import { supabase, supabaseAnonKey, supabaseUrl } from "./supabase.js";
import { endParkedSessions } from "./accounts.js";
import { endImpersonation } from "./impersonation.js";

/**
 * Sign out of everything this browser holds: the impersonation breadcrumb, the
 * parked accounts (locally and at the server), and the live session.
 */
export async function signOutEverything() {
  // The note is a fact about the session in this browser, so it dies with it —
  // and the ordinary Sign out is the exit somebody actually takes when they
  // have forgotten they are impersonating.
  endImpersonation();
  await endParkedSessions(supabaseUrl, supabaseAnonKey);
  return supabase.auth.signOut();
}
