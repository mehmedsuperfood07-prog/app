import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from "@/lib/clients";
import { listMyAreas } from "@/lib/areas";
import { createMyClientAction } from "@/lib/actions/clients";
import { Field, SelectField } from "@/components/form-field";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const areas = await listMyAreas();

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          New Client
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          This client is usable immediately — no approval needed.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form action={createMyClientAction} className="space-y-3">
        <Field label="Name" name="name" required />
        <SelectField
          label="Customer type"
          name="customer_type"
          defaultValue="general_store"
        >
          {CUSTOMER_TYPES.map((t) => (
            <option key={t} value={t}>
              {CUSTOMER_TYPE_LABELS[t]}
            </option>
          ))}
        </SelectField>
        <Field label="Address" name="address" />
        <Field label="Phone" name="phone" />
        <SelectField label="Area" name="area_id">
          <option value="">No area</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
        <Field
          label="Credit limit (Rs)"
          name="credit_limit"
          type="number"
          step="0.01"
          defaultValue="0"
          required
        />
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Add client
        </button>
      </form>
    </div>
  );
}
