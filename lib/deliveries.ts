import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { createInvoiceForOrder } from "@/lib/invoices";

export const DELIVERY_STATUSES = [
  "assigned",
  "picked_up",
  "on_the_way",
  "delivered",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

const NEXT_DELIVERY_STATUS: Record<DeliveryStatus, DeliveryStatus | null> = {
  assigned: "picked_up",
  picked_up: "on_the_way",
  on_the_way: "delivered",
  delivered: null,
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  assigned: "Assigned",
  picked_up: "Picked Up",
  on_the_way: "On the Way",
  delivered: "Delivered",
};

// Riders never see clients or products directly (those tables carry
// pricing/ledger columns) — they read through clients_rider_view and
// products_rider_view instead, which project only the columns a rider
// is allowed to see. See the schema migration for details.

export type RiderDeliveryListItem = {
  id: string;
  created_at: string;
  delivery_status: DeliveryStatus;
  client: { id: string; name: string; address: string | null } | null;
};

export async function listMyDeliveries(): Promise<RiderDeliveryListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: orders } = await supabase
    .from("orders")
    .select("id, created_at, client_id, deliveries(status)")
    .eq("rider_id", user.id)
    .eq("status", "out_for_delivery")
    .order("created_at", { ascending: true });

  if (!orders || orders.length === 0) return [];

  const clientIds = [...new Set(orders.map((o) => o.client_id))];
  const { data: clients } = await supabase
    .from("clients_rider_view")
    .select("id, name, address")
    .in("id", clientIds);

  const clientMap = new Map((clients ?? []).map((c) => [c.id, c]));

  type Row = (typeof orders)[number];
  return (orders as Row[]).map((o) => ({
    id: o.id,
    created_at: o.created_at,
    delivery_status: (o.deliveries?.[0]?.status ?? "assigned") as DeliveryStatus,
    client: clientMap.get(o.client_id) ?? null,
  }));
}

export type RiderDeliveryDetail = {
  id: string;
  delivery_status: DeliveryStatus;
  client: { id: string; name: string; address: string | null; phone: string | null } | null;
  items: {
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      variant: string | null;
      unit: string;
      pack_size: string;
    } | null;
  }[];
};

export async function getDeliveryDetail(
  orderId: string,
): Promise<RiderDeliveryDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: order } = await supabase
    .from("orders")
    .select("id, client_id, rider_id, deliveries(status)")
    .eq("id", orderId)
    .single();
  if (!order || order.rider_id !== user.id) return null;

  // order_items_rider_view (not the order_items table) enforces at the
  // database level that a rider can never read unit_price_at_order_time —
  // RLS alone can't hide a column, only rows. See the migration that
  // introduced this view for details.
  const [{ data: client }, { data: items }] = await Promise.all([
    supabase
      .from("clients_rider_view")
      .select("id, name, address, phone")
      .eq("id", order.client_id)
      .single(),
    supabase
      .from("order_items_rider_view")
      .select("id, quantity, product_id")
      .eq("order_id", orderId),
  ]);

  const productIds = [...new Set((items ?? []).map((i) => i.product_id))];
  const { data: products } = productIds.length
    ? await supabase
        .from("products_rider_view")
        .select("id, name, variant, unit, pack_size")
        .in("id", productIds)
    : { data: [] };

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  return {
    id: order.id,
    delivery_status: (order.deliveries?.[0]?.status ?? "assigned") as DeliveryStatus,
    client: client ?? null,
    items: (items ?? []).map((i) => ({
      id: i.id,
      quantity: i.quantity,
      product: productMap.get(i.product_id) ?? null,
    })),
  };
}

// Always advances from whatever status the delivery is currently at in
// the database — the target status is never taken from the caller, so a
// rider can never skip a step (e.g. straight to "delivered") by tampering
// with a form.
export async function advanceDelivery(orderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: order } = await supabase
    .from("orders")
    .select("id, rider_id, deliveries(id, status)")
    .eq("id", orderId)
    .single();

  if (!order || order.rider_id !== user.id) {
    throw new Error("This delivery is not assigned to you.");
  }

  const delivery = order.deliveries?.[0];
  if (!delivery) throw new Error("No delivery record for this order.");

  const next = NEXT_DELIVERY_STATUS[delivery.status as DeliveryStatus];
  if (!next) throw new Error("This delivery is already complete.");

  const { error: deliveryError } = await supabase
    .from("deliveries")
    .update({
      status: next,
      ...(next === "delivered" ? { delivered_at: new Date().toISOString() } : {}),
    })
    .eq("id", delivery.id);
  if (deliveryError) throw new Error(deliveryError.message);

  if (next === "delivered") {
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId);
    if (orderError) throw new Error(orderError.message);

    await supabase
      .from("order_status_history")
      .insert({ order_id: orderId, status: "delivered", changed_by: user.id });

    await createInvoiceForOrder(orderId);
  }
}

// ------------------------------------------------------------------
// Admin: assigning a rider to a placed order
// ------------------------------------------------------------------

export type AdminOrderRow = {
  id: string;
  status: string;
  created_at: string;
  client: { id: string; name: string } | null;
  salesman: { id: string; full_name: string } | null;
  rider: { id: string; full_name: string } | null;
  delivery_status: DeliveryStatus | null;
};

export async function listOrdersNeedingAttention(): Promise<AdminOrderRow[]> {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, created_at, client_id, salesman_id, rider_id")
    .in("status", ["placed", "out_for_delivery"])
    .order("created_at", { ascending: true });

  if (!orders || orders.length === 0) return [];

  const clientIds = [...new Set(orders.map((o) => o.client_id))];
  const profileIds = [
    ...new Set(orders.flatMap((o) => [o.salesman_id, o.rider_id]).filter(Boolean)),
  ] as string[];
  const orderIds = orders.map((o) => o.id);

  const [{ data: clients }, { data: profiles }, { data: deliveries }] = await Promise.all([
    supabase.from("clients").select("id, name").in("id", clientIds),
    supabase.from("profiles").select("id, full_name").in("id", profileIds),
    supabase.from("deliveries").select("order_id, status").in("order_id", orderIds),
  ]);

  const clientMap = new Map((clients ?? []).map((c) => [c.id, c]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const deliveryMap = new Map((deliveries ?? []).map((d) => [d.order_id, d.status]));

  return orders.map((o) => ({
    id: o.id,
    status: o.status,
    created_at: o.created_at,
    client: clientMap.get(o.client_id) ?? null,
    salesman: o.salesman_id ? (profileMap.get(o.salesman_id) ?? null) : null,
    rider: o.rider_id ? (profileMap.get(o.rider_id) ?? null) : null,
    delivery_status: (deliveryMap.get(o.id) as DeliveryStatus | undefined) ?? null,
  }));
}

export async function assignRiderToOrder(orderId: string, riderId: string) {
  const caller = await getCurrentProfile();
  if (!caller || caller.role !== "admin") {
    throw new Error("Only an admin can assign a rider.");
  }
  if (!riderId) throw new Error("Choose a rider.");

  const supabase = await createClient();

  const { error: orderError } = await supabase
    .from("orders")
    .update({ rider_id: riderId, status: "out_for_delivery" })
    .eq("id", orderId);
  if (orderError) throw new Error(orderError.message);

  const { error: deliveryError } = await supabase
    .from("deliveries")
    .insert({ order_id: orderId, rider_id: riderId, status: "assigned" });
  if (deliveryError) throw new Error(deliveryError.message);

  await supabase
    .from("order_status_history")
    .insert({ order_id: orderId, status: "out_for_delivery", changed_by: caller.id });
}
