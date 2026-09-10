// LOOKING AT A DETAILER'S DASHBOARD WITHOUT BECOMING THEM — the owner's ask,
// 2026-09-09, after the first version signed him out of his own back office:
//
//   *"I don't want to be signed out or I don't even wanna be signing in as
//   someone to view their dashboard. There should be just a way that I can
//   view it just from me… Not me logging into their account to then be able
//   to view their dashboard."*
//
// **THE SESSION IS PER TAB, WHICH IS THE WHOLE TRICK.** supabase-js keeps one
// session per storage key, and the dashboard used localStorage — one browser,
// one identity, so opening a detailer's dashboard could only ever be a
// REPLACEMENT. A preview tab gets its own key in `sessionStorage` instead
// (see lib/supabase.js), which is scoped to that tab by the browser itself:
// his admin session in the other tab is not touched, not read, and not
// signed out, and closing the preview tab is the whole exit. Nothing expires
// and nothing has to be cleaned up.
//
// **AND THE READ-ONLY HALF IS ACCIDENT PREVENTION, NOT A PERMISSION.** It
// lives in this browser, so it stops a stray click, not an attacker. The real
// rules are on the server and are unchanged — RLS still answers to whoever
// the session says it is, and no policy anywhere gained a platform-admin
// clause. Said out loud here so nobody later mistakes the switch for a gate.

const FLAG = "dp.preview";       // this TAB is a preview tab
const MODE = "dp.preview.mode";  // "look" (default) | "work"

// Read once at module load, before anything creates a client. The /preview
// route is only the DOOR — the flag has to outlive it, because the dashboard
// navigates away from that path immediately and may be reloaded afterwards.
function boot() {
  try {
    if (window.location.pathname.startsWith("/preview")) sessionStorage.setItem(FLAG, "1");
    return sessionStorage.getItem(FLAG) === "1";
  } catch { return false; }  // private mode: behave like an ordinary tab
}
export const isPreviewTab = boot();

export function previewMode() {
  try { return sessionStorage.getItem(MODE) === "work" ? "work" : "look"; } catch { return "look"; }
}
export function setPreviewMode(mode) {
  try { sessionStorage.setItem(MODE, mode === "work" ? "work" : "look"); } catch { /* private mode */ }
}

export const LOOKING_ONLY = "Looking only. Flip the switch at the top to Working if you meant to change this.";

// Throws in a preview tab that is still on Looking; does nothing anywhere
// else, including every real detailer's browser. Called from the two places
// EVERY write in the dashboard goes through — the Supabase client's own
// mutations and the edge-function caller — rather than from 71 call sites.
export function guardWrite() {
  if (isPreviewTab && previewMode() === "look") throw new Error(LOOKING_ONLY);
}

// Whose dashboard this is, written by the door (admin/PreviewEntry.jsx) so the
// bar can name them rather than saying "their".
export function previewWho() {
  try { return sessionStorage.getItem("dp.preview.who") || ""; } catch { return ""; }
}
