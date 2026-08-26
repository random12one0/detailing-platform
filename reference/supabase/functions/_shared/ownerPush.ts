// Sends a Web Push notification to every device the owner has enabled
// notifications on (rows in owner_push_subscriptions). Used for instant
// events (new booking, booking updated, payment finalized) and by the
// reminder cron sweep (owner reminder, closer nudge, morning digest,
// finalize-payment nudge).
//
// Separate from the FORGE app's push infra that lives in this same Supabase
// project (forge_push_subscriptions, its own `send-push` function, its own
// vault secret `vapid_private_key`) — this uses its own table and its own
// vault secrets (`owner_vapid_private_key` / `owner_vapid_subject`) so
// nothing collides.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import webpush from "npm:web-push@3";

// Public VAPID key — not secret, safe to embed (the frontend also has it via
// REACT_APP_VAPID_PUBLIC_KEY, they must match).
const VAPID_PUBLIC_KEY = "BJSR2nIl-eAg_-zjkVpbSR4NOnE_hIPPsNxXNbMp9Uwc5PN2QwQPKdIllXyn9zMaRJDfgPFwmdt8EYrc69HbHxE";

type PushPayload = {
  title: string;
  body: string;
  // Relative or absolute URL to open when the notification is tapped.
  url?: string;
  // De-dupes/replaces a notification of the same tag in the OS tray.
  tag?: string;
};

export async function sendOwnerPush(payload: PushPayload): Promise<{ sent: number; removed_stale: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const [{ data: privateKey, error: keyErr }, { data: subject, error: subjErr }] = await Promise.all([
    supabase.rpc("get_secret", { secret_name: "owner_vapid_private_key" }),
    supabase.rpc("get_secret", { secret_name: "owner_vapid_subject" }),
  ]);
  if (keyErr || !privateKey) throw new Error(`VAPID private key unavailable: ${keyErr?.message ?? "not found"}`);
  if (subjErr || !subject) throw new Error(`VAPID subject unavailable: ${subjErr?.message ?? "not found"}`);

  webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY, privateKey);

  const { data: subs, error: subsErr } = await supabase.from("owner_push_subscriptions").select("*");
  if (subsErr) throw subsErr;
  if (!subs?.length) return { sent: 0, removed_stale: 0 };

  const body = JSON.stringify(payload);
  const staleEndpoints: string[] = [];
  let sent = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
      );
      sent++;
    } catch (e: any) {
      // 404/410 = the browser unsubscribed or the subscription expired — clean it up.
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        staleEndpoints.push(sub.endpoint);
      } else {
        console.error("owner push failed for", sub.endpoint, e?.message || e);
      }
    }
  }

  if (staleEndpoints.length) {
    await supabase.from("owner_push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  return { sent, removed_stale: staleEndpoints.length };
}
