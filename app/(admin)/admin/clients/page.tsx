import {
  listClients,
  CUSTOMER_TYPES,
  CUSTOMER_TYPE_LABELS,
  type ClientRecord,
} from "@/lib/clients";
import { listAreas } from "@/lib/areas";
import { listActiveSalesmen } from "@/lib/staff";
import {
  createClientAction,
  updateClientAction,
  toggleClientActiveAction,
} from "@/lib/actions/clients";
import { Field, SelectField } from "@/components/form-field";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [clients, areas, salesmen] = await Promise.all([
    listClients(),
    listAreas(),
    listActiveSalesmen(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Clients
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Every store, bakery, or distributor the business sells to — across
          all salesmen.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <details className="max-w-lg rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <summary className="cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Add client
        </summary>
        <form action={createClientAction} className="mt-4 space-y-3">
          <ClientFields areas={areas} salesmen={salesmen} />
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Add client
          </button>
        </form>
      </details>

      <div className="max-w-3xl space-y-2">
        {clients.map((c) => (
          <details
            key={c.id}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm">
              <span className="flex flex-wrap gap-4">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {c.name}
                </span>
                <span className="text-zinc-500">
                  {CUSTOMER_TYPE_LABELS[c.customer_type]}
                </span>
                <span className="text-zinc-500">{c.area?.name ?? "No area"}</span>
                <span className="text-zinc-500">
                  {c.salesman?.full_name ?? "Unassigned"}
                </span>
                <span className="text-zinc-500">
                  Balance Rs {c.current_balance}
                </span>
              </span>
              <span
                className={
                  c.active ? "text-xs text-green-600" : "text-xs text-zinc-400"
                }
              >
                {c.active ? "Active" : "Inactive"}
              </span>
            </summary>
            <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
              <form action={updateClientAction} className="space-y-3">
                <input type="hidden" name="id" value={c.id} />
                <ClientFields client={c} areas={areas} salesmen={salesmen} />
                <button
                  type="submit"
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Save changes
                </button>
              </form>
              <form action={toggleClientActiveAction} className="mt-3">
                <input type="hidden" name="id" value={c.id} />
                <input
                  type="hidden"
                  name="active"
                  value={(!c.active).toString()}
                />
                <button
                  type="submit"
                  className="text-xs text-zinc-600 underline dark:text-zinc-400"
                >
                  {c.active ? "Deactivate" : "Activate"}
                </button>
              </form>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function ClientFields({
  client,
  areas,
  salesmen,
}: {
  client?: ClientRecord;
  areas: { id: string; name: string }[];
  salesmen: { id: string; full_name: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Name" name="name" defaultValue={client?.name} required />
      <SelectField
        label="Customer type"
        name="customer_type"
        defaultValue={client?.customer_type ?? "general_store"}
      >
        {CUSTOMER_TYPES.map((t) => (
          <option key={t} value={t}>
            {CUSTOMER_TYPE_LABELS[t]}
          </option>
        ))}
      </SelectField>
      <div className="col-span-2">
        <Field
          label="Address"
          name="address"
          defaultValue={client?.address ?? ""}
        />
      </div>
      <Field label="Phone" name="phone" defaultValue={client?.phone ?? ""} />
      <SelectField
        label="Area"
        name="area_id"
        defaultValue={client?.area?.id ?? ""}
      >
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
        defaultValue={client?.credit_limit?.toString() ?? "0"}
        required
      />
      <SelectField
        label="Assigned salesman"
        name="assigned_salesman_id"
        defaultValue={client?.salesman?.id ?? ""}
      >
        <option value="">Unassigned</option>
        {salesmen.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name}
          </option>
        ))}
      </SelectField>
    </div>
  );
}
