import { ChevronDown, AlertCircle, Plus } from "lucide-react";
import {
  listClients,
  type ClientRecord,
} from "@/lib/clients";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from "@/lib/constants";
import { listAreas } from "@/lib/areas";
import { listActiveSalesmen } from "@/lib/staff";
import {
  createClientAction,
  updateClientAction,
  toggleClientActiveAction,
} from "@/lib/actions/clients";
import { Field, SelectField } from "@/components/form-field";
import { PageHeader } from "@/components/mobile/page-header";
import { StatusPill } from "@/components/mobile/status-pill";

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
    <div>
      <PageHeader
        title="Clients"
        subtitle="Every store, bakery, or distributor the business sells to"
      />

      {error && (
        <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      <details className="group mb-4 overflow-hidden rounded-2xl border border-zinc-200/80 bg-surface shadow-sm dark:border-zinc-800">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <span className="flex items-center gap-1.5">
            <Plus size={16} className="text-accent" /> Add client
          </span>
          <ChevronDown size={16} className="text-zinc-400 group-open:rotate-180" />
        </summary>
        <form action={createClientAction} className="space-y-3 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <ClientFields areas={areas} salesmen={salesmen} />
          <button
            type="submit"
            className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-foreground active:bg-accent/90"
          >
            Add client
          </button>
        </form>
      </details>

      <div className="space-y-2.5">
        {clients.map((c) => (
          <details
            key={c.id}
            className="group overflow-hidden rounded-2xl border border-zinc-200/80 bg-surface shadow-sm dark:border-zinc-800"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                    {c.name}
                  </span>
                  {!c.active && <StatusPill tone="neutral">Inactive</StatusPill>}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{CUSTOMER_TYPE_LABELS[c.customer_type]}</span>
                  <span>· {c.area?.name ?? "No area"}</span>
                  <span>· Rs {c.current_balance}</span>
                </div>
              </div>
              <ChevronDown size={16} className="shrink-0 text-zinc-400 group-open:rotate-180" />
            </summary>
            <div className="border-t border-zinc-100 px-4 py-4 dark:border-zinc-800">
              <form action={updateClientAction} className="space-y-3">
                <input type="hidden" name="id" value={c.id} />
                <ClientFields client={c} areas={areas} salesmen={salesmen} />
                <button
                  type="submit"
                  className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-foreground active:bg-accent/90"
                >
                  Save changes
                </button>
              </form>
              <form action={toggleClientActiveAction} className="mt-3">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="active" value={(!c.active).toString()} />
                <button
                  type="submit"
                  className="w-full rounded-full border border-zinc-300 py-2.5 text-sm font-medium text-zinc-600 active:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:active:bg-zinc-900"
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
    <div className="space-y-3">
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
      <Field label="Address" name="address" defaultValue={client?.address ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone" name="phone" defaultValue={client?.phone ?? ""} />
        <SelectField label="Area" name="area_id" defaultValue={client?.area?.id ?? ""}>
          <option value="">No area</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Credit limit (Rs)"
          name="credit_limit"
          type="number"
          step="0.01"
          defaultValue={client?.credit_limit?.toString() ?? "0"}
          required
        />
        <SelectField
          label="Salesman"
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
    </div>
  );
}
