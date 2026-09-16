import { listAreasWithSalesmen } from "@/lib/areas";
import { listActiveSalesmen } from "@/lib/staff";
import {
  createAreaAction,
  deleteAreaAction,
  assignSalesmanAction,
  unassignSalesmanAction,
} from "@/lib/actions/areas";
import { Field, SelectField } from "@/components/form-field";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Areas
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Service areas and which salesmen cover each one.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form
        action={createAreaAction}
        className="flex max-w-md items-end gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex-1">
          <Field label="New area name" name="name" required />
        </div>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Add area
        </button>
      </form>

      <div className="max-w-2xl space-y-2">
        {areas.map((area) => (
          <div
            key={area.id}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {area.name}
              </span>
              <form action={deleteAreaAction}>
                <input type="hidden" name="id" value={area.id} />
                <button
                  type="submit"
                  className="text-xs text-red-600 underline"
                >
                  Delete
                </button>
              </form>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {area.salesmen.length === 0 && (
                <span className="text-xs text-zinc-500">
                  No salesman assigned yet.
                </span>
              )}
              {area.salesmen.map((s) => (
                <span
                  key={s.id}
                  className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  {s.full_name}
                  <form action={unassignSalesmanAction}>
                    <input type="hidden" name="area_id" value={area.id} />
                    <input type="hidden" name="salesman_id" value={s.id} />
                    <button type="submit" aria-label={`Remove ${s.full_name}`}>
                      ×
                    </button>
                  </form>
                </span>
              ))}
            </div>

            <form
              action={assignSalesmanAction}
              className="mt-3 flex max-w-xs items-end gap-2"
            >
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
                className="rounded border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Add
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
