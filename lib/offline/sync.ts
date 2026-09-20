"use client";

import { db, type PendingOrderItem } from "@/lib/offline/db";

// Refreshes the local cache from the server. Best-effort: callers should
// swallow failures (offline, or a flaky connection) and keep showing
// whatever was cached from the last successful pull.
export async function pullLatestData(): Promise<void> {
  const res = await fetch("/api/salesman/bootstrap");
  if (!res.ok) throw new Error("Could not refresh data.");
  const data = await res.json();

  await db.transaction(
    "rw",
    [db.clients, db.products, db.priceOverrides, db.orders],
    async () => {
      await Promise.all([
        db.clients.clear(),
        db.products.clear(),
        db.priceOverrides.clear(),
        db.orders.clear(),
      ]);
      await Promise.all([
        db.clients.bulkPut(data.clients),
        db.products.bulkPut(data.products),
        db.priceOverrides.bulkPut(data.priceOverrides),
        db.orders.bulkPut(data.orders),
      ]);
    },
  );
}

// Writes an order to the local outbox immediately — this never waits on
// the network, which is the whole point (CLAUDE.md section 5: "the
// salesman never waits on a network call to add a line item"). Returns
// right away; syncPendingOrders runs in the background afterward.
export async function queueOrder(input: {
  clientId: string;
  clientName: string;
  items: PendingOrderItem[];
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.pendingOrders.put({
    id,
    client_id: input.clientId,
    client_name: input.clientName,
    items: input.items,
    created_offline_at: new Date().toISOString(),
    status: "queued",
  });
  void syncPendingOrders();
  return id;
}

let syncInFlight = false;

// A sync attempt that's been "syncing" this long was abandoned — the tab
// was closed or the phone killed it mid-request. Without this, that order
// would sit on "Syncing…" forever and never be sent.
const STALE_SYNC_MS = 60_000;

// Pushes every queued (or previously failed) order to the server, one at
// a time, in the order they were taken. Safe to call opportunistically
// (on reconnect, on an interval, right after queueing) — re-entrant calls
// while a sync is already running are no-ops.
export async function syncPendingOrders(): Promise<void> {
  if (syncInFlight) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  syncInFlight = true;
  try {
    const now = Date.now();
    const queued = await db.pendingOrders.toArray().then((all) =>
      all
        .filter(
          (o) =>
            o.status === "queued" ||
            o.status === "failed" ||
            (o.status === "syncing" && now - (o.syncing_since ?? 0) > STALE_SYNC_MS),
        )
        .sort(
          (a, b) =>
            new Date(a.created_offline_at).getTime() - new Date(b.created_offline_at).getTime(),
        ),
    );

    for (const order of queued) {
      await db.pendingOrders.update(order.id, { status: "syncing", syncing_since: Date.now() });
      try {
        const res = await fetch("/api/salesman/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: order.client_id,
            items: order.items.map((i) => ({
              product_id: i.product_id,
              quantity: i.quantity,
            })),
            created_offline_at: order.created_offline_at,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Sync failed.");
        }

        const { orderId } = (await res.json().catch(() => ({}))) as { orderId?: string };

        // Swap the pending row for the synced one in a single transaction
        // so the order never disappears from the list between "sent" and
        // "pulled back" — the full pull below then refines it.
        await db.transaction("rw", [db.pendingOrders, db.orders], async () => {
          if (orderId) {
            await db.orders.put({
              id: orderId,
              status: "placed",
              created_at: new Date().toISOString(),
              client_id: order.client_id,
              client_name: order.client_name,
              total: order.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
            });
          }
          await db.pendingOrders.delete(order.id);
        });
      } catch (err) {
        await db.pendingOrders.update(order.id, {
          status: "failed",
          error: err instanceof Error ? err.message : "Sync failed.",
        });
      }
    }

    if (queued.length > 0) {
      await pullLatestData().catch(() => {});
    }
  } finally {
    syncInFlight = false;
  }
}

// Retries automatically on reconnect and on a slow interval as a
// fallback (the 'online' event isn't always reliable on every platform).
// Returns a cleanup function.
export function setupAutoSync(): () => void {
  const onOnline = () => void syncPendingOrders();
  window.addEventListener("online", onOnline);
  const interval = window.setInterval(onOnline, 30_000);

  return () => {
    window.removeEventListener("online", onOnline);
    window.clearInterval(interval);
  };
}
