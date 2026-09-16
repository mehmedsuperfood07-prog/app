"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline/db";
import { setupAutoSync, syncPendingOrders } from "@/lib/offline/sync";

export function SyncStatusIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
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

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-zinc-400"}`}
        title={online ? "Online" : "Offline"}
      />
      <span className="text-zinc-500">{online ? "Online" : "Offline"}</span>
      {pending.length > 0 && (
        <button
          type="button"
          onClick={() => void syncPendingOrders()}
          className="text-zinc-600 underline dark:text-zinc-400"
        >
          {pending.length} order{pending.length === 1 ? "" : "s"} pending
          {failedCount > 0 ? ` (${failedCount} failed)` : ""} — Sync now
        </button>
      )}
    </div>
  );
}
