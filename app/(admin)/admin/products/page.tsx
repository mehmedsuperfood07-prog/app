import { ChevronDown, Plus } from "lucide-react";
import { listPackSizes, listProducts, type PackSize } from "@/lib/products";
import { formatRs } from "@/lib/format";
import {
  createProductAction,
  updateProductAction,
  toggleProductActiveAction,
  setPackSizeActiveAction,
  removePackSizeAction,
} from "@/lib/actions/products";
import { ActionForm } from "@/components/action-form";
import { UnitAndPackSize } from "@/components/pack-size-field";
import { Field } from "@/components/form-field";
import { PageHeader } from "@/components/mobile/page-header";
import { ProductIcon } from "@/components/mobile/product-icon";
import { StatusPill } from "@/components/mobile/status-pill";
import { SubmitButton } from "@/components/mobile/submit-button";

const detailsClasses =
  "group overflow-hidden rounded-2xl border border-zinc-200/80 bg-surface shadow-sm dark:border-zinc-800";

export default async function ProductsPage() {
  const [products, sizes] = await Promise.all([listProducts(), listPackSizes()]);

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
          <ProductFields sizes={sizes} />
          <SubmitButton pendingLabel="Adding…">Add product</SubmitButton>
        </ActionForm>
      </details>

      <PackSizesCard sizes={sizes} />

      <div className="grid items-start gap-2.5 lg:grid-cols-2">
        {products.map((p) => (
          <details key={p.id} className={detailsClasses}>
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm">
              <ProductIcon name={p.name} unit={p.unit} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="break-words font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
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
                <ProductFields product={p} sizes={sizes} />
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
  sizes,
}: {
  sizes: PackSize[];
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
        <UnitAndPackSize unit={product?.unit} packSize={product?.pack_size} sizes={sizes} />
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

// The office's own list of pack sizes. A size added by mistake is removed; one a product uses
// can only be hidden from the product form.
function PackSizesCard({ sizes }: { sizes: PackSize[] }) {
  const units = [...new Set(sizes.map((s) => s.unit))];
  return (
    <details className={`${detailsClasses} mb-4`}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        <span>Pack sizes</span>
        <ChevronDown size={16} className="text-zinc-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-zinc-100 p-4 dark:border-zinc-800">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          The sizes the product form offers. To add one, open Add product, choose the unit, then &ldquo;+ Add a new size&rdquo;.
        </p>
        {units.map((unit) => (
          <div key={unit}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">{unit}</div>
            <ul className="space-y-1.5">
              {sizes
                .filter((s) => s.unit === unit)
                .map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span className={`flex-1 ${s.active ? "" : "text-zinc-400 line-through"}`}>
                      {s.size} {unit}
                    </span>
                    <ActionForm action={setPackSizeActiveAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="active" value={(!s.active).toString()} />
                      <SubmitButton variant="compactOutline" pendingLabel="…">
                        {s.active ? "Hide" : "Show"}
                      </SubmitButton>
                    </ActionForm>
                    <ActionForm action={removePackSizeAction} confirmMessage={`Remove ${s.size} ${unit} from the list?`}>
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton variant="compactOutline" pendingLabel="…">
                        Remove
                      </SubmitButton>
                    </ActionForm>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
