import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/orders";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_sync: "Pending sync",
  placed: "Placed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

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
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {order.client?.name ?? "Unknown client"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {new Date(order.created_at).toLocaleString()} ·{" "}
          {STATUS_LABELS[order.status] ?? order.status}
        </p>
        {order.client?.address && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {order.client.address}
          </p>
        )}
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Product</th>
            <th className="py-2">Qty</th>
            <th className="py-2">Unit price</th>
            <th className="py-2">Line total</th>
          </tr>
        </thead>
        <tbody>
          {order.order_items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-zinc-100 dark:border-zinc-900"
            >
              <td className="py-2 text-zinc-900 dark:text-zinc-50">
                {item.product?.name ?? "Unknown product"}
                {item.product?.variant ? ` — ${item.product.variant}` : ""}
                <span className="text-zinc-500">
                  {" "}
                  ({item.product?.pack_size} {item.product?.unit})
                </span>
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">
                {item.quantity}
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">
                Rs {item.unit_price_at_order_time}
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">
                Rs {item.quantity * item.unit_price_at_order_time}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Total: Rs {total}
      </p>
    </div>
  );
}
