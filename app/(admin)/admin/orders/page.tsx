import { listOrdersNeedingAttention } from "@/lib/deliveries";
import { listActiveRiders } from "@/lib/staff";
import { assignRiderAction } from "@/lib/actions/deliveries";
import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";
import { DeliveryStatusPill } from "@/components/mobile/status-pill";
import { AlertCircle } from "lucide-react";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [orders, riders] = await Promise.all([
    listOrdersNeedingAttention(),
    listActiveRiders(),
  ]);

  const unassigned = orders.filter((o) => o.status === "placed");
  const outForDelivery = orders.filter((o) => o.status === "out_for_delivery");

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Placed orders waiting for a rider, and deliveries in progress"
      />

      {error && (
        <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
          Needs a rider ({unassigned.length})
        </h2>
        {unassigned.length === 0 && (
          <p className="text-sm text-zinc-500">Nothing waiting on a rider.</p>
        )}
        <div className="space-y-2.5">
          {unassigned.map((o) => (
            <Card key={o.id}>
              <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                {o.client?.name ?? "Unknown client"}
              </div>
              <div className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                {o.salesman?.full_name ?? "Unknown salesman"} ·{" "}
                {new Date(o.created_at).toLocaleString()}
              </div>
              <form action={assignRiderAction} className="flex items-center gap-2">
                <input type="hidden" name="order_id" value={o.id} />
                <select
                  name="rider_id"
                  required
                  className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-surface px-3 py-2 text-sm dark:border-zinc-700"
                >
                  <option value="">Choose rider…</option>
                  {riders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground active:bg-accent/90"
                >
                  Assign
                </button>
              </form>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
          Out for delivery ({outForDelivery.length})
        </h2>
        {outForDelivery.length === 0 && (
          <p className="text-sm text-zinc-500">Nothing out for delivery.</p>
        )}
        <div className="space-y-2.5">
          {outForDelivery.map((o) => (
            <Card key={o.id} className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {o.client?.name ?? "Unknown client"}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Rider: {o.rider?.full_name ?? "Unassigned"}
                </div>
              </div>
              {o.delivery_status && <DeliveryStatusPill status={o.delivery_status} />}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
