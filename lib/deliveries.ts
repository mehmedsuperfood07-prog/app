import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { createInvoiceForOrder } from "@/lib/invoices";
import { deferPush, sendPushToUser, sendPushToRole } from "@/lib/push";
import { dbErrorMessage } from "@/lib/errors";
import { startOfTodayPakistan } from "@/lib/format";

export const DELIVERY_STATUSES = [
  "assigned",
  "picked_up",
  "on_the_way",
  "delivered",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
export type AdvancedStatus = Exclude<DeliveryStatus, "assigned">;

const NEXT_DELIVERY_STATUS: Record<DeliveryStatus, AdvancedStatus | null> = {
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

// Every rider-initiated status change notifies admin — not just the
// final "delivered" step — so the office can follow a delivery's
// progress without having to open the app and check. "assigned" is
// excluded: that's the starting state a delivery is created in, never a
// transition advanceDelivery produces.
const DELIVERY_PUSH_COPY: Record<
  AdvancedStatus,
  (clientName: string) => { title: string; body: string }
> = {
  picked_up: (name) => ({ title: "Order picked up", body: `${name} — rider has the order` }),
  on_the_way: (name) => ({ title: "Rider on the way", body: `${name} — out for delivery` }),
  delivered: (name) => ({ title: "Delivery completed", body: `${name} was delivered — invoice generated` }),
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

export type RiderCompletedItem = {
  id: string;
  deliveredAt: string;
  clientName: string;
  address: string | null;
};

// Deliveries this rider finished today (Pakistan time) — so a rider who
// has cleared their list sees proof of the day's work instead of just an
// empty screen.
export async function listMyDeliveredToday(): Promise<RiderCompletedItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: deliveries } = await supabase
    .from("deliveries")
    .select("order_id, delivered_at")
    .eq("rider_id", user.id)
    .eq("status", "delivered")
    .gte("delivered_at", startOfTodayPakistan().toISOString())
    .order("delivered_at", { ascending: false });

  if (!deliveries || deliveries.length === 0) return [];

  const { data: orders } = await supabase
    .from("orders")
    .select("id, client_id")
    .in(
      "id",
      deliveries.map((d) => d.order_id),
    );
  const clientIds = [...new Set((orders ?? []).map((o) => o.client_id))];
  const { data: clients } = clientIds.length
    ? await supabase.from("clients_rider_view").select("id, name, address").in("id", clientIds)
    : { data: [] };

  const clientByOrder = new Map(
    (orders ?? []).map((o) => [o.id, (clients ?? []).find((c) => c.id === o.client_id)]),
  );

  return deliveries.map((d) => ({
    id: d.order_id,
    deliveredAt: d.delivered_at as string,
    clientName: clientByOrder.get(d.order_id)?.name ?? "Unknown client",
    address: clientByOrder.get(d.order_id)?.address ?? null,
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
//
// The update is conditional on the status the delivery was read at
// (.eq("status", delivery.status)), which makes each step atomic: if two
// taps race, only one UPDATE matches a row and the other is rejected.
// Without that, a double-tap on "Mark delivered" would run the invoice
// step twice — two invoices and the client's balance charged twice.
export async function advanceDelivery(orderId: string): Promise<AdvancedStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: order } = await supabase
    .from("orders")
    .select("id, rider_id, client_id, deliveries(id, status)")
    .eq("id", orderId)
    .single();

  if (!order || order.rider_id !== user.id) {
    throw new Error("This delivery is not assigned to you.");
  }

  const delivery = order.deliveries?.[0];
  if (!delivery) throw new Error("No delivery record for this order.");

  const next = NEXT_DELIVERY_STATUS[delivery.status as DeliveryStatus];
  if (!next) throw new Error("This delivery is already complete.");

  const { data: updated, error: deliveryError } = await supabase
    .from("deliveries")
    .update({
      status: next,
      ...(next === "delivered" ? { delivered_at: new Date().toISOString() } : {}),
    })
    .eq("id", delivery.id)
    .eq("status", delivery.status)
    .select("id");
  if (deliveryError) throw new Error(dbErrorMessage(deliveryError));
  if (!updated || updated.length === 0) {
    throw new Error("This delivery was just updated — pull to refresh to see its latest status.");
  }

  if (next === "delivered") {
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId);
    if (orderError) throw new Error(dbErrorMessage(orderError));

    await supabase
      .from("order_status_history")
      .insert({ order_id: orderId, status: "delivered", changed_by: user.id });

    await createInvoiceForOrder(orderId);
  }

  const clientId = order.client_id;
  deferPush(async () => {
    const admin = createAdminClient();
    const { data: client } = await admin
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .single();
    await sendPushToRole("admin", {
      ...DELIVERY_PUSH_COPY[next](client?.name ?? "An order"),
      url: next === "delivered" ? "/admin/invoices" : "/admin/orders",
    });
  });

  return next;
}

// ------------------------------------------------------------------
// Admin: assigning a rider to a placed order
// ------------------------------------------------------------------

export async function assignRiderToOrder(orderId: string, riderId: string) {
  const caller = await getCurrentProfile();
  if (!caller || caller.role !== "admin") {
    throw new Error("Only an admin can assign a rider.");
  }
  if (!riderId) throw new Error("Choose a rider.");

  const supabase = await createClient();

  const { data: rider } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", riderId)
    .eq("role", "rider")
    .eq("active", true)
    .maybeSingle();
  if (!rider) throw new Error("Choose an active rider.");

  // Claiming the order is conditional on it still waiting for a rider, so
  // a double-tap (or two admins at once) can't assign it twice and leave
  // it with two delivery rows.
  const { data: claimed, error: orderError } = await supabase
    .from("orders")
    .update({ rider_id: riderId, status: "out_for_delivery" })
    .eq("id", orderId)
    .eq("status", "placed")
    .select("client_id");
  if (orderError) throw new Error(dbErrorMessage(orderError));
  if (!claimed || claimed.length === 0) {
    throw new Error("This order already has a rider.");
  }

  const { error: deliveryError } = await supabase
    .from("deliveries")
    .insert({ order_id: orderId, rider_id: riderId, status: "assigned" });
  if (deliveryError) {
    await supabase
      .from("orders")
      .update({ rider_id: null, status: "placed" })
      .eq("id", orderId);
    throw new Error(dbErrorMessage(deliveryError));
  }

  await supabase
    .from("order_status_history")
    .insert({ order_id: orderId, status: "out_for_delivery", changed_by: caller.id });

  const clientId = claimed[0].client_id;
  deferPush(async () => {
    const admin = createAdminClient();
    const { data: client } = await admin
      .from("clients")
      .select("name, address")
      .eq("id", clientId)
      .single();
    await sendPushToUser(riderId, {
      title: "New delivery assigned",
      body: client
        ? `${client.name}${client.address ? ` · ${client.address}` : ""}`
        : "A new order is waiting for pickup",
      url: `/rider/${orderId}`,
    });
  });
}
