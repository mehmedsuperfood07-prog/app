import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/auth";

webpush.setVapidDetails(
  "mailto:admin@mehmedsuperfood.pk",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

// Sends to every subscription a user has (they may have more than one
// device/browser). Never throws — a notification failing to send must
// never break the order/delivery action that triggered it. Expired or
// revoked subscriptions (404/410 from the push service) get cleaned up
// automatically.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    const admin = createAdminClient();
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subs || subs.length === 0) return;

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload),
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }),
    );
  } catch (err) {
    console.error("[push] sendPushToUser failed:", err);
  }
}

export async function sendPushToRole(role: Role, payload: PushPayload) {
  try {
    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from("profiles")
      .select("id")
      .eq("role", role)
      .eq("active", true);

    if (!profiles) return;
    await Promise.all(profiles.map((p) => sendPushToUser(p.id, payload)));
  } catch (err) {
    console.error("[push] sendPushToRole failed:", err);
  }
}
