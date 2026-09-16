"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Minus, Plus } from "lucide-react";
import { db, type CachedPriceOverride } from "@/lib/offline/db";
import { pullLatestData, queueOrder } from "@/lib/offline/sync";
import { effectivePrice } from "@/lib/offline/pricing";
import { PageHeader } from "@/components/mobile/page-header";
import { CardLink } from "@/components/mobile/card";
import { Button } from "@/components/mobile/button";
import { BottomActionBar } from "@/components/mobile/bottom-action-bar";

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
      <div>
        <PageHeader title="New Order" subtitle="Choose a client to start" />
        <div className="space-y-2.5">
          {sorted.map((c) => (
            <CardLink key={c.id} href={`/salesman/orders/new?client=${c.id}`}>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {c.name}
              </span>
            </CardLink>
          ))}
        </div>
      </div>
    );
  }

  const client = clients.find((c) => c.id === clientId);
  if (!client) {
    return (
      <div className="py-10 text-center text-sm text-zinc-500">
        Loading client… if this doesn&apos;t clear, connect once to sync
        your client list.
      </div>
    );
  }

  const activeProducts = products.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name));
  const totalQty = Object.values(quantities).reduce((s, q) => s + q, 0);
  const totalRs = activeProducts.reduce(
    (sum, p) => sum + (quantities[p.id] ?? 0) * effectivePrice(p, clientId, overrides),
    0,
  );

  function setQty(productId: string, qty: number) {
    setQuantities((q) => ({ ...q, [productId]: Math.max(0, qty) }));
  }

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
    <div>
      <PageHeader
        title={client.name}
        subtitle={
          <>
            {client.area_name ?? "No area"} · Balance Rs {client.current_balance}
            {client.credit_limit > 0 && ` · Limit Rs ${client.credit_limit}`}
          </>
        }
        backHref="/salesman/orders/new"
        backLabel="Choose a different client"
      />

      {error && (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">
          {error}
        </p>
      )}

      {activeProducts.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          No products cached yet — connect once to load the catalog.
        </p>
      ) : (
        <div className="space-y-2.5 pb-20">
          {activeProducts.map((p) => {
            const price = effectivePrice(p, clientId, overrides);
            const qty = quantities[p.id] ?? 0;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-surface p-3.5 shadow-sm dark:border-zinc-800"
              >
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                    {p.name}
                    {p.variant ? ` — ${p.variant}` : ""}
                  </div>
                  <div className="text-zinc-500 dark:text-zinc-400">
                    {p.pack_size} {p.unit} · Rs {price}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQty(p.id, qty - 1)}
                    disabled={qty === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 active:bg-zinc-200 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={qty}
                    onChange={(e) => setQty(p.id, Number(e.target.value) || 0)}
                    className="w-10 rounded-md border-0 bg-transparent text-center text-sm font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setQty(p.id, qty + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground active:bg-accent/90"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeProducts.length > 0 && (
        <BottomActionBar>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || totalQty === 0}
            className="w-full py-3.5"
          >
            {submitting
              ? "Placing order…"
              : totalQty > 0
                ? `Place order · ${totalQty} item${totalQty === 1 ? "" : "s"} · Rs ${totalRs}`
                : "Place order"}
          </Button>
        </BottomActionBar>
      )}
    </div>
  );
}
