import { X, MapPin } from "lucide-react";
import { listAreasWithSalesmen } from "@/lib/areas";
import { listActiveSalesmen } from "@/lib/staff";
import {
  createAreaAction,
  deleteAreaAction,
  assignSalesmanAction,
  unassignSalesmanAction,
} from "@/lib/actions/areas";
import { ActionForm } from "@/components/action-form";
import { Field, SelectField } from "@/components/form-field";
import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";
import { SubmitButton } from "@/components/mobile/submit-button";

export default async function AreasPage() {
  const [areas, salesmen] = await Promise.all([
    listAreasWithSalesmen(),
    listActiveSalesmen(),
  ]);

  return (
    <div>
      <PageHeader
        title="Areas"
        subtitle={`${areas.length} service area${areas.length === 1 ? "" : "s"} and who covers them`}
      />

      <Card className="mb-4">
        <ActionForm action={createAreaAction} resetOnSuccess className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="New area name" name="name" required />
          </div>
          <SubmitButton variant="compact" pendingLabel="Adding…">
            Add
          </SubmitButton>
        </ActionForm>
      </Card>

      <div className="grid items-start gap-2.5 lg:grid-cols-2">
        {areas.map((area) => (
          <Card key={area.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5 font-semibold text-zinc-900 dark:text-zinc-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                  <MapPin size={17} />
                </span>
                {area.name}
              </span>
              <ActionForm
                action={deleteAreaAction}
                confirmMessage={`Delete ${area.name}? Clients in this area will be left with no area.`}
              >
                <input type="hidden" name="id" value={area.id} />
                <SubmitButton variant="link" pendingLabel="Deleting…">
                  Delete
                </SubmitButton>
              </ActionForm>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {area.salesmen.length === 0 && (
                <span className="text-xs text-zinc-500">No salesman assigned yet.</span>
              )}
              {area.salesmen.map((s) => (
                <span
                  key={s.id}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-100 py-1 pl-3 pr-1.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {s.full_name}
                  <ActionForm action={unassignSalesmanAction}>
                    <input type="hidden" name="area_id" value={area.id} />
                    <input type="hidden" name="salesman_id" value={s.id} />
                    <button
                      type="submit"
                      aria-label={`Remove ${s.full_name}`}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-300 text-zinc-600 active:bg-zinc-400 dark:bg-zinc-700 dark:text-zinc-300"
                    >
                      <X size={11} />
                    </button>
                  </ActionForm>
                </span>
              ))}
            </div>

            <ActionForm action={assignSalesmanAction} resetOnSuccess className="mt-3 flex items-end gap-2">
              <input type="hidden" name="area_id" value={area.id} />
              <div className="flex-1">
                <SelectField label="Assign salesman" name="salesman_id" required defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  {salesmen.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <SubmitButton variant="compactOutline" pendingLabel="Adding…">
                Add
              </SubmitButton>
            </ActionForm>
          </Card>
        ))}
      </div>
    </div>
  );
}
