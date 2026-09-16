"use server";

import { redirect } from "next/navigation";
import { createOrder, type OrderLineInput } from "@/lib/orders";

export async function createOrderAction(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const items: OrderLineInput[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("qty_")) continue;
    const productId = key.slice(4);
    const quantity = Number(value);
    if (!quantity || quantity <= 0) continue;

    items.push({ product_id: productId, quantity });
  }

  let orderId: string;
  try {
    orderId = await createOrder(clientId, items);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not place order.";
    redirect(
      `/salesman/orders/new?client=${clientId}&error=${encodeURIComponent(message)}`,
    );
  }

  redirect(`/salesman/orders/${orderId}`);
}
