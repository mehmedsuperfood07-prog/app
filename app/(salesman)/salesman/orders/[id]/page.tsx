import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/orders";
import { formatDateTime, formatRs } from "@/lib/format";
import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";
import { ProductIcon } from "@/components/mobile/product-icon";
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
            {formatDateTime(order.created_at)}
            {order.client?.address && <> · {order.client.address}</>}
          </>
        }
        action={<OrderStatusPill status={order.status} />}
      />

      <div className="space-y-2.5">
        {order.order_items.map((item) => (
          <Card key={item.id} className="flex items-center gap-3">
            <ProductIcon
              name={item.product?.name ?? ""}
              unit={item.product?.unit ?? ""}
              className="h-10 w-10"
            />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                {item.product?.name ?? "Unknown product"}
                {item.product?.variant ? ` — ${item.product.variant}` : ""}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.product?.pack_size} {item.product?.unit} · {item.quantity} ×{" "}
                {formatRs(item.unit_price_at_order_time)}
              </p>
            </div>
            <span className="shrink-0 font-semibold text-zinc-900 dark:text-zinc-50">
              {formatRs(item.quantity * item.unit_price_at_order_time)}
            </span>
          </Card>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-br from-[#1b7a3e] to-[#1b3a12] px-4 py-3.5 text-white">
        <span className="text-sm font-medium text-white/85">Total</span>
        <span className="text-lg font-bold">{formatRs(total)}</span>
      </div>
    </div>
  );
}
