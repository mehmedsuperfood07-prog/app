"use server";

import { revalidatePath } from "next/cache";
import { assignRiderToOrder, advanceDelivery } from "@/lib/deliveries";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

const ADVANCE_MESSAGES = {
  picked_up: "Marked as picked up.",
  on_the_way: "Marked as on the way.",
  delivered: "Delivered — invoice generated.",
} as const;

export async function assignRiderAction(formData: FormData): Promise<ActionResult> {
  const orderId = String(formData.get("order_id") ?? "");
  const riderId = String(formData.get("rider_id") ?? "");

  try {
    await assignRiderToOrder(orderId, riderId);
  } catch (err) {
    return fail(err, "Could not assign rider.");
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return ok("Rider assigned.");
}

export async function advanceDeliveryAction(formData: FormData): Promise<ActionResult> {
  const orderId = String(formData.get("order_id") ?? "");

  let next: keyof typeof ADVANCE_MESSAGES;
  try {
    next = await advanceDelivery(orderId);
  } catch (err) {
    return fail(err, "Could not update status.");
  }

  revalidatePath(`/rider/${orderId}`);
  revalidatePath("/rider");
  return ok(ADVANCE_MESSAGES[next]);
}
