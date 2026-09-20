import "server-only";
import webpush from "web-push";
import { after } from "next/server";
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

// A subscription that answers with one of these can never work again
// (device unsubscribed, endpoint expired, or it was created against a
// different VAPID key). Deleting it keeps every later notification fast;
// the app re-registers the device the next time it's opened.
const PERMANENT_FAILURES = new Set([400, 401, 403, 404, 410]);

// Sends to every subscription a user has (they may have more than one
// device/browser). Never throws — a notification failing to send must
// never break the order/delivery action that triggered it.
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
            // Stale alerts are worse than none: drop anything undelivered
            // after 6 hours instead of buzzing a phone about yesterday.
            { TTL: 60 * 60 * 6, urgency: "high", timeout: 6000 },
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode !== undefined && PERMANENT_FAILURES.has(statusCode)) {
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
          } else {
            console.error("[push] send failed:", statusCode ?? err);
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

// Runs the task after the response has already gone back to the user, so
// the person tapping "Place order" or "Mark delivered" never waits on
// Google/Apple's push servers. On Vercel the function stays alive until
// the task finishes, so the notification still goes out.
export function deferPush(task: () => Promise<unknown>) {
  after(async () => {
    try {
      await task();
    } catch (err) {
      console.error("[push] deferred task failed:", err);
    }
  });
}
