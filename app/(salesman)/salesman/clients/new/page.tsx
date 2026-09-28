import { listMyAreas } from "@/lib/areas";
import { createMyClientAction } from "@/lib/actions/clients";
import { ActionForm } from "@/components/action-form";
import { ClientTypeFields } from "@/components/client-type-fields";
import { PaymentTermFields } from "@/components/payment-term-fields";
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
        <ClientTypeFields />
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
        <PaymentTermFields />

        <div className="border-t border-zinc-200 pt-3.5 dark:border-zinc-800">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Concerned person
          </p>
          <div className="space-y-3.5">
            <Field label="Contact name" name="contact_person_name" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Designation" name="contact_person_designation" />
              <Field label="Mobile number" name="contact_person_phone" type="tel" />
            </div>
          </div>
        </div>

        <BottomActionBar>
          <SubmitButton variant="bar" pendingLabel="Adding client…">
            Add client
          </SubmitButton>
        </BottomActionBar>
      </ActionForm>
    </div>
  );
}
