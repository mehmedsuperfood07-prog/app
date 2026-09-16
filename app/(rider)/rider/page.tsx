import Link from "next/link";
import { listMyDeliveries, DELIVERY_STATUS_LABELS } from "@/lib/deliveries";

export default async function RiderHome() {
  const deliveries = await listMyDeliveries();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          My Deliveries
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Orders assigned to you that haven&apos;t been delivered yet.
        </p>
      </div>

      <div className="space-y-2">
        {deliveries.length === 0 && (
          <p className="text-sm text-zinc-500">
            No deliveries assigned right now.
          </p>
        )}
        {deliveries.map((d) => (
          <Link
            key={d.id}
            href={`/rider/${d.id}`}
            className="block rounded-lg border border-zinc-200 p-4 text-sm hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {d.client?.name ?? "Unknown client"}
              </span>
              <span className="text-xs text-zinc-500">
                {DELIVERY_STATUS_LABELS[d.delivery_status]}
              </span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {d.client?.address ?? "No address on file"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
