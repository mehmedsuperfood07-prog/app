"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import type { OrderFormInput, OrderFormResult } from "@/lib/actions/orders";
import type { OrderProduct } from "@/lib/orders";
import { formatRs, todayPakistanISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import { DeliveryDateField } from "@/components/delivery-date-field";
import { OrderProductLine } from "@/components/order-product-line";
import { Button } from "@/components/mobile/button";

// An online order form: the office taking a new order, or anyone editing an
// existing one. (The salesman's own new-order screen is separate because it
// works offline from the device's copy of the catalog.) The page binds the
// client or order id into `action`, so this only sends the cart.
export function OrderForm({
  client,
  products,
  action,
  redirectBase,
  salesmen,
  initial,
  alreadyCharged = 0,
  submitLabel = "Place order",
  pendingLabel = "Placing order…",
  refreshDeviceCache = false,
}: {
  client: { name: string; balance: number; creditLimit: number; salesmanId?: string | null };
  products: OrderProduct[];
  action: (input: OrderFormInput) => Promise<OrderFormResult>;
  // Where to go afterwards: `${redirectBase}${orderId}`.
  redirectBase: string;
  // Shown as a "Counts for salesman" picker when given (the office's new order).
  salesmen?: { id: string; full_name: string }[];
  initial?: {
    lines: { productId: string; quantity: number; unitPrice: number }[];
    deliveryDate: string | null;
  };
  // What this order already adds to the client's balance (its live invoice),
  // so the credit warning doesn't count it twice when editing.
  alreadyCharged?: number;
  submitLabel?: string;
  pendingLabel?: string;
  // The salesman app keeps a copy of his orders on the phone; refresh it.
  refreshDeviceCache?: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries((initial?.lines ?? []).map((l) => [l.productId, l.quantity])),
  );
  const [prices, setPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries((initial?.lines ?? []).map((l) => [l.productId, l.unitPrice])),
  );
  const initialDate = initial?.deliveryDate ?? "";
  const [deliveryDate, setDeliveryDate] = useState(initialDate);
  const [dateMissing, setDateMissing] = useState(false);
  const [salesmanId, setSalesmanId] = useState(
    client.salesmanId && salesmen?.some((s) => s.id === client.salesmanId) ? client.salesmanId : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const dateFieldRef = useRef<HTMLDivElement>(null);

  const priceFor = (p: OrderProduct) => prices[p.id] ?? p.price;
  const totalQty = Object.values(quantities).reduce((s, q) => s + q, 0);
  const totalRs = products.reduce((sum, p) => sum + (quantities[p.id] ?? 0) * priceFor(p), 0);
  const overBy =
    client.creditLimit > 0 && totalQty > 0
      ? client.balance - alreadyCharged + totalRs - client.creditLimit
      : 0;

  async function handleSubmit() {
    if (submittingRef.current) return;
    setError(null);
    const items = products
      .map((p) => ({ product_id: p.id, quantity: quantities[p.id] ?? 0, unit_price: priceFor(p) }))
      .filter((i) => i.quantity > 0);
    if (items.length === 0) {
      setError("Add at least one product with a quantity.");
      return;
    }
    // A date already on the order may be kept even if it has passed; a newly
    // chosen one must be today or later.
    if (!deliveryDate || (deliveryDate !== initialDate && deliveryDate < todayPakistanISO())) {
      setDeliveryDate("");
      setDateMissing(true);
      dateFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (salesmen && !salesmanId) {
      setError("Choose the salesman this order counts for.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await action({
        items,
        expectedDeliveryDate: deliveryDate,
        ...(salesmen ? { salesmanId } : {}),
      });
      if (!result.ok) {
        setError(result.error);
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }
      if (refreshDeviceCache) {
        await import("@/lib/offline/sync").then((m) => m.pullLatestData()).catch(() => {});
      }
      if (result.warning) show(result.warning, "error");
      else show(result.message, "success");
      router.push(`${redirectBase}${result.orderId}`);
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
      setError("Couldn't reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="space-y-3">
      {overBy > 0 && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-2xl bg-zinc-900 px-3.5 py-3 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          <TriangleAlert size={17} className="mt-0.5 shrink-0" />
          <span>
            This order takes {client.name} <b>{formatRs(overBy)}</b> over their credit limit. You can
            still save it.
          </span>
        </div>
      )}

      {products.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">No active products in the catalog.</p>
      ) : (
        <div className="grid items-start gap-2.5 lg:grid-cols-2">
          {products.map((p) => (
            <OrderProductLine
              key={p.id}
              product={p}
              listPrice={p.price}
              price={priceFor(p)}
              qty={quantities[p.id] ?? 0}
              onQtyChange={(qty) =>
                setQuantities((q) => ({ ...q, [p.id]: Math.max(0, Math.min(100000, Math.floor(qty))) }))
              }
              onPriceChange={(price) => setPrices((pr) => ({ ...pr, [p.id]: Math.max(0, price) }))}
            />
          ))}
        </div>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-2">
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
        {salesmen && (
          <label className="block rounded-2xl border border-zinc-200/80 bg-surface p-3.5 shadow-sm dark:border-zinc-800">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Counts for salesman</span>
            <span className="mb-2 block text-xs text-zinc-500 dark:text-zinc-400">
              Normally the client&apos;s own salesman, so their sales figures stay right.
            </span>
            <select
              value={salesmanId}
              onChange={(e) => setSalesmanId(e.target.value)}
              aria-label="Salesman this order counts for"
              className="w-full rounded-xl border border-zinc-300 bg-surface px-3 py-2.5 text-sm dark:border-zinc-700"
            >
              <option value="" disabled>
                Choose salesman…
              </option>
              {salesmen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                  {s.id === client.salesmanId ? " (client's salesman)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          {error}
        </p>
      )}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || totalQty === 0}
        className="w-full py-3.5"
      >
        {submitting
          ? pendingLabel
          : totalQty > 0
            ? `${submitLabel} · ${totalQty} item${totalQty === 1 ? "" : "s"} · ${formatRs(totalRs)}`
            : submitLabel}
      </Button>
    </div>
  );
}
