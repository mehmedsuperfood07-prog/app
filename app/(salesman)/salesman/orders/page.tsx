"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline/db";
import { pullLatestData, syncPendingOrders } from "@/lib/offline/sync";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  placed: "Placed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PENDING_LABELS: Record<string, string> = {
  queued: "Pending sync",
  syncing: "Syncing…",
  failed: "Sync failed",
};

export default function OrdersPage() {
  useEffect(() => {
    pullLatestData().catch(() => {});
  }, []);

  const orders = useLiveQuery(() => db.orders.toArray(), []) ?? [];
  const pending = useLiveQuery(() => db.pendingOrders.toArray(), []) ?? [];

  const pendingRows = pending
    .map((p) => ({
      kind: "pending" as const,
      id: p.id,
      clientName: p.client_name,
      createdAt: p.created_offline_at,
      total: p.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
      statusLabel: PENDING_LABELS[p.status],
      error: p.error,
      items: p.items,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const syncedRows = orders
    .map((o) => ({
      kind: "synced" as const,
      id: o.id,
      clientName: o.client_name,
      createdAt: o.created_at,
      total: o.total,
      statusLabel: STATUS_LABELS[o.status] ?? o.status,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          My Orders
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Every order you&apos;ve placed.
        </p>
      </div>

      <div className="space-y-2">
        {pendingRows.length === 0 && syncedRows.length === 0 && (
          <p className="text-sm text-zinc-500">No orders yet.</p>
        )}

        {pendingRows.map((o) => (
          <div
            key={o.id}
            className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {o.clientName}
              </span>
              <span className="text-xs text-amber-700 dark:text-amber-400">
                {o.statusLabel}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
              <span>{new Date(o.createdAt).toLocaleString()}</span>
              <span>Rs {o.total}</span>
            </div>
            <ul className="mt-2 space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              {o.items.map((item, i) => (
                <li key={i}>
                  {item.product_name} × {item.quantity}
                </li>
              ))}
            </ul>
            {o.error && (
              <p className="mt-2 text-xs text-red-600">{o.error}</p>
            )}
            {o.statusLabel === PENDING_LABELS.failed && (
              <button
                type="button"
                onClick={() => void syncPendingOrders()}
                className="mt-2 text-xs text-zinc-600 underline dark:text-zinc-400"
              >
                Retry
              </button>
            )}
          </div>
        ))}

        {syncedRows.map((o) => (
          <Link
            key={o.id}
            href={`/salesman/orders/${o.id}`}
            className="block rounded-lg border border-zinc-200 p-4 text-sm hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {o.clientName}
              </span>
              <span className="text-xs text-zinc-500">{o.statusLabel}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
              <span>{new Date(o.createdAt).toLocaleString()}</span>
              <span>Rs {o.total}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
