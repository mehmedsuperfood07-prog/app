import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDeliveryDetail,
  DELIVERY_STATUS_LABELS,
  type DeliveryStatus,
} from "@/lib/deliveries";
import { advanceDeliveryAction } from "@/lib/actions/deliveries";

const NEXT_ACTION_LABEL: Record<DeliveryStatus, string | null> = {
  assigned: "Mark picked up",
  picked_up: "Mark on the way",
  on_the_way: "Mark delivered",
  delivered: null,
};

export default async function DeliveryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const delivery = await getDeliveryDetail(id);
  if (!delivery) notFound();

  const nextLabel = NEXT_ACTION_LABEL[delivery.delivery_status];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/rider"
          className="text-xs text-zinc-500 underline"
        >
          Back to my deliveries
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {delivery.client?.name ?? "Unknown client"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {DELIVERY_STATUS_LABELS[delivery.delivery_status]}
        </p>
        {delivery.client?.address && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {delivery.client.address}
          </p>
        )}
        {delivery.client?.phone && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {delivery.client.phone}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Product</th>
            <th className="py-2">Qty</th>
          </tr>
        </thead>
        <tbody>
          {delivery.items.map((item) => (
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
            </tr>
          ))}
        </tbody>
      </table>

      {nextLabel && (
        <form action={advanceDeliveryAction}>
          <input type="hidden" name="order_id" value={delivery.id} />
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {nextLabel}
          </button>
        </form>
      )}
    </div>
  );
}
