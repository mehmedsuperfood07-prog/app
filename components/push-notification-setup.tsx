"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "promptable" | "denied" | "subscribed";

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function PushNotificationSetup() {
  // Starts as null (renders nothing) on both the server pass and the
  // client's first hydration render, so there's nothing for React to
  // mismatch — the real value can only be known client-side (browser
  // APIs), so it's resolved in an effect and applied one render later.
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    async function resolveStatus() {
      if (!isPushSupported()) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      if (Notification.permission !== "granted") {
        setStatus("promptable");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "subscribed" : "promptable");
    }
    resolveStatus().catch(() => setStatus("promptable"));
  }, []);

  async function subscribe() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus(permission === "denied" ? "denied" : "promptable");
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setStatus("promptable");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setStatus("subscribed");
    } catch {
      setStatus("promptable");
    }
  }

  if (status !== "promptable") return null;

  return (
    <button
      type="button"
      onClick={subscribe}
      className="mb-4 flex w-full items-center gap-2.5 rounded-2xl border border-accent/30 bg-accent/5 p-3.5 text-left active:scale-[0.98]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Bell size={17} strokeWidth={2.2} />
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Enable notifications
        </span>
        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
          Get alerted the moment something needs your attention
        </span>
      </span>
    </button>
  );
}
