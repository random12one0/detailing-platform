// The service worker, and the whole reason the push switch could not work.
//
// Roadmap 2.11 step 6, stage 6. Three edge functions, a table, VAPID keys and
// the entire /job/:id route existed for a feature with NO client at all —
// no worker, no PushManager, no permission prompt. A detailer could turn the
// switch on and nothing was ever delivered, which the architecture audit
// called "worse than no switch". This file is the missing half.
//
// It does two things and deliberately nothing else: pushes (below), and, since
// ROADMAP 6.4a, KEEPING THE DASHBOARD'S OWN SHELL so a reload with no signal
// still starts the app (which then shows the last saved list, or "No
// connection"). It used to say it was not a caching worker, because a worker
// that starts serving stale HTML is a far worse bug than the one it was added
// to fix. That risk is the design constraint here, not a reason to skip it:
//   · NETWORK FIRST for the page and for everything not content-hashed — with a
//     4 second wait, so a weak signal falls back to the saved copy instead of
//     hanging. A working connection ALWAYS gets the live page, so nothing stale
//     is ever served while the network is up.
//   · CACHE FIRST only for /assets/*, which Vite names by content hash, so a
//     cached file can never be the wrong version of itself.
//   · Only same-origin GETs. Supabase, Stripe, forms and every POST are never
//     touched, and no customer data passes through this cache.
//   · Only navigations under /app. The public booking pages are not kept.
// ponytail: old hashed assets are never evicted; add a size cap if the cache
// is ever seen growing.
const SHELL = "dp-shell-v1";
const WAIT_MS = 4000;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function networkFirst(req, key) {
  const cache = await caches.open(SHELL);
  const live = fetch(req).then((res) => {
    if (res.ok) cache.put(key, res.clone());
    return res;
  });
  live.catch(() => {});   // a late failure after the timeout fallback is not news
  const give = new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  try {
    const winner = await Promise.race([live, give.then(() => null)]);
    if (winner) return winner;
    return (await cache.match(key)) || live;
  } catch (e) {
    const kept = await cache.match(key);
    if (kept) return kept;
    throw e;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;
  if (req.mode === "navigate") {
    if (url.pathname === "/app" || url.pathname.startsWith("/app/")) event.respondWith(networkFirst(req, "/app"));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      return (await cache.match(req)) || fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; });
    })());
    return;
  }
  event.respondWith(networkFirst(req, req.url));
});

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
