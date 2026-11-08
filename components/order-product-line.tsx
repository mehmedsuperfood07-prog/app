import { Minus, Plus } from "lucide-react";
import { netRate } from "@/lib/discount";
import { formatRs } from "@/lib/format";
import { ProductIcon } from "@/components/mobile/product-icon";

const QUICK_DISCOUNTS = [1, 2, 3, 5];

// One product on an order form: quantity stepper, and once a quantity is set,
// the rate (editable for now, until rates are locked), a percentage discount
// and the line total. Shared by the salesman's order screen and the admin's,
// so both behave the same.
export function OrderProductLine({
  product,
  listPrice,
  price,
  discountPct,
  qty,
  onQtyChange,
  onPriceChange,
  onDiscountChange,
}: {
  product: { name: string; variant: string | null; unit: string; pack_size: string };
  listPrice: number;
  price: number; // the rate before any discount
  discountPct: number;
  qty: number;
  onQtyChange: (qty: number) => void;
  onPriceChange: (price: number) => void;
  onDiscountChange: (pct: number) => void;
}) {
  const p = product;
  const discounted = price !== listPrice;
  const net = netRate(price, discountPct);

  return (
    <div
      className={`rounded-2xl border bg-surface p-3.5 shadow-sm transition-colors ${
        qty > 0 ? "border-accent/40 bg-accent/5" : "border-zinc-200/80 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <ProductIcon name={p.name} unit={p.unit} />
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
            {p.name}
            {p.variant ? ` — ${p.variant}` : ""}
          </div>
          <div className="text-zinc-500 dark:text-zinc-400">
            {p.pack_size} {p.unit} · list {formatRs(listPrice)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onQtyChange(qty - 1)}
            disabled={qty === 0}
            aria-label={`Remove one ${p.name}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition active:scale-90 active:bg-zinc-200 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <Minus size={16} />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={qty}
            onFocus={(e) => e.target.select()}
            onChange={(e) => onQtyChange(Number(e.target.value) || 0)}
            aria-label={`Quantity of ${p.name}`}
            className="w-11 rounded-md border-0 bg-transparent text-center text-sm font-semibold"
          />
          <button
            type="button"
            onClick={() => onQtyChange(qty + 1)}
            aria-label={`Add one ${p.name}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground transition active:scale-90 active:bg-accent/90"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      {qty > 0 && (
        <div className="mt-3 space-y-2 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Rate
            <span className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                Rs
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={price}
                onFocus={(e) => e.target.select()}
                onChange={(e) => onPriceChange(Number(e.target.value) || 0)}
                aria-label={`Rate for ${p.name}`}
                className={`w-24 rounded-lg border bg-surface py-1.5 pl-7 pr-2 text-sm font-semibold ${
                  discounted
                    ? "border-accent text-accent"
                    : "border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
                }`}
              />
            </span>
            {discounted && (
              <span className="text-[0.6875rem] font-semibold text-accent">Discounted</span>
            )}
          </label>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {formatRs(qty * net)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <label className="flex items-center gap-1.5">
            Discount
            <span className="relative">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.5"
                value={discountPct || ""}
                placeholder="0"
                onFocus={(e) => e.target.select()}
                onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
                aria-label={`Discount percent for ${p.name}`}
                className={`w-16 rounded-lg border bg-surface py-1.5 pl-2 pr-5 text-sm font-semibold ${
                  discountPct > 0 ? "border-accent text-accent" : "border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
                }`}
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">%</span>
            </span>
          </label>
          {QUICK_DISCOUNTS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDiscountChange(discountPct === d ? 0 : d)}
              aria-pressed={discountPct === d}
              className={`rounded-full px-2.5 py-1 font-semibold transition active:scale-95 ${
                discountPct === d ? "bg-accent text-accent-foreground" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {d}%
            </button>
          ))}
          {discountPct > 0 && <span className="ml-auto font-semibold text-accent">Net {formatRs(net)}</span>}
        </div>
        </div>
      )}
    </div>
  );
}
