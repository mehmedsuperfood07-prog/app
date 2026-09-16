"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { WifiOff, RefreshCw } from "lucide-react";
import { db } from "@/lib/offline/db";
import { setupAutoSync, syncPendingOrders } from "@/lib/offline/sync";

export function SyncStatusIndicator() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const stopAutoSync = setupAutoSync();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      stopAutoSync();
    };
  }, []);

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
