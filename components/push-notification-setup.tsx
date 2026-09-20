"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useToast } from "@/components/toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "needs-install" | "promptable" | "denied" | "subscribed";

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

// iPhones only allow web push for an app that's been added to the Home
// Screen — in a normal Safari tab the API simply isn't there.
function isIosBrowserTab() {
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua);
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return isIos && !standalone;
}

export function PushNotificationSetup() {
  // Starts as null (renders nothing) on both the server pass and the
  // client's first hydration render, so there's nothing for React to
  // mismatch — the real value can only be known client-side (browser
  // APIs), so it's resolved in an effect and applied one render later.
  const [status, setStatus] = useState<Status | null>(null);
  const { show } = useToast();

  useEffect(() => {
    async function resolveStatus() {
      if (!isPushSupported()) {
        setStatus(isIosBrowserTab() ? "needs-install" : "unsupported");
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

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setStatus("subscribed");
      show("Notifications are on.");
    } catch {
      setStatus("promptable");
      show("Couldn't turn notifications on. Please try again.", "error");
    }
  }

  if (status === "promptable") {
    return (
      <button
        type="button"
        onClick={subscribe}
        className="mb-4 flex w-full items-center gap-2.5 rounded-2xl border border-accent/30 bg-accent/5 p-3.5 text-left transition active:scale-[0.98]"
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

  if (status === "denied" || status === "needs-install") {
    return (
      <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-zinc-200/80 bg-surface p-3.5 dark:border-zinc-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
          <BellOff size={17} strokeWidth={2.2} />
        </div>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {status === "denied" ? "Notifications are blocked" : "Add to Home Screen for alerts"}
          </span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {status === "denied"
              ? "Allow notifications for this site in your browser settings to get alerts."
              : "On iPhone, tap Share, then Add to Home Screen, and open the app from there."}
          </span>
        </span>
      </div>
    );
  }

  return null;
}
