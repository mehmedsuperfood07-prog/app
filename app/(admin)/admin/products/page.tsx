import { listProducts, PRODUCT_UNITS } from "@/lib/products";
import {
  createProductAction,
  updateProductAction,
  toggleProductActiveAction,
} from "@/lib/actions/products";
import { Field, SelectField } from "@/components/form-field";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const products = await listProducts();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Products
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          The default price list. Client-specific overrides come in a later
          step.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <details className="max-w-md rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <summary className="cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Add product
        </summary>
        <form action={createProductAction} className="mt-4 space-y-3">
          <ProductFields />
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Add product
          </button>
        </form>
      </details>

      <div className="max-w-2xl space-y-2">
        {products.map((p) => (
          <details
            key={p.id}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm">
              <span className="flex flex-wrap gap-4">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {p.name}
                  {p.variant ? ` — ${p.variant}` : ""}
                </span>
                <span className="text-zinc-500">
                  {p.pack_size} {p.unit}
                </span>
                <span className="text-zinc-500">Rs {p.default_price}</span>
              </span>
              <span
                className={
                  p.active
                    ? "text-xs text-green-600"
                    : "text-xs text-zinc-400"
                }
              >
                {p.active ? "Active" : "Inactive"}
              </span>
            </summary>
            <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
              <form action={updateProductAction} className="space-y-3">
                <input type="hidden" name="id" value={p.id} />
                <ProductFields product={p} />
                <button
                  type="submit"
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Save changes
                </button>
              </form>
              <form action={toggleProductActiveAction} className="mt-3">
                <input type="hidden" name="id" value={p.id} />
                <input
                  type="hidden"
                  name="active"
                  value={(!p.active).toString()}
                />
                <button
                  type="submit"
                  className="text-xs text-zinc-600 underline dark:text-zinc-400"
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
    <div className="grid grid-cols-2 gap-3">
      <Field label="Name" name="name" defaultValue={product?.name} required />
      <Field
        label="Variant"
        name="variant"
        defaultValue={product?.variant ?? ""}
      />
      <SelectField
        label="Unit"
        name="unit"
        defaultValue={product?.unit ?? "kg"}
      >
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
      <Field
        label="Default price (Rs)"
        name="default_price"
        type="number"
        step="0.01"
        defaultValue={product?.default_price?.toString()}
        required
      />
      <Field
        label="Category"
        name="category"
        defaultValue={product?.category ?? ""}
      />
    </div>
  );
}
