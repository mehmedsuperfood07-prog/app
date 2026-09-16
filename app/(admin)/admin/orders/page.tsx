import { listOrdersNeedingAttention, DELIVERY_STATUS_LABELS } from "@/lib/deliveries";
import { listActiveRiders } from "@/lib/staff";
import { assignRiderAction } from "@/lib/actions/deliveries";

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
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Orders
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Placed orders waiting for a rider, and deliveries in progress.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Needs a rider ({unassigned.length})
        </h2>
        {unassigned.length === 0 && (
          <p className="text-sm text-zinc-500">Nothing waiting on a rider.</p>
        )}
        <div className="space-y-2">
          {unassigned.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-50">
                  {o.client?.name ?? "Unknown client"}
                </div>
                <div className="text-xs text-zinc-500">
                  {o.salesman?.full_name ?? "Unknown salesman"} ·{" "}
                  {new Date(o.created_at).toLocaleString()}
                </div>
              </div>
              <form action={assignRiderAction} className="flex items-center gap-2">
                <input type="hidden" name="order_id" value={o.id} />
                <select
                  name="rider_id"
                  required
                  className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
                  className="rounded bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Assign
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Out for delivery ({outForDelivery.length})
        </h2>
        {outForDelivery.length === 0 && (
          <p className="text-sm text-zinc-500">Nothing out for delivery.</p>
        )}
        <div className="space-y-2">
          {outForDelivery.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-50">
                  {o.client?.name ?? "Unknown client"}
                </div>
                <div className="text-xs text-zinc-500">
                  Rider: {o.rider?.full_name ?? "Unassigned"}
                </div>
              </div>
              <span className="text-xs text-zinc-500">
                {o.delivery_status
                  ? DELIVERY_STATUS_LABELS[o.delivery_status]
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
