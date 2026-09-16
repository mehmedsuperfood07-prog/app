"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type CachedPriceOverride } from "@/lib/offline/db";
import { pullLatestData, queueOrder } from "@/lib/offline/sync";
import { effectivePrice } from "@/lib/offline/pricing";

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client");

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    pullLatestData().catch(() => {});
  }, []);

  const clients = useLiveQuery(() => db.clients.toArray(), []) ?? [];
  const products = useLiveQuery(() => db.products.toArray(), []) ?? [];
  const overrides: CachedPriceOverride[] =
    useLiveQuery<CachedPriceOverride[]>(
      () =>
        clientId
          ? db.priceOverrides.toArray().then((all) => all.filter((o) => o.client_id === clientId))
          : Promise.resolve<CachedPriceOverride[]>([]),
      [clientId],
    ) ?? [];

  if (!clientId) {
    const sorted = [...clients].filter((c) => c.active).sort((a, b) => a.name.localeCompare(b.name));
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          New Order
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Choose a client to start.
        </p>
        <div className="space-y-2">
          {sorted.map((c) => (
            <Link
              key={c.id}
              href={`/salesman/orders/new?client=${c.id}`}
              className="block rounded-lg border border-zinc-200 p-3 text-sm hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const client = clients.find((c) => c.id === clientId);
  if (!client) {
    return (
      <div className="max-w-md space-y-4">
        <p className="text-sm text-zinc-500">
          Loading client… if this doesn&apos;t clear, connect once to sync
          your client list.
        </p>
      </div>
    );
  }

  const activeProducts = products.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name));

  async function handleSubmit() {
    setError(null);
    const items = activeProducts
      .map((p) => ({
        product_id: p.id,
        product_name: p.name,
        quantity: quantities[p.id] ?? 0,
        unit_price: effectivePrice(p, clientId!, overrides),
      }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) {
      setError("Add at least one product with a quantity.");
      return;
    }

    setSubmitting(true);
    try {
      await queueOrder({ clientId: client!.id, clientName: client!.name, items });
      router.push("/salesman/orders");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          New Order — {client.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {client.area_name ?? "No area"} · Balance Rs {client.current_balance}
          {client.credit_limit > 0 && ` · Credit limit Rs ${client.credit_limit}`}
        </p>
        <Link
          href="/salesman/orders/new"
          className="mt-1 inline-block text-xs text-zinc-500 underline"
        >
          Choose a different client
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {activeProducts.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No products cached yet — connect once to load the catalog.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {activeProducts.map((p) => {
              const price = effectivePrice(p, clientId, overrides);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="text-sm">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {p.name}
                      {p.variant ? ` — ${p.variant}` : ""}
                    </div>
                    <div className="text-zinc-500">
                      {p.pack_size} {p.unit} · Rs {price}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={quantities[p.id] ?? 0}
                    onChange={(e) =>
                      setQuantities((q) => ({
                        ...q,
                        [p.id]: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {submitting ? "Placing order…" : "Place order"}
          </button>
        </div>
      )}
    </div>
  );
}
