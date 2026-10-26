import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderForEditing } from "@/lib/orders";
import { editOrderAction } from "@/lib/actions/orders";
import { formatRs } from "@/lib/format";
import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";
import { OrderForm } from "@/components/order-form";

export default async function AdminEditOrderPage({
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
      backHref={`/admin/orders/${id}`}
      backLabel="Order"
    />
  );

  if (order.status !== "placed" && order.status !== "out_for_delivery") {
    return (
      <div>
        {header}
        <Card className="text-sm text-zinc-700 dark:text-zinc-300">
          {order.status === "delivered"
            ? "This order has been delivered, so it can't be edited."
            : "This order was cancelled, so it can't be edited."}{" "}
          <Link href={`/admin/orders/${id}`} className="font-semibold text-accent underline">
            Back to the order
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {header}
      {order.invoice && (
        <Card className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
          This order already has invoice <b>{order.invoice.number}</b> ({formatRs(order.invoice.amount)}).
          If you change the products, quantities or rates, it is marked void and a new invoice is
          generated for the new total. Changing only the date keeps it.
          {order.status === "out_for_delivery" && " The rider is told to check the items."}
        </Card>
      )}
      <OrderForm
        client={{
          name: order.client.name,
          balance: order.client.balance,
          creditLimit: order.client.creditLimit,
        }}
        products={order.products}
        initial={{ lines: order.lines, deliveryDate: order.expectedDeliveryDate }}
        alreadyCharged={order.invoice?.amount ?? 0}
        action={editOrderAction.bind(null, id)}
        redirectBase="/admin/orders/"
        submitLabel="Save changes"
        pendingLabel="Saving…"
      />
    </div>
  );
}
