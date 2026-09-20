"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertCircle, ReceiptText, RotateCw } from "lucide-react";
import { db } from "@/lib/offline/db";
import { pullLatestData, syncPendingOrders } from "@/lib/offline/sync";
import { formatDateTime, formatRs } from "@/lib/format";
import { PageHeader } from "@/components/mobile/page-header";
import { Card, CardLink } from "@/components/mobile/card";
import { OrderStatusPill, StatusPill } from "@/components/mobile/status-pill";
import { Skeleton } from "@/components/mobile/skeleton";

export default function OrdersPage() {
  useEffect(() => {
    pullLatestData().catch(() => {});
  }, []);

  const cachedOrders = useLiveQuery(() => db.orders.toArray(), []);
  const cachedPending = useLiveQuery(() => db.pendingOrders.toArray(), []);
  const orders = cachedOrders ?? [];
  const pending = cachedPending ?? [];

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

  const loading = cachedOrders === undefined || cachedPending === undefined;

  return (
    <div>
      <PageHeader
        title="My Orders"
        subtitle={
          pendingRows.length + syncedRows.length > 0
            ? `${pendingRows.length + syncedRows.length} order${pendingRows.length + syncedRows.length === 1 ? "" : "s"} placed`
            : "Every order you've placed"
        }
      />

      <div className="space-y-2.5">
        {loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />)}

        {!loading && pendingRows.length === 0 && syncedRows.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
              <ReceiptText size={22} />
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">No orders yet</p>
            <p className="mb-4 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Orders you take will show up here.
            </p>
            <Link
              href="/salesman/orders/new"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground active:bg-accent/90"
            >
              Take an order
            </Link>
          </div>
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
              <span>{formatDateTime(o.createdAt)}</span>
              <span>{formatRs(o.total)}</span>
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
              <span>{formatDateTime(o.createdAt)}</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {formatRs(o.total)}
              </span>
            </div>
          </CardLink>
        ))}
      </div>
    </div>
  );
}
