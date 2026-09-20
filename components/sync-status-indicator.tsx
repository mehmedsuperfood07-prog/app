"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { WifiOff, RefreshCw } from "lucide-react";
import { db } from "@/lib/offline/db";
import { setupAutoSync, syncPendingOrders } from "@/lib/offline/sync";

function subscribeToConnectivity(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function SyncStatusIndicator() {
  // The server snapshot is always "online": Node 21+ defines a global
  // `navigator` without `onLine`, so reading it during server rendering
  // yields undefined and briefly renders an "Offline" pill that the
  // browser then throws away (a hydration mismatch).
  const online = useSyncExternalStore(
    subscribeToConnectivity,
    () => navigator.onLine,
    () => true,
  );

  useEffect(() => setupAutoSync(), []);

  const pending = useLiveQuery(() => db.pendingOrders.toArray(), []) ?? [];
  const failedCount = pending.filter((o) => o.status === "failed").length;

  if (online && pending.length === 0) return null;

  return (
    <button
      type="button"
      onClick={() => void syncPendingOrders()}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
        failedCount > 0
          ? "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-accent-soft text-accent-soft-foreground"
      }`}
    >
      {!online ? <WifiOff size={13} /> : <RefreshCw size={13} />}
      {!online && pending.length === 0
        ? "Offline"
        : `${pending.length} pending${failedCount ? `, ${failedCount} failed` : ""}`}
    </button>
  );
}
