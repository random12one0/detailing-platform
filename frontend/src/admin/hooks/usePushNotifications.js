// usePushNotifications — registers the service worker and manages this
// device's Web Push subscription for the owner admin PWA. Exposes a simple
// status + enable()/disable() pair for a settings toggle.
import { useCallback, useEffect, useState } from "react";
import { supabase, SUPABASE_FUNCTIONS_URL } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const isSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window &&
  Boolean(VAPID_PUBLIC_KEY);

export function usePushNotifications() {
  // 'unsupported' | 'checking' | 'off' | 'on' | 'denied'
  const [status, setStatus] = useState(isSupported() ? "checking" : "unsupported");
  const [busy, setBusy] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!isSupported()) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setStatus(sub ? "on" : "off");
    } catch {
      setStatus("off");
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const enable = useCallback(async () => {
    if (!isSupported()) return { success: false, error: "Push notifications aren't supported on this device." };
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return { success: false, error: "Notification permission was not granted." };
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return { success: false, error: "Your admin session expired. Please sign in again." };

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/owner-push-subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Failed to save subscription.");

      setStatus("on");
      return { success: true };
    } catch (err) {
      await refreshStatus();
      return { success: false, error: err?.message || "Failed to enable notifications." };
    } finally {
      setBusy(false);
    }
  }, [refreshStatus]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (accessToken) {
          await fetch(`${SUPABASE_FUNCTIONS_URL}/owner-push-unsubscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          }).catch(() => {});
        }
        await sub.unsubscribe();
      }
      setStatus("off");
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message || "Failed to disable notifications." };
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, enable, disable };
}

export default usePushNotifications;
