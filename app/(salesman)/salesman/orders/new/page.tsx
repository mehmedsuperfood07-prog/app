"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, TriangleAlert, MapPin } from "lucide-react";
import { db, type CachedPriceOverride, type CachedProduct } from "@/lib/offline/db";
import { pullLatestData, queueOrder } from "@/lib/offline/sync";
import { effectivePrice } from "@/lib/offline/pricing";
import { formatRs, todayPakistanISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import { DeliveryDateField } from "@/components/delivery-date-field";
import { PageHeader } from "@/components/mobile/page-header";
import { CardLink } from "@/components/mobile/card";
import { Button } from "@/components/mobile/button";
import { OrderProductLine } from "@/components/order-product-line";
import { Skeleton } from "@/components/mobile/skeleton";
import { BottomActionBar } from "@/components/mobile/bottom-action-bar";

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client");
  const { show } = useToast();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [pulled, setPulled] = useState(false);
  // "YYYY-MM-DD" once chosen. Required: there is deliberately no default, so
  // every order carries a date the salesman actually picked.
  const [deliveryDate, setDeliveryDate] = useState("");
  const [dateMissing, setDateMissing] = useState(false);
  const dateFieldRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    pullLatestData()
      .catch(() => {})
      .finally(() => setPulled(true));
  }, []);

  const cachedClients = useLiveQuery(() => db.clients.toArray(), []);
  const clients = cachedClients ?? [];
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
    const sorted = [...clients]
      .filter((c) => c.active)
      .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
    const loading = cachedClients === undefined || (clients.length === 0 && !pulled);

    return (
      <div>
        <PageHeader title="New Order" subtitle="Choose a client to start" />
        <div className="relative mb-4">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            aria-label="Search clients"
            className="w-full rounded-xl border border-zinc-200 bg-surface py-2.5 pl-10 pr-3 text-sm shadow-sm dark:border-zinc-800"
          />
        </div>
        <div className="space-y-2.5">
          {loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-17 rounded-2xl" />)}
          {!loading && sorted.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">
              {clients.length === 0
                ? "No clients yet — add one from the Clients tab."
                : "No clients match your search."}
            </p>
          )}
          {sorted.map((c) => (
            <CardLink key={c.id} href={`/salesman/orders/new?client=${c.id}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-soft-foreground">
                  {c.name.trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{c.name}</p>
                  {c.area_name && (
                    <p className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <MapPin size={11} /> {c.area_name}
                    </p>
                  )}
                </div>
              </div>
            </CardLink>
          ))}
        </div>
      </div>
    );
  }

  const client = clients.find((c) => c.id === clientId);
  if (!client) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-18 rounded-2xl" />
        <Skeleton className="h-18 rounded-2xl" />
        {pulled && (
          <p className="pt-2 text-center text-sm text-zinc-500">
            Couldn&apos;t find this client. Connect once to sync your client list.
          </p>
        )}
      </div>
    );
  }

  const activeProducts = products.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name));
  const priceFor = (p: CachedProduct) => prices[p.id] ?? effectivePrice(p, clientId, overrides);
  const totalQty = Object.values(quantities).reduce((s, q) => s + q, 0);
  const totalRs = activeProducts.reduce(
    (sum, p) => sum + (quantities[p.id] ?? 0) * priceFor(p),
    0,
  );

  const overBy =
    client.credit_limit > 0 && totalQty > 0
      ? client.current_balance + totalRs - client.credit_limit
      : 0;

  function setQty(productId: string, qty: number) {
    setQuantities((q) => ({ ...q, [productId]: Math.max(0, Math.min(100000, Math.floor(qty))) }));
  }

  function setPrice(productId: string, value: number) {
    setPrices((p) => ({ ...p, [productId]: Math.max(0, value) }));
  }

  async function handleSubmit() {
    // A ref, not the `submitting` state: two taps in the same instant both
    // see the state as false, because React hasn't re-rendered yet.
    if (submittingRef.current) return;
    setError(null);
    const items = activeProducts
      .map((p) => ({
        product_id: p.id,
        product_name: p.name,
        quantity: quantities[p.id] ?? 0,
        unit_price: priceFor(p),
      }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) {
      setError("Add at least one product with a quantity.");
      return;
    }

    // The date card sits at the end of the product list, usually off-screen
    // by the time the salesman taps "Place order", so bring it into view.
    if (!deliveryDate || deliveryDate < todayPakistanISO()) {
      setDeliveryDate("");
      setDateMissing(true);
      dateFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Stays "submitting" once the order is queued — the navigation below
    // takes a moment, and re-enabling the button here would let a second
    // tap queue the same order twice.
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await queueOrder({
        clientId: client!.id,
        clientName: client!.name,
        items,
        expectedDeliveryDate: deliveryDate,
      });
      show(
        navigator.onLine
          ? "Order placed."
          : "Order saved on this device — it will send when you're back online.",
      );
      router.push("/salesman/orders");
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
      setError("Couldn't save the order on this device. Please try again.");
    }
  }

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={
          <>
            {client.area_name ?? "No area"} · Balance {formatRs(client.current_balance)}
            {client.credit_limit > 0 && ` · Limit ${formatRs(client.credit_limit)}`}
          </>
        }
        backHref="/salesman/orders/new"
        backLabel="Choose a different client"
      />

      {error && (
        <p className="mb-3 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          {error}
        </p>
      )}

      {overBy > 0 && (
        <div
          role="status"
          className="mb-3 flex items-start gap-2 rounded-2xl bg-zinc-900 px-3.5 py-3 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          <TriangleAlert size={17} className="mt-0.5 shrink-0" />
          <span>
            This order takes {client.name} <b>{formatRs(overBy)}</b> over their credit limit. You
            can still place it — the office will see it.
          </span>
        </div>
      )}

      {activeProducts.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          No products cached yet — connect once to load the catalog.
        </p>
      ) : (
        <div className="space-y-2.5 pb-24">
          {activeProducts.map((p) => (
            <OrderProductLine
              key={p.id}
              product={p}
              listPrice={effectivePrice(p, clientId, overrides)}
              price={priceFor(p)}
              qty={quantities[p.id] ?? 0}
              onQtyChange={(qty) => setQty(p.id, qty)}
              onPriceChange={(price) => setPrice(p.id, price)}
            />
          ))}

          <div ref={dateFieldRef}>
            <DeliveryDateField
              value={deliveryDate}
              invalid={dateMissing && !deliveryDate}
              onChange={(date) => {
                setDeliveryDate(date);
                setDateMissing(false);
              }}
            />
          </div>
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
                ? `Place order · ${totalQty} item${totalQty === 1 ? "" : "s"} · ${formatRs(totalRs)}`
                : "Place order"}
          </Button>
        </BottomActionBar>
      )}
    </div>
  );
}
