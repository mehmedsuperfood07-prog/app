"use server";

import { revalidatePath } from "next/cache";
import { adminUpdateDelivery, cancelOrder, createOrderAsAdmin } from "@/lib/admin-orders";
import type { AdvancedStatus } from "@/lib/deliveries";
import type { OrderLineInput } from "@/lib/orders";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export async function cancelOrderAction(formData: FormData): Promise<ActionResult> {
  const orderId = String(formData.get("order_id") ?? "");
  const reason = String(formData.get("reason") ?? "");

  try {
    await cancelOrder(orderId, reason);
  } catch (err) {
    return fail(err, "Could not cancel the order.");
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  revalidatePath("/rider");
  return ok("Order cancelled.");
}

// Called directly from the admin order form (not a <form> post), because the
// cart is a list of lines rather than flat fields.
export async function adminCreateOrderAction(input: {
  clientId: string;
  salesmanId: string;
  items: OrderLineInput[];
  expectedDeliveryDate: string;
}): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  let orderId: string;
  try {
    orderId = await createOrderAsAdmin(input);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error && err.message ? err.message : "Could not place the order.",
    };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, orderId };
}

const DELIVERY_MESSAGES: Record<AdvancedStatus, string> = {
  picked_up: "Marked as picked up.",
  on_the_way: "Marked as on the way.",
  delivered: "Marked as delivered.",
};

export async function adminDeliveryAction(formData: FormData): Promise<ActionResult> {
  const orderId = String(formData.get("order_id") ?? "");
  const status = String(formData.get("status") ?? "") as AdvancedStatus;

  try {
    await adminUpdateDelivery(orderId, status);
  } catch (err) {
    return fail(err, "Could not update the delivery.");
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin");
  revalidatePath("/rider");
  return ok(DELIVERY_MESSAGES[status] ?? "Delivery updated.");
}
