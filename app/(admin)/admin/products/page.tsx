import { ChevronDown, AlertCircle, Plus } from "lucide-react";
import { listProducts } from "@/lib/products";
import { PRODUCT_UNITS } from "@/lib/constants";
import {
  createProductAction,
  updateProductAction,
  toggleProductActiveAction,
} from "@/lib/actions/products";
import { Field, SelectField } from "@/components/form-field";
import { PageHeader } from "@/components/mobile/page-header";
import { StatusPill } from "@/components/mobile/status-pill";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const products = await listProducts();

  return (
    <div>
      <PageHeader title="Products" subtitle="The default price list" />

      {error && (
        <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      <details className="group mb-4 overflow-hidden rounded-2xl border border-zinc-200/80 bg-surface shadow-sm dark:border-zinc-800">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <span className="flex items-center gap-1.5">
            <Plus size={16} className="text-accent" /> Add product
          </span>
          <ChevronDown size={16} className="text-zinc-400 group-open:rotate-180" />
        </summary>
        <form action={createProductAction} className="space-y-3 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <ProductFields />
          <button
            type="submit"
            className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-foreground active:bg-accent/90"
          >
            Add product
          </button>
        </form>
      </details>

      <div className="space-y-2.5">
        {products.map((p) => (
          <details
            key={p.id}
            className="group overflow-hidden rounded-2xl border border-zinc-200/80 bg-surface shadow-sm dark:border-zinc-800"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                    {p.name}
                    {p.variant ? ` — ${p.variant}` : ""}
                  </span>
                  {!p.active && <StatusPill tone="neutral">Inactive</StatusPill>}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {p.pack_size} {p.unit} · Rs {p.default_price}
                </div>
              </div>
              <ChevronDown size={16} className="shrink-0 text-zinc-400 group-open:rotate-180" />
            </summary>
            <div className="border-t border-zinc-100 px-4 py-4 dark:border-zinc-800">
              <form action={updateProductAction} className="space-y-3">
                <input type="hidden" name="id" value={p.id} />
                <ProductFields product={p} />
                <button
                  type="submit"
                  className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-foreground active:bg-accent/90"
                >
                  Save changes
                </button>
              </form>
              <form action={toggleProductActiveAction} className="mt-3">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="active" value={(!p.active).toString()} />
                <button
                  type="submit"
                  className="w-full rounded-full border border-zinc-300 py-2.5 text-sm font-medium text-zinc-600 active:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:active:bg-zinc-900"
                >
                  {p.active ? "Deactivate" : "Activate"}
                </button>
              </form>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function ProductFields({
  product,
}: {
  product?: {
    name: string;
    variant: string | null;
    unit: string;
    pack_size: string;
    default_price: number;
    category: string | null;
  };
}) {
  return (
    <div className="space-y-3">
      <Field label="Name" name="name" defaultValue={product?.name} required />
      <Field label="Variant" name="variant" defaultValue={product?.variant ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Unit" name="unit" defaultValue={product?.unit ?? "kg"}>
          {PRODUCT_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </SelectField>
        <Field
          label="Pack size"
          name="pack_size"
          defaultValue={product?.pack_size}
          placeholder="e.g. 5 kg"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Default price (Rs)"
          name="default_price"
          type="number"
          step="0.01"
          defaultValue={product?.default_price?.toString()}
          required
        />
        <Field label="Category" name="category" defaultValue={product?.category ?? ""} />
      </div>
    </div>
  );
}
