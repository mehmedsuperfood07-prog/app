"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assignRiderToOrder, advanceDelivery } from "@/lib/deliveries";

export async function assignRiderAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  const riderId = String(formData.get("rider_id") ?? "");

  try {
    await assignRiderToOrder(orderId, riderId);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not assign rider.";
    redirect(`/admin/orders?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/orders");
}

export async function advanceDeliveryAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");

  try {
    await advanceDelivery(orderId);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update status.";
    redirect(`/rider/${orderId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/rider/${orderId}`);
}
