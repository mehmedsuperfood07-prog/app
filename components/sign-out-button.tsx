"use client";

import { useTransition } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { db } from "@/lib/offline/db";

// Signing out has to tidy up this device, not just end the session:
// - the browser's push subscription is detached from the account, so the
//   next person to sign in here doesn't get the previous user's alerts;
// - the salesman's cached clients/prices/orders are cleared so they can't
//   show up for whoever signs in next. Unsynced orders are deliberately
//   kept — wiping them would silently lose work taken while offline.
// Both are best-effort and never block signing out.
async function cleanUpThisDevice() {
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
    }
  } catch {}
  try {
    await Promise.all([
      db.clients.clear(),
      db.products.clear(),
      db.priceOverrides.clear(),
      db.orders.clear(),
    ]);
  } catch {}
  try {
    // The service worker keeps a copy of every page visited so a reload
    // works offline — drop those so they can't be shown to the next user.
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("mehmed-")).map((k) => caches.delete(k)));
    }
  } catch {}
}

export function SignOutButton({ className = "" }: { className?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await cleanUpThisDevice();
          await logout();
        })
      }
      className={`flex w-full items-center gap-2 text-left text-sm font-medium disabled:opacity-60 ${className}`}
    >
      {pending ? <LoaderCircle size={16} className="animate-spin" /> : <LogOut size={16} />}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
