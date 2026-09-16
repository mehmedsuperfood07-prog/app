import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from "@/lib/constants";
import { listMyAreas } from "@/lib/areas";
import { createMyClientAction } from "@/lib/actions/clients";
import { Field, SelectField } from "@/components/form-field";
import { PageHeader } from "@/components/mobile/page-header";
import { Button } from "@/components/mobile/button";
import { BottomActionBar } from "@/components/mobile/bottom-action-bar";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const areas = await listMyAreas();

  return (
    <div>
      <PageHeader
        title="New Client"
        subtitle="Usable immediately — no approval needed"
        backHref="/salesman"
        backLabel="My Clients"
      />

      {error && (
        <p className="mb-3 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          {error}
        </p>
      )}

      <form id="new-client-form" action={createMyClientAction} className="space-y-3.5 pb-20">
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
      </form>

      <BottomActionBar>
        <Button type="submit" form="new-client-form" className="w-full py-3.5">
          Add client
        </Button>
      </BottomActionBar>
    </div>
  );
}
