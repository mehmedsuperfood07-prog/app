import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { createInvoiceForOrder } from "@/lib/invoices";
import { deferPush, sendPushToUser, sendPushToRole } from "@/lib/push";
import { dbErrorMessage } from "@/lib/errors";
import { formatDeliveryDate, startOfTodayPakistan } from "@/lib/format";

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
  delivered: (name) => ({ title: "Delivery completed", body: `${name} was delivered` }),
};

// Riders never see clients or products directly (those tables carry
// pricing/ledger columns) — they read through clients_rider_view and
// products_rider_view instead, which project only the columns a rider
// is allowed to see. See the schema migration for details.

export type RiderDeliveryListItem = {
  id: string;
  created_at: string;
  expected_delivery_date: string | null;
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
    .select("id, created_at, expected_delivery_date, client_id, deliveries(status)")
    .eq("rider_id", user.id)
    .eq("status", "out_for_delivery")
    // Soonest promised date first, so the day's deliveries lead the list;
    // orders with no date (placed before the field existed) go last.
    .order("expected_delivery_date", { ascending: true, nullsFirst: false })
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
    expected_delivery_date: o.expected_delivery_date,
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
  expected_delivery_date: string | null;
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
    .select("id, status, client_id, rider_id, expected_delivery_date, deliveries(status)")
    .eq("id", orderId)
    .single();
  // A cancelled order stays on the record with its rider, but it is no longer
  // a delivery: the rider's link to it just stops working.
  if (!order || order.rider_id !== user.id || order.status === "cancelled") return null;

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
    expected_delivery_date: order.expected_delivery_date,
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
// Without that, a double-tap on "Mark delivered" would run the delivered
// step twice — duplicate history rows and a duplicate push to the office.
export async function advanceDelivery(orderId: string): Promise<AdvancedStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, rider_id, client_id, deliveries(id, status)")
    .eq("id", orderId)
    .single();

  if (!order || order.rider_id !== user.id) {
    throw new Error("This delivery is not assigned to you.");
  }
  // The database refuses this too (enforce_delivery_status_transition); this
  // just gives the rider a clear message instead of a generic error.
  if (order.status === "cancelled") {
    throw new Error("This order was cancelled. Do not deliver it.");
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

    // Invoices are raised when the rider is assigned (assignRiderToOrder),
    // so for every new order this finds one and does nothing. It only does
    // work for an order assigned before that change, which has none yet.
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
      url: "/admin/orders",
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
    .select("id");
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

  // The invoice is raised here, not on delivery: the office needs it to go
  // out with the goods. If it can't be produced the assignment is undone, so
  // the admin just tries again and no order is ever out for delivery without
  // one. The claim above makes this the only caller for the order, so it
  // can't race another admin into a second invoice. Service role for the
  // undo: it has to remove the delivery row we just wrote, whatever RLS says.
  try {
    await createInvoiceForOrder(orderId);
  } catch (err) {
    const admin = createAdminClient();
    await admin.from("deliveries").delete().eq("order_id", orderId);
    await admin
      .from("orders")
      .update({ rider_id: null, status: "placed" })
      .eq("id", orderId)
      .eq("status", "out_for_delivery");
    const detail = err instanceof Error && err.message ? ` (${err.message})` : "";
    throw new Error(`Could not generate the invoice${detail}, so no rider was assigned. Try again.`);
  }

  await supabase
    .from("order_status_history")
    .insert({ order_id: orderId, status: "out_for_delivery", changed_by: caller.id });

  deferPush(() => notifyRiderOfNewDelivery(riderId, orderId));
}

// Moves an order that is out for delivery to another rider. The rules (admin
// only, not yet delivered, delivery restarts at "assigned", the audit event)
// live in the change_order_rider database function, so the future ERP gets
// exactly the same behaviour by calling it; this only adds the notifications.
// The invoice and the client's balance don't change.
export async function changeOrderRider(orderId: string, riderId: string) {
  const caller = await getCurrentProfile();
  if (!caller || caller.role !== "admin") {
    throw new Error("Only an admin can change the rider.");
  }
  if (!riderId) throw new Error("Choose a rider.");

  const supabase = await createClient();
  const { data: previousRiderId, error } = await supabase.rpc("change_order_rider", {
    p_order_id: orderId,
    p_rider_id: riderId,
  });
  if (error) throw new Error(dbErrorMessage(error));

  deferPush(async () => {
    await notifyRiderOfNewDelivery(riderId, orderId);
    if (previousRiderId) {
      await sendPushToUser(previousRiderId as string, {
        title: "Delivery moved",
        body: "An order was given to another rider and has left your list.",
        url: "/rider",
      });
    }
  });
}

async function notifyRiderOfNewDelivery(riderId: string, orderId: string) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("expected_delivery_date, client:clients(name, address)")
    .eq("id", orderId)
    .single();
  const client = order?.client as unknown as { name: string; address: string | null } | null;
  const deliveryDate = (order?.expected_delivery_date ?? null) as string | null;
  await sendPushToUser(riderId, {
    title: "New delivery assigned",
    body: `${
      client
        ? `${client.name}${client.address ? ` · ${client.address}` : ""}`
        : "A new order is waiting for pickup"
    }${deliveryDate ? ` · deliver ${formatDeliveryDate(deliveryDate)}` : ""}`,
    url: `/rider/${orderId}`,
  });
}
