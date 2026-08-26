// Web Push to every device subscribed for ONE business. VAPID keys are
// platform-wide, from env (set once as function secrets):
//   OWNER_VAPID_PUBLIC_KEY / OWNER_VAPID_PRIVATE_KEY / OWNER_VAPID_SUBJECT

import webpush from "npm:web-push@3";
import { supabase } from "./db.ts";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export async function sendOwnerPush(
  businessId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed_stale: number }> {
  const publicKey = Deno.env.get("OWNER_VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("OWNER_VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("OWNER_VAPID_SUBJECT");
  if (!publicKey || !privateKey || !subject) {
    console.warn("VAPID keys not configured — skipping owner push");
    return { sent: 0, removed_stale: 0 };
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data: subs, error } = await supabase
    .from("owner_push_subscriptions")
    .select("*")
    .eq("business_id", businessId);
  if (error) throw error;
  if (!subs?.length) return { sent: 0, removed_stale: 0 };

  const body = JSON.stringify(payload);
  const stale: string[] = [];
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
      );
      sent++;
    } catch (e) {
      // deno-lint-ignore no-explicit-any
      const status = (e as any)?.statusCode;
      if (status === 404 || status === 410) stale.push(sub.endpoint);
      else console.error("owner push failed for", sub.endpoint, e);
    }
  }
  if (stale.length) {
    await supabase
      .from("owner_push_subscriptions")
      .delete()
      .eq("business_id", businessId)
      .in("endpoint", stale);
  }
  return { sent, removed_stale: stale.length };
}
