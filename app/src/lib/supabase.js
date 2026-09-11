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
export const arrivedOnRecoveryLink =
  typeof window !== "undefined"
  && /(^|[#&?])type=recovery([&]|$)/.test(window.location.hash + window.location.search);

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
}
