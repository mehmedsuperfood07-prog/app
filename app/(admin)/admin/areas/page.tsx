import { X, AlertCircle } from "lucide-react";
import { listAreasWithSalesmen } from "@/lib/areas";
import { listActiveSalesmen } from "@/lib/staff";
import {
  createAreaAction,
  deleteAreaAction,
  assignSalesmanAction,
  unassignSalesmanAction,
} from "@/lib/actions/areas";
import { Field, SelectField } from "@/components/form-field";
import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";

export default async function AreasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [areas, salesmen] = await Promise.all([
    listAreasWithSalesmen(),
    listActiveSalesmen(),
  ]);

  return (
    <div>
      <PageHeader title="Areas" subtitle="Service areas and coverage" />

      {error && (
        <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      <Card className="mb-4">
        <form action={createAreaAction} className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="New area name" name="name" required />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground active:bg-accent/90"
          >
            Add
          </button>
        </form>
      </Card>

      <div className="space-y-2.5">
        {areas.map((area) => (
          <Card key={area.id}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {area.name}
              </span>
              <form action={deleteAreaAction}>
                <input type="hidden" name="id" value={area.id} />
                <button type="submit" className="text-xs font-semibold text-zinc-500 underline dark:text-zinc-400">
                  Delete
                </button>
              </form>
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
                  <form action={unassignSalesmanAction}>
                    <input type="hidden" name="area_id" value={area.id} />
                    <input type="hidden" name="salesman_id" value={s.id} />
                    <button
                      type="submit"
                      aria-label={`Remove ${s.full_name}`}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-300 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                    >
                      <X size={10} />
                    </button>
                  </form>
                </span>
              ))}
            </div>

            <form action={assignSalesmanAction} className="mt-3 flex items-end gap-2">
              <input type="hidden" name="area_id" value={area.id} />
              <div className="flex-1">
                <SelectField label="Assign salesman" name="salesman_id">
                  <option value="">Choose…</option>
                  {salesmen.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-xl border border-zinc-300 px-3.5 py-2.5 text-xs font-semibold text-zinc-700 active:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:active:bg-zinc-900"
              >
                Add
              </button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
