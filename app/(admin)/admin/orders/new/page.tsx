import { notFound } from "next/navigation";
import { MapPin, Search, UserRound } from "lucide-react";
import { listClients } from "@/lib/clients";
import { listActiveSalesmen } from "@/lib/staff";
import { listProductsWithPricingForClient } from "@/lib/orders";
import { formatRs } from "@/lib/format";
import { PageHeader } from "@/components/mobile/page-header";
import { CardLink } from "@/components/mobile/card";
import { OrderForm } from "@/components/order-form";
import { adminCreateOrderAction } from "@/lib/actions/orders";

export default async function AdminNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; q?: string }>;
}) {
  const { client: clientId, q } = await searchParams;
  const clients = (await listClients()).filter((c) => c.active);

  if (!clientId) {
    const query = (q ?? "").trim().toLowerCase();
    const shown = query ? clients.filter((c) => c.name.toLowerCase().includes(query)) : clients;

    return (
      <div>
        <PageHeader
          title="New order"
          subtitle="Choose the client"
          backHref="/admin/orders"
          backLabel="Orders"
        />
        <form className="relative mb-4" action="/admin/orders/new">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search clients…"
            aria-label="Search clients"
            className="w-full rounded-xl border border-zinc-200 bg-surface py-2.5 pl-10 pr-3 text-sm shadow-sm dark:border-zinc-800"
          />
        </form>
        {shown.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            {clients.length === 0 ? "No active clients yet." : "No clients match your search."}
          </p>
        ) : (
          <div className="grid items-start gap-2.5 lg:grid-cols-2">
            {shown.map((c) => (
              <CardLink key={c.id} href={`/admin/orders/new?client=${c.id}`}>
                <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{c.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {c.area?.name ?? "No area"}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserRound size={11} /> {c.salesman?.full_name ?? "No salesman"}
                  </span>
                  <span>Balance {formatRs(c.current_balance)}</span>
                </p>
              </CardLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  const client = clients.find((c) => c.id === clientId);
  if (!client) notFound();
  const [products, salesmen] = await Promise.all([
    listProductsWithPricingForClient(client.id),
    listActiveSalesmen(),
  ]);

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={
          <>
            {client.area?.name ?? "No area"} · Balance {formatRs(client.current_balance)}
            {client.credit_limit > 0 && ` · Limit ${formatRs(client.credit_limit)}`}
          </>
        }
        backHref="/admin/orders/new"
        backLabel="Choose a different client"
      />
      <OrderForm
        client={{
          name: client.name,
          balance: client.current_balance,
          creditLimit: client.credit_limit,
          salesmanId: client.salesman?.id ?? null,
        }}
        products={products}
        salesmen={salesmen}
        action={adminCreateOrderAction.bind(null, client.id)}
        redirectBase="/admin/orders/"
      />
    </div>
  );
}
