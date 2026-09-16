import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/orders";
import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";
import { OrderStatusPill } from "@/components/mobile/status-pill";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const total = order.order_items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_at_order_time,
    0,
  );

  return (
    <div>
      <PageHeader
        title={order.client?.name ?? "Unknown client"}
        backHref="/salesman/orders"
        backLabel="My Orders"
        subtitle={
          <>
            {new Date(order.created_at).toLocaleString()}
            {order.client?.address && <> · {order.client.address}</>}
          </>
        }
        action={<OrderStatusPill status={order.status} />}
      />

      <div className="space-y-2.5">
        {order.order_items.map((item) => (
          <Card key={item.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                {item.product?.name ?? "Unknown product"}
                {item.product?.variant ? ` — ${item.product.variant}` : ""}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.product?.pack_size} {item.product?.unit} · {item.quantity} × Rs{" "}
                {item.unit_price_at_order_time}
              </p>
            </div>
            <span className="shrink-0 font-semibold text-zinc-900 dark:text-zinc-50">
              Rs {item.quantity * item.unit_price_at_order_time}
            </span>
          </Card>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-zinc-900 px-4 py-3.5 text-white dark:bg-zinc-800">
        <span className="text-sm font-medium">Total</span>
        <span className="text-lg font-bold">Rs {total}</span>
      </div>
    </div>
  );
}
