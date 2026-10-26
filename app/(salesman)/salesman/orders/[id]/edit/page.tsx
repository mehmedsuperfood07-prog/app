import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderForEditing } from "@/lib/orders";
import { editOrderAction } from "@/lib/actions/orders";
import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";
import { OrderForm } from "@/components/order-form";

export default async function SalesmanEditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderForEditing(id);
  if (!order) notFound();

  const header = (
    <PageHeader
      title="Edit order"
      subtitle={order.client.name}
      backHref={`/salesman/orders/${id}`}
      backLabel="Order"
    />
  );

  // The database enforces this too; the salesman can change an order only
  // until a rider is assigned (the invoice is raised at that point).
  if (order.status !== "placed") {
    return (
      <div>
        {header}
        <Card className="text-sm text-zinc-700 dark:text-zinc-300">
          {order.status === "out_for_delivery"
            ? "A rider already has this order, so only the office can change it now. Call the office with the correction."
            : "This order can't be changed any more."}{" "}
          <Link href={`/salesman/orders/${id}`} className="font-semibold text-accent underline">
            Back to the order
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {header}
      <OrderForm
        client={{
          name: order.client.name,
          balance: order.client.balance,
          creditLimit: order.client.creditLimit,
        }}
        products={order.products}
        initial={{ lines: order.lines, deliveryDate: order.expectedDeliveryDate }}
        action={editOrderAction.bind(null, id)}
        redirectBase="/salesman/orders/"
        submitLabel="Save changes"
        pendingLabel="Saving…"
        refreshDeviceCache
      />
    </div>
  );
}
