// Web Push, the browser half — built in roadmap 2.11 step 6, stage 6.
//
// Everything on the server side already existed and had never been reachable:
// `owner_push_subscriptions`, `owner-push-subscribe` / `-unsubscribe`,
// `_shared/ownerPush.ts`, the VAPID secrets, and the whole `/job/:id` route
// whose stated purpose is "what a push-notification tap opens". What was
// missing was a service worker, a permission prompt and a PushManager call —
// so `push_enabled` was a boolean the detailer could set and no device was
// ever registered to receive anything. Architecture audit §2c item 1.
//
// THE ORDER MATTERS AND IT IS NOT THE OBVIOUS ONE. The permission prompt is
// asked LAST, after the worker is registered and the server has given us a
// key. A browser only offers one prompt per site per decision — a detailer
// who is asked and then hits a missing VAPID key has spent the only prompt
// they get, and "Allow" is then wired to nothing until they dig into browser
// settings. So everything that can fail silently fails before the prompt.

import { api } from "./api.js";

// Every one of these is absent somewhere real: `serviceWorker` on a page that
// is not on https or localhost, `PushManager` on iOS Safari outside an
// installed home-screen app, `Notification` on some embedded webviews.
export function pushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

// The state the switch draws itself from. Four answers, and each one has a
// different sentence under it — "off" and "the browser said no" look
// identical on a switch and are completely different problems.
//   unsupported  this browser cannot, and no amount of tapping will change it
//   blocked      permission was denied; only browser settings can undo it
//   on           this device is registered
//   off          supported, not blocked, not registered
export async function pushState() {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

// VAPID keys travel as base64url and `applicationServerKey` wants bytes.
function urlBase64ToUint8Array(base64) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Turn it on for THIS device. Returns nothing and throws with a sentence a
// detailer can act on — the caller prints it.
export async function enablePush(businessId) {
  if (!pushSupported()) throw new Error("This browser cannot show push notifications.");

  // 1. The worker. Registering is idempotent, so this is also the repair path
  //    for a device whose registration was cleared.
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  // 2. The key, BEFORE the prompt (see the note at the top of this file).
  const { public_key: key } = await api.pushPublicKey(businessId);
  if (!key) throw new Error("Push isn't set up on this account yet — email still works.");

  // 3. Now ask. `requestPermission` resolves with the answer whether or not
  //    the browser actually showed anything (an already-granted site never
  //    prompts again).
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Your browser blocked notifications for this site.");

  // 4. Reuse the subscription this browser already has rather than creating a
  //    second one — the endpoint is what identifies the device, and two rows
  //    for one phone is two copies of every alert.
  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? await reg.pushManager.subscribe({
    // Required by every browser that implements this; a silent push is not
    // deliverable to a page that is not open, which is the whole use.
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });
  await api.pushSubscribe(businessId, sub.toJSON());
}

// Off for this device. The row goes and so does the browser's subscription,
// because leaving the browser subscribed to an endpoint the server has
// forgotten is how a phone ends up with a notification nobody can turn off.
export async function disablePush(businessId) {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  // The server first: if this half fails the device is still subscribed and
  // the switch can be tried again. The other order loses the endpoint and
  // leaves a row nothing can ever delete.
  await api.pushUnsubscribe(businessId, sub.endpoint);
  await sub.unsubscribe();
}
