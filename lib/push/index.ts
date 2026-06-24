import webpush from "web-push";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

let _configured = false;

function ensureConfigured() {
  if (_configured) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(env.VAPID_SUBJECT ?? "mailto:admin@example.com", env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  _configured = true;
  return true;
}

export async function sendPush(userId: string, payload: { title: string; body?: string; url?: string }) {
  if (!ensureConfigured()) return { ok: false, reason: "vapid_not_configured" };
  const admin = createServiceClient();
  const { data: subs } = await admin.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", userId);
  if (!subs?.length) return { ok: false, reason: "no_subscriptions" };
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    })
  );
  return { ok: true };
}
