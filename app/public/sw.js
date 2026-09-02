// The service worker, and the whole reason the push switch could not work.
//
// Roadmap 2.11 step 6, stage 6. Three edge functions, a table, VAPID keys and
// the entire /job/:id route existed for a feature with NO client at all —
// no worker, no PushManager, no permission prompt. A detailer could turn the
// switch on and nothing was ever delivered, which the architecture audit
// called "worse than no switch". This file is the missing half.
//
// It does two things and deliberately nothing else. It is not a caching
// worker: this app is not offline-capable, and a worker that starts serving
// stale HTML is a far worse bug than the one it was added to fix.

// What supabase/functions/_shared/ownerPush.ts sends: { title, body, url, tag }.
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* not ours */ }
  const title = payload.title || "New activity";
  event.waitUntil(self.registration.showNotification(title, {
    body: payload.body || "",
    // `tag` lets the server replace its own earlier notification rather than
    // stack three reminders for one job on the lock screen.
    tag: payload.tag || undefined,
    data: { url: payload.url || "/app" },
    // No icon: there is no 192px PNG in this app and a 404 icon is worse
    // than the browser default. The tenant's own logo is the right answer
    // and it belongs in the PAYLOAD, next to the title, when someone wants it.
  }));
});

// A TAP OPENS THE JOB, AND REUSES A TAB IF ONE IS OPEN. Opening a second copy
// of the dashboard every time a notification is tapped is the classic version
// of this, and it loses whatever the detailer was in the middle of.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).origin === self.location.origin) {
        await c.focus();
        // `navigate` is not implemented everywhere; a focused tab on the
        // wrong screen still beats a new window, so the failure is swallowed.
        try { await c.navigate(url); } catch { /* focused is enough */ }
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
