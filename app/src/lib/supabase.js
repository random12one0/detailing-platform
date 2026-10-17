import { createClient } from "@supabase/supabase-js";
import { guardWrite, isPreviewTab } from "./preview.js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Whether this build was given an API to talk to. Exported so a screen can
// say so plainly instead of failing in a way that looks like a bug.
export const configured = Boolean(url && anonKey);

if (!configured) {
  // Fail loudly during development — a silent empty client is a debugging pit.
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

// This module is imported by the router, so it is loaded on EVERY route.
// createClient() throws on an empty URL, and that throw used to take down
// the whole bundle — including the marketing page at /, which needs no API
// at all. A deployment with a missing environment variable would serve a
// blank white page to every visitor who had never heard of us.
//
// So: build against an unreachable placeholder instead of throwing. The
// marketing page renders, and anything that actually calls the API fails
// with a clear error at the point of use.
// ROADMAP 8.18 — exported because ending a PARKED session is a raw call to
// GoTrue rather than something the client can do: the client holds one session
// and the parked ones are not it. `lib/accounts.js` is deliberately free of
// every import so it stays runnable in Node, so it is handed these instead of
// reaching for them.
export const supabaseUrl = url || "";
export const supabaseAnonKey = anonKey || "";

// A PREVIEW TAB HOLDS ITS OWN SESSION, IN ITS OWN DRAWER (lib/preview.js).
// `sessionStorage` is scoped to one tab by the browser, and the key is
// different besides, so the back office's session in the tab next door is
// neither read nor written nor ended — which is the entire reason the owner
// no longer has to be signed out to look at a detailer's dashboard. Closing
// the tab is the exit; the browser throws the drawer away itself.
// DID THIS PAGE LOAD ARRIVE ON A RECOVERY LINK?
//
// It has to be answered HERE, above `createClient`, and that is the whole
// reason this constant is in this file rather than on the screen that wants
// it: `detectSessionInUrl` is on by default, so the client reads the recovery
// token out of the hash, exchanges it and CLEARS THE ADDRESS BAR before React
// mounts. A screen that looks later finds an empty hash every time.
//
// What it is for: `/reset` is reachable by anybody who is already ordinarily
// signed in, and on an ordinary session it must ask for the current password
// before changing it — the unlocked-laptop case. On a real recovery arrival it
// must NOT, because somebody there is locked out by definition and proved
// themselves with the emailed link. One boolean separates the two.
// **AND IT IS LATCHED FOR THE TAB, BECAUSE THE HASH DOES NOT SURVIVE —
// 2026-09-12.** This was a bare read of the URL, evaluated ONCE when this
// module first loads in a document. Two ways that gave the wrong answer, and
// the second one locks somebody out:
//
//   · A client-side navigation to `/reset#…type=recovery` does not
//     re-evaluate a module constant, so the hash is in the address bar and the
//     flag is already `false`. **That is what an outside review measured twice
//     and read as "the session is winning". The session never wins —
//     `land()` reads only this flag — the constant was simply stale.**
//   · **THE ONE THAT MATTERS: `detectSessionInUrl` CLEARS THE HASH** once it
//     has exchanged the token. So a person who follows a real recovery link,
//     lands correctly, and then REFRESHES the page gets a new document with no
//     hash, a live session from the exchange, and the signed-in branch — which
//     asks for the current password they just told us they do not have.
//     Refreshing a page is ordinary; this was a real lockout.
//
// So the arrival is remembered for the life of the TAB. `sessionStorage`, not
// `localStorage`: it must not follow them into tomorrow or into another tab,
// and `ResetPassword` clears it the moment the password is saved, so the tab
// does not stay in recovery mode after the thing it was for is done.
const RECOVERY_KEY = "dp.recovery";
function recoveryArrival() {
  if (typeof window === "undefined") return false;
  const inUrl = /(^|[#&?])type=recovery([&]|$)/.test(window.location.hash + window.location.search);
  try {
    if (inUrl) window.sessionStorage.setItem(RECOVERY_KEY, "1");
    return inUrl || window.sessionStorage.getItem(RECOVERY_KEY) === "1";
  } catch {
    return inUrl;   // private mode: the URL is all we have, which is the old behaviour
  }
}
export const arrivedOnRecoveryLink = recoveryArrival();

// Called once the new password is saved. Without it the tab would keep
// skipping the current-password check for as long as it stayed open.
export function clearRecoveryArrival() {
  try { window.sessionStorage.removeItem(RECOVERY_KEY); } catch { /* private mode never set it */ }
}

export const supabase = createClient(
  url || "https://unconfigured.invalid",
  anonKey || "unconfigured-anon-key",
  isPreviewTab
    ? { auth: { storage: window.sessionStorage, storageKey: "dp.preview.auth" } }
    : undefined,
);

// EVERY WRITE THE DASHBOARD MAKES THROUGH THE DATABASE COMES THROUGH HERE, so
// the Looking switch is enforced once rather than at 71 call sites — and a
// screen written next month is covered without knowing this exists. Wrapped
// only in a preview tab, so a detailer's own client is the plain one.
if (isPreviewTab) {
  const plain = supabase.from.bind(supabase);
  supabase.from = (table) => {
    const b = plain(table);
    for (const verb of ["insert", "update", "upsert", "delete"]) {
      const fn = b[verb].bind(b);
      b[verb] = (...args) => { guardWrite(); return fn(...args); };
    }
    return b;
  };
  // ROADMAP 4.3c: the Auth API is a write no database rule can see (a password
  // or profile change on the owner's account), so a stray click stops here too.
  const updateUser = supabase.auth.updateUser.bind(supabase.auth);
  supabase.auth.updateUser = (...args) => { guardWrite(); return updateUser(...args); };
  // ROADMAP 97.14: a database function can write too (the Notes box saves
  // through `set_customer_notes`), so every rpc is refused on Looking except
  // the ones that only READ — the same shape as lib/api.js's PREVIEW_READS.
  const RPC_READS = new Set(["founding_offer", "platform_prices", "job_photo_budget"]);
  const rpc = supabase.rpc.bind(supabase);
  supabase.rpc = (fn, ...args) => { if (!RPC_READS.has(fn)) guardWrite(); return rpc(fn, ...args); };
}
