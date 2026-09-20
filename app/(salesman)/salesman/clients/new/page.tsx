import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from "@/lib/constants";
import { listMyAreas } from "@/lib/areas";
import { createMyClientAction } from "@/lib/actions/clients";
import { ActionForm } from "@/components/action-form";
import { Field, SelectField } from "@/components/form-field";
import { PageHeader } from "@/components/mobile/page-header";
import { SubmitButton } from "@/components/mobile/submit-button";
import { BottomActionBar } from "@/components/mobile/bottom-action-bar";

export default async function NewClientPage() {
  const areas = await listMyAreas();

  return (
    <div>
      <PageHeader
        title="New Client"
        subtitle="Usable immediately — no approval needed"
        backHref="/salesman"
        backLabel="My Clients"
      />

      <ActionForm action={createMyClientAction} className="space-y-3.5 pb-24">
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
        <Field label="Phone" name="phone" type="tel" />
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

        <BottomActionBar>
          <SubmitButton variant="bar" pendingLabel="Adding client…">
            Add client
          </SubmitButton>
        </BottomActionBar>
      </ActionForm>
    </div>
  );
}
