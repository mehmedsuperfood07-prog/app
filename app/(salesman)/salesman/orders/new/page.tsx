import Link from "next/link";
import { redirect } from "next/navigation";
import { listMyClients } from "@/lib/clients";
import { getClientForOrder, listProductsWithPricingForClient } from "@/lib/orders";
import { createOrderAction } from "@/lib/actions/orders";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; error?: string }>;
}) {
  const { client: clientId, error } = await searchParams;

  if (!clientId) {
    const clients = await listMyClients({});
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          New Order
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Choose a client to start.
        </p>
        <div className="space-y-2">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/salesman/orders/new?client=${c.id}`}
              className="block rounded-lg border border-zinc-200 p-3 text-sm hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const client = await getClientForOrder(clientId);
  if (!client) redirect("/salesman/orders/new");

  const products = await listProductsWithPricingForClient(clientId);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          New Order — {client.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {client.area?.name ?? "No area"} · Balance Rs {client.current_balance}
          {client.credit_limit > 0 && ` · Credit limit Rs ${client.credit_limit}`}
        </p>
        <Link
          href="/salesman/orders/new"
          className="mt-1 inline-block text-xs text-zinc-500 underline"
        >
          Choose a different client
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {products.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No active products in the catalog yet.
        </p>
      ) : (
        <form action={createOrderAction} className="space-y-4">
          <input type="hidden" name="client_id" value={clientId} />

          <div className="space-y-2">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="text-sm">
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {p.name}
                    {p.variant ? ` — ${p.variant}` : ""}
                  </div>
                  <div className="text-zinc-500">
                    {p.pack_size} {p.unit} · Rs {p.price}
                  </div>
                </div>
                <input
                  type="number"
                  name={`qty_${p.id}`}
                  min="0"
                  step="1"
                  defaultValue="0"
                  className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Place order
          </button>
        </form>
      )}
    </div>
  );
}
