import Link from "next/link";
import { listMyClients, CUSTOMER_TYPE_LABELS } from "@/lib/clients";
import { listMyAreas } from "@/lib/areas";

export default async function SalesmanHome({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; area?: string; created?: string }>;
}) {
  const { search, area, created } = await searchParams;
  const [clients, areas] = await Promise.all([
    listMyClients({ search, areaId: area }),
    listMyAreas(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          My Clients
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Pick a client to start a new order.
        </p>
      </div>

      {created && (
        <p className="text-sm text-green-600">Client added.</p>
      )}

      <form method="get" className="flex flex-wrap gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by name…"
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          name="area"
          defaultValue={area ?? ""}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All my areas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Filter
        </button>
      </form>

      <div className="max-w-2xl space-y-2">
        {clients.length === 0 && (
          <p className="text-sm text-zinc-500">No clients match yet.</p>
        )}
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/salesman/orders/new?client=${c.id}`}
            className="block rounded-lg border border-zinc-200 p-4 text-sm hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {c.name}
              </span>
              <span className="text-xs text-zinc-500">
                Balance Rs {c.current_balance}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
              <span>{CUSTOMER_TYPE_LABELS[c.customer_type]}</span>
              <span>{c.area?.name ?? "No area"}</span>
              {c.phone && <span>{c.phone}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
