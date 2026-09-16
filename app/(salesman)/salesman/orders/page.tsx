import Link from "next/link";
import { listOrdersForSalesman } from "@/lib/orders";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_sync: "Pending sync",
  placed: "Placed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default async function OrdersPage() {
  const orders = await listOrdersForSalesman();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          My Orders
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Every order you&apos;ve placed.
        </p>
      </div>

      <div className="space-y-2">
        {orders.length === 0 && (
          <p className="text-sm text-zinc-500">No orders yet.</p>
        )}
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/salesman/orders/${o.id}`}
            className="block rounded-lg border border-zinc-200 p-4 text-sm hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {o.client?.name ?? "Unknown client"}
              </span>
              <span className="text-xs text-zinc-500">
                {STATUS_LABELS[o.status] ?? o.status}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
              <span>{new Date(o.created_at).toLocaleString()}</span>
              <span>Rs {o.total}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
