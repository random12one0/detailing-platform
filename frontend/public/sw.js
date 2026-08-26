// Service worker for the admin PWA — handles incoming Web Push notifications
// and routes a tap to the right page (usually a specific booking's owner
// detail page, e.g. /admin/job/:id) instead of just focusing whatever tab is
// already open.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Andrew's Auto Detail", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Andrew's Auto Detail";
  const options = {
    body: data.body || "",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || "/admin" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && "focus" in client) {
            if ("navigate" in client) client.navigate(url);
            return client.focus();
          }
        } catch (e) {
          // ignore malformed client URLs
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
