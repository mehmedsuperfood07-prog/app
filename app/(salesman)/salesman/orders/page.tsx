"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertCircle, RotateCw } from "lucide-react";
import { db } from "@/lib/offline/db";
import { pullLatestData, syncPendingOrders } from "@/lib/offline/sync";
import { PageHeader } from "@/components/mobile/page-header";
import { Card, CardLink } from "@/components/mobile/card";
import { OrderStatusPill, StatusPill } from "@/components/mobile/status-pill";

export default function OrdersPage() {
  useEffect(() => {
    pullLatestData().catch(() => {});
  }, []);

  const orders = useLiveQuery(() => db.orders.toArray(), []) ?? [];
  const pending = useLiveQuery(() => db.pendingOrders.toArray(), []) ?? [];

  const pendingRows = pending
    .map((p) => ({
      id: p.id,
      clientName: p.client_name,
      createdAt: p.created_offline_at,
      total: p.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
      status: p.status,
      error: p.error,
      items: p.items,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const syncedRows = orders
    .map((o) => ({
      id: o.id,
      clientName: o.client_name,
      createdAt: o.created_at,
      total: o.total,
      status: o.status,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div>
      <PageHeader title="My Orders" subtitle="Every order you've placed" />

      <div className="space-y-2.5">
        {pendingRows.length === 0 && syncedRows.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">No orders yet.</p>
        )}

        {pendingRows.map((o) => (
          <Card
            key={o.id}
            className={o.status === "failed" ? "border-zinc-400 dark:border-zinc-600" : "border-accent-soft"}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {o.clientName}
              </span>
              <StatusPill tone={o.status === "failed" ? "neutral" : "soft"}>
                {o.status === "failed"
                  ? "Sync failed"
                  : o.status === "syncing"
                    ? "Syncing…"
                    : "Pending sync"}
              </StatusPill>
            </div>
            <div className="mt-1 flex gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{new Date(o.createdAt).toLocaleString()}</span>
              <span>Rs {o.total}</span>
            </div>
            <ul className="mt-2.5 space-y-0.5 border-t border-zinc-100 pt-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              {o.items.map((item, i) => (
                <li key={i}>
                  {item.product_name} × {item.quantity}
                </li>
              ))}
            </ul>
            {o.error && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <AlertCircle size={13} /> {o.error}
              </p>
            )}
            {o.status === "failed" && (
              <button
                type="button"
                onClick={() => void syncPendingOrders()}
                className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-accent"
              >
                <RotateCw size={12} /> Retry
              </button>
            )}
          </Card>
        ))}

        {syncedRows.map((o) => (
          <CardLink key={o.id} href={`/salesman/orders/${o.id}`}>
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {o.clientName}
              </span>
              <OrderStatusPill status={o.status} />
            </div>
            <div className="mt-1 flex gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{new Date(o.createdAt).toLocaleString()}</span>
              <span>Rs {o.total}</span>
            </div>
          </CardLink>
        ))}
      </div>
    </div>
  );
}
