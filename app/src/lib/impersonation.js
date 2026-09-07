// ROADMAP 8.2 — WHO YOU ARE RIGHT NOW, WHEN IT IS NOT WHO YOU SIGNED IN AS.
//
// `platform-admin`'s `impersonate` action hands back a magic link for the
// detailer's own owner account, and following it REPLACES the session in this
// browser — /admin and /app are the same origin and share one Supabase key in
// localStorage. There is only ever one session here, so there is nothing to
// come back to and no second identity to hold.
//
// **THE OWNER'S OWN REPORT IS WHAT THIS EXISTS FOR:** *"it just kinda logged
// me in without doing anything… that thing was a little glitchy."* It is not a
// glitch and the security posture is right — the gate is the `platform_admins`
// row under the service role, not this file. What was missing is any
// acknowledgement of who you are: he pressed *Open their dashboard*, landed on
// somebody else's dashboard with the product's own chrome around it, and going
// back to /admin then said *Page not found* with no way to read that as
// anything but broken.
//
// SO: ONE BREADCRUMB, WRITTEN BEFORE THE JUMP, READ IN TWO PLACES — the
// dashboard draws a bar saying whose it is, and /admin explains itself instead
// of answering 404 to its own owner.
//
// **IT IS MATCHED ON THE ADDRESS, NEVER ON A CLOCK.** A TTL would be a guess
// about how long somebody looks at a detailer's dashboard, and every wrong
// guess is either a bar that vanishes mid-session or one that follows him back
// into his own account. If the signed-in address is the one we jumped to, this
// is that jump; if it is not, it is over. Nothing to expire.
//
// **AND IT AUTHORISES NOTHING.** It is a note in one browser's localStorage,
// so a detailer who writes one by hand changes what THEIR OWN screen says and
// nothing else: the server still answers 404 to anybody without a
// `platform_admins` row, and this file never asks it anything.

const KEY = "dp.impersonating";

export function beginImpersonation({ as, business }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ as: String(as || "").toLowerCase(), business: business || "" }));
  } catch { /* private mode — the jump still works, it just says nothing */ }
}

// `email` is the address of the session that is live right now. Pass it and
// nothing else: the answer is a fact about this exact session, so a caller
// that has not got one yet must not be told "no".
export function impersonation(email) {
  if (!email) return null;
  try {
    const rec = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!rec?.as) return null;
    return rec.as === String(email).toLowerCase() ? rec : null;
  } catch { return null; }
}

export function endImpersonation() {
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
}
