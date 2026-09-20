import { ChevronDown, Plus } from "lucide-react";
import { listClients, type ClientRecord } from "@/lib/clients";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from "@/lib/constants";
import { listAreas } from "@/lib/areas";
import { listActiveSalesmen } from "@/lib/staff";
import { formatRs } from "@/lib/format";
import {
  createClientAction,
  updateClientAction,
  toggleClientActiveAction,
} from "@/lib/actions/clients";
import { ActionForm } from "@/components/action-form";
import { FilterableList } from "@/components/filterable-list";
import { Field, SelectField } from "@/components/form-field";
import { PageHeader } from "@/components/mobile/page-header";
import { StatusPill } from "@/components/mobile/status-pill";
import { SubmitButton } from "@/components/mobile/submit-button";

const detailsClasses =
  "group overflow-hidden rounded-2xl border border-zinc-200/80 bg-surface shadow-sm dark:border-zinc-800";

export default async function ClientsPage() {
  const [clients, areas, salesmen] = await Promise.all([
    listClients(),
    listAreas(),
    listActiveSalesmen(),
  ]);

  const items = clients.map((c) => ({
    key: c.id,
    text: [
      c.name,
      c.area?.name,
      c.salesman?.full_name,
      CUSTOMER_TYPE_LABELS[c.customer_type],
      c.phone,
    ]
      .filter(Boolean)
      .join(" "),
    node: <ClientCard client={c} areas={areas} salesmen={salesmen} />,
  }));

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} store${clients.length === 1 ? "" : "s"}, bakeries and distributors`}
      />

      <details className={`${detailsClasses} mb-4`}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <span className="flex items-center gap-1.5">
            <Plus size={16} className="text-accent" /> Add client
          </span>
          <ChevronDown
            size={16}
            className="text-zinc-400 transition-transform group-open:rotate-180"
          />
        </summary>
        <ActionForm
          action={createClientAction}
          resetOnSuccess
          className="space-y-3 border-t border-zinc-100 p-4 dark:border-zinc-800"
        >
          <ClientFields areas={areas} salesmen={salesmen} />
          <SubmitButton pendingLabel="Adding…">Add client</SubmitButton>
        </ActionForm>
      </details>

      <FilterableList
        items={items}
        placeholder="Search clients…"
        emptyMessage="No clients match your search."
        className="grid items-start gap-2.5 lg:grid-cols-2"
      />
    </div>
  );
}

function ClientCard({
  client: c,
  areas,
  salesmen,
}: {
  client: ClientRecord;
  areas: { id: string; name: string }[];
  salesmen: { id: string; full_name: string }[];
}) {
  const overLimit = c.credit_limit > 0 && c.current_balance > c.credit_limit;
  const usedPct =
    c.credit_limit > 0 ? Math.min(100, Math.round((c.current_balance / c.credit_limit) * 100)) : 0;

  return (
    <details className={detailsClasses}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {c.name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="line-clamp-2 font-semibold leading-snug text-zinc-900 dark:text-zinc-50">{c.name}</span>
            {!c.active && <StatusPill tone="neutral">Inactive</StatusPill>}
          </div>
          <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {CUSTOMER_TYPE_LABELS[c.customer_type]} · {c.area?.name ?? "No area"}
          </div>
          {c.credit_limit > 0 && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full ${overLimit ? "bg-zinc-900 dark:bg-zinc-100" : "bg-accent"}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {formatRs(c.current_balance)}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {overLimit ? "Over limit" : c.credit_limit > 0 ? `of ${formatRs(c.credit_limit)}` : "balance"}
          </p>
        </div>
        <ChevronDown
          size={16}
          className="shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-zinc-100 px-4 py-4 dark:border-zinc-800">
        <ActionForm action={updateClientAction} className="space-y-3">
          <input type="hidden" name="id" value={c.id} />
          <ClientFields client={c} areas={areas} salesmen={salesmen} />
          <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
        </ActionForm>
        <ActionForm
          action={toggleClientActiveAction}
          className="mt-3"
          confirmMessage={c.active ? `Deactivate ${c.name}? They won't be able to receive new orders.` : undefined}
        >
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="active" value={(!c.active).toString()} />
          <SubmitButton variant="outline" pendingLabel="Updating…">
            {c.active ? "Deactivate" : "Activate"}
          </SubmitButton>
        </ActionForm>
      </div>
    </details>
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
  // A client whose salesman has since been deactivated must still show
  // that salesman as selected — otherwise saving any other edit would
  // silently reassign the client to "Unassigned".
  const currentSalesman = client?.salesman;
  const salesmanOptions =
    currentSalesman && !salesmen.some((s) => s.id === currentSalesman.id)
      ? [...salesmen, { id: currentSalesman.id, full_name: `${currentSalesman.full_name} (inactive)` }]
      : salesmen;

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
          {salesmanOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  );
}
