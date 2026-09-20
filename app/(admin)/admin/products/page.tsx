import { ChevronDown, Plus } from "lucide-react";
import { listProducts } from "@/lib/products";
import { PRODUCT_UNITS } from "@/lib/constants";
import { formatRs } from "@/lib/format";
import {
  createProductAction,
  updateProductAction,
  toggleProductActiveAction,
} from "@/lib/actions/products";
import { ActionForm } from "@/components/action-form";
import { Field, SelectField } from "@/components/form-field";
import { PageHeader } from "@/components/mobile/page-header";
import { ProductIcon } from "@/components/mobile/product-icon";
import { StatusPill } from "@/components/mobile/status-pill";
import { SubmitButton } from "@/components/mobile/submit-button";

const detailsClasses =
  "group overflow-hidden rounded-2xl border border-zinc-200/80 bg-surface shadow-sm dark:border-zinc-800";

export default async function ProductsPage() {
  const products = await listProducts();

  return (
    <div>
      <PageHeader title="Products" subtitle="The default price list" />

      <details className={`${detailsClasses} mb-4`}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <span className="flex items-center gap-1.5">
            <Plus size={16} className="text-accent" /> Add product
          </span>
          <ChevronDown
            size={16}
            className="text-zinc-400 transition-transform group-open:rotate-180"
          />
        </summary>
        <ActionForm
          action={createProductAction}
          resetOnSuccess
          className="space-y-3 border-t border-zinc-100 p-4 dark:border-zinc-800"
        >
          <ProductFields />
          <SubmitButton pendingLabel="Adding…">Add product</SubmitButton>
        </ActionForm>
      </details>

      <div className="grid items-start gap-2.5 lg:grid-cols-2">
        {products.map((p) => (
          <details key={p.id} className={detailsClasses}>
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm">
              <ProductIcon name={p.name} unit={p.unit} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="line-clamp-2 font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                    {p.name}
                    {p.variant ? ` — ${p.variant}` : ""}
                  </span>
                  {!p.active && <StatusPill tone="neutral">Inactive</StatusPill>}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {p.pack_size} {p.unit}
                  {p.category ? ` · ${p.category}` : ""}
                </div>
              </div>
              <span className="shrink-0 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                {formatRs(p.default_price)}
              </span>
              <ChevronDown
                size={16}
                className="shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="border-t border-zinc-100 px-4 py-4 dark:border-zinc-800">
              <ActionForm action={updateProductAction} className="space-y-3">
                <input type="hidden" name="id" value={p.id} />
                <ProductFields product={p} />
                <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
              </ActionForm>
              <ActionForm
                action={toggleProductActiveAction}
                className="mt-3"
                confirmMessage={
                  p.active
                    ? `Deactivate ${p.name}? Salesmen won't be able to order it until it's activated again.`
                    : undefined
                }
              >
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="active" value={(!p.active).toString()} />
                <SubmitButton variant="outline" pendingLabel="Updating…">
                  {p.active ? "Deactivate" : "Activate"}
                </SubmitButton>
              </ActionForm>
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
