"use client";

import { useEffect } from "react";

// Keeps this browser's push subscription tied to whoever is signed in
// right now. Without it, signing in as a different user on the same
// browser (admin, then rider, on one laptop) leaves the subscription
// registered to the previous person — so the new user's notifications
// never arrive and the old user's keep showing up. Runs silently and
// only if this browser already has permission and a subscription.
export function PushSubscriptionSync() {
  useEffect(() => {
    async function sync() {
      if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        Notification.permission !== "granted"
      ) {
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
    }
    sync().catch(() => {});
  }, []);

  return null;
}
