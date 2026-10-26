"use server";

import { revalidatePath } from "next/cache";
import { adminUpdateDelivery, cancelOrder, createOrderAsAdmin } from "@/lib/admin-orders";
import { getCurrentProfile } from "@/lib/auth";
import { createInvoiceForOrder } from "@/lib/invoices";
import { editOrder, type OrderLineInput } from "@/lib/orders";
import type { AdvancedStatus } from "@/lib/deliveries";
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

// The shared order form (components/order-form.tsx) calls these directly
// rather than posting a <form>, because the cart is a list of lines. The page
// binds the client or order id first, so the form only sends the cart.
export type OrderFormInput = {
  items: OrderLineInput[];
  expectedDeliveryDate: string;
  salesmanId?: string;
};
export type OrderFormResult =
  | { ok: true; orderId: string; message: string; warning?: string }
  | { ok: false; error: string };

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export async function adminCreateOrderAction(
  clientId: string,
  input: OrderFormInput,
): Promise<OrderFormResult> {
  let orderId: string;
  try {
    orderId = await createOrderAsAdmin({
      clientId,
      salesmanId: input.salesmanId ?? "",
      items: input.items,
      expectedDeliveryDate: input.expectedDeliveryDate,
    });
  } catch (err) {
    return { ok: false, error: errorText(err, "Could not place the order.") };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, orderId, message: "Order placed." };
}

export async function editOrderAction(
  orderId: string,
  input: OrderFormInput,
): Promise<OrderFormResult> {
  let result: Awaited<ReturnType<typeof editOrder>>;
  try {
    result = await editOrder(orderId, {
      items: input.items,
      expectedDeliveryDate: input.expectedDeliveryDate,
    });
  } catch (err) {
    return { ok: false, error: errorText(err, "Could not save the changes.") };
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin");
  revalidatePath(`/salesman/orders/${orderId}`);
  revalidatePath("/rider");
  return {
    ok: true,
    orderId,
    message: result.newInvoice ? "Order updated — new invoice generated." : "Order updated.",
    warning: result.invoiceWarning ?? undefined,
  };
}

// For an order out for delivery whose invoice was voided by an edit and the
// replacement couldn't be generated at the time.
export async function generateInvoiceAction(formData: FormData): Promise<ActionResult> {
  const orderId = String(formData.get("order_id") ?? "");
  try {
    const caller = await getCurrentProfile();
    if (!caller || caller.role !== "admin") throw new Error("Only an admin can generate an invoice.");
    await createInvoiceForOrder(orderId);
  } catch (err) {
    return fail(err, "Could not generate the invoice.");
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/invoices");
  revalidatePath("/admin");
  return ok("Invoice generated.");
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
