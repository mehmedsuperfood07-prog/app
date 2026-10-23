"use server";

import { revalidatePath } from "next/cache";
import { cancelOrder } from "@/lib/admin-orders";
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
