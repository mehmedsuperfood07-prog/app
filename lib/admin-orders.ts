import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { createInvoiceForOrder, getInvoiceDownloadUrl } from "@/lib/invoices";
import { deferPush, sendPushToUser } from "@/lib/push";
import { dbErrorMessage } from "@/lib/errors";
import { formatDeliveryDate, formatRs } from "@/lib/format";
import {
  listProductsWithPricingForClient,
  parseExpectedDeliveryDate,
  usableLineItems,
  type OrderLineInput,
} from "@/lib/orders";
import type { AdvancedStatus, DeliveryStatus } from "@/lib/deliveries";

export const ORDER_FILTERS = [
  "all",
  "placed",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

export type AdminOrderListItem = {
  id: string;
  status: string;
  createdAt: string;
  expectedDeliveryDate: string | null;
  clientName: string;
  salesmanName: string | null;
  riderName: string | null;
  deliveryStatus: DeliveryStatus | null;
  itemCount: number;
  total: number;
};

type OrderRow = {
  id: string;
  status: string;
  created_at: string;
  expected_delivery_date: string | null;
  salesman_id: string | null;
  rider_id: string | null;
  client: { name: string } | null;
  order_items: { quantity: number; unit_price_at_order_time: number }[];
  deliveries: { status: string }[];
};

export async function getOrderCounts(): Promise<Record<OrderFilter, number>> {
  const supabase = await createClient();
  const count = (status?: string) => {
    const q = supabase.from("orders").select("id", { count: "exact", head: true });
    return status ? q.eq("status", status) : q;
  };
  const [all, placed, out, delivered, cancelled] = await Promise.all([
    count(),
    count("placed"),
    count("out_for_delivery"),
    count("delivered"),
    count("cancelled"),
  ]);
  return {
    all: all.count ?? 0,
    placed: placed.count ?? 0,
    out_for_delivery: out.count ?? 0,
    delivered: delivered.count ?? 0,
    cancelled: cancelled.count ?? 0,
  };
}

export async function listAdminOrders(
  filter: OrderFilter,
  limit = 60,
): Promise<AdminOrderListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, status, created_at, expected_delivery_date, salesman_id, rider_id, client:clients(name), order_items(quantity, unit_price_at_order_time), deliveries(status)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filter !== "all") query = query.eq("status", filter);

  const { data } = await query;
  const rows = (data ?? []) as unknown as OrderRow[];
  if (rows.length === 0) return [];

  const profileIds = [
    ...new Set(rows.flatMap((o) => [o.salesman_id, o.rider_id]).filter(Boolean)),
  ] as string[];
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return rows.map((o) => ({
    id: o.id,
    status: o.status,
    createdAt: o.created_at,
    expectedDeliveryDate: o.expected_delivery_date,
    clientName: o.client?.name ?? "Unknown client",
    salesmanName: o.salesman_id ? (names.get(o.salesman_id) ?? null) : null,
    riderName: o.rider_id ? (names.get(o.rider_id) ?? null) : null,
    deliveryStatus: (o.deliveries?.[0]?.status as DeliveryStatus | undefined) ?? null,
    itemCount: o.order_items.length,
    total: o.order_items.reduce(
      (sum, i) => sum + i.quantity * i.unit_price_at_order_time,
      0,
    ),
  }));
}

export type AdminOrderDetail = {
  id: string;
  status: string;
  createdAt: string;
  createdOfflineAt: string | null;
  expectedDeliveryDate: string | null;
  client: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    areaName: string | null;
    balance: number;
    creditLimit: number;
  } | null;
  salesmanName: string | null;
  // Set when someone other than the salesman (the office) entered the order.
  placedByName: string | null;
  riderId: string | null;
  riderName: string | null;
  deliveryStatus: DeliveryStatus | null;
  deliveredAt: string | null;
  items: {
    id: string;
    name: string;
    variant: string | null;
    unit: string;
    packSize: string;
    quantity: number;
    unitPrice: number;
  }[];
  total: number;
  // label is set for timeline entries that are not a status change (e.g. a
  // rider change); the page falls back to a label for the status otherwise.
  history: { status: string; label?: string; changedAt: string; changedBy: string | null }[];
  cancellation: { at: string; by: string | null; reason: string | null } | null;
  invoice: {
    number: string;
    amount: number;
    downloadUrl: string | null;
    voided: { at: string; reason: string | null } | null;
  } | null;
};

export async function getAdminOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, created_at, created_offline_at, expected_delivery_date, client_id, salesman_id, rider_id, cancelled_at, cancelled_by, cancel_reason, placed_by",
    )
    .eq("id", id)
    .maybeSingle();
  if (!order) return null;

  const [
    { data: client },
    { data: items },
    { data: history },
    { data: delivery },
    { data: invoice },
    { data: riderChanges },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, address, phone, credit_limit, current_balance, area:areas(name)")
      .eq("id", order.client_id)
      .maybeSingle(),
    supabase
      .from("order_items")
      .select(
        "id, quantity, unit_price_at_order_time, product:products(name, variant, unit, pack_size)",
      )
      .eq("order_id", id),
    supabase
      .from("order_status_history")
      .select("status, changed_at, changed_by")
      .eq("order_id", id)
      .order("changed_at", { ascending: true }),
    supabase
      .from("deliveries")
      .select("status, delivered_at")
      .eq("order_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select("invoice_number, amount, pdf_url, voided_at, void_reason")
      .eq("order_id", id)
      // The live invoice if there is one, otherwise the most recent void one.
      .order("voided_at", { ascending: false, nullsFirst: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("integration_events")
      .select("payload, created_at")
      .eq("entity_type", "order")
      .eq("entity_id", id)
      .eq("event_type", "order.rider_changed")
      .order("created_at", { ascending: true }),
  ]);

  type RiderChange = { from_rider_id: string | null; to_rider_id: string; changed_by: string | null };
  const changes = (riderChanges ?? []).map((e) => ({
    at: e.created_at as string,
    ...(e.payload as RiderChange),
  }));

  const profileIds = [
    ...new Set(
      [
        order.salesman_id,
        order.rider_id,
        ...(history ?? []).map((h) => h.changed_by),
        order.cancelled_by,
        order.placed_by,
        ...changes.flatMap((c) => [c.from_rider_id, c.to_rider_id, c.changed_by]),
      ].filter(
        Boolean,
      ),
    ),
  ] as string[];
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  type ItemRow = {
    id: string;
    quantity: number;
    unit_price_at_order_time: number;
    product: { name: string; variant: string | null; unit: string; pack_size: string } | null;
  };
  const itemRows = ((items ?? []) as unknown as ItemRow[]).map((i) => ({
    id: i.id,
    name: i.product?.name ?? "Unknown product",
    variant: i.product?.variant ?? null,
    unit: i.product?.unit ?? "",
    packSize: i.product?.pack_size ?? "",
    quantity: i.quantity,
    unitPrice: i.unit_price_at_order_time,
  }));

  type ClientRow = {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    credit_limit: number;
    current_balance: number;
    area: { name: string } | null;
  };
  const c = client as unknown as ClientRow | null;

  return {
    id: order.id,
    status: order.status,
    createdAt: order.created_at,
    createdOfflineAt: order.created_offline_at,
    expectedDeliveryDate: order.expected_delivery_date,
    client: c
      ? {
          id: c.id,
          name: c.name,
          address: c.address,
          phone: c.phone,
          areaName: c.area?.name ?? null,
          balance: c.current_balance,
          creditLimit: c.credit_limit,
        }
      : null,
    salesmanName: order.salesman_id ? (names.get(order.salesman_id) ?? null) : null,
    placedByName: order.placed_by ? (names.get(order.placed_by) ?? "the office") : null,
    riderId: order.rider_id,
    riderName: order.rider_id ? (names.get(order.rider_id) ?? null) : null,
    deliveryStatus: (delivery?.status as DeliveryStatus | undefined) ?? null,
    deliveredAt: delivery?.delivered_at ?? null,
    items: itemRows,
    total: itemRows.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    history: [
      ...(history ?? []).map((h) => ({
        status: h.status as string,
        changedAt: h.changed_at as string,
        changedBy: h.changed_by ? (names.get(h.changed_by) ?? null) : null,
      })),
      ...changes.map((c) => ({
        status: "rider_changed",
        label: `Rider changed: ${(c.from_rider_id && names.get(c.from_rider_id)) || "previous rider"} → ${names.get(c.to_rider_id) ?? "new rider"}`,
        changedAt: c.at,
        changedBy: c.changed_by ? (names.get(c.changed_by) ?? null) : null,
      })),
    ].sort((a, b) => a.changedAt.localeCompare(b.changedAt)),
    cancellation: order.cancelled_at
      ? {
          at: order.cancelled_at,
          by: order.cancelled_by ? (names.get(order.cancelled_by) ?? null) : null,
          reason: order.cancel_reason,
        }
      : null,
    invoice: invoice
      ? {
          number: invoice.invoice_number,
          amount: invoice.amount,
          downloadUrl: invoice.pdf_url ? await getInvoiceDownloadUrl(invoice.pdf_url) : null,
          voided: invoice.voided_at ? { at: invoice.voided_at, reason: invoice.void_reason } : null,
        }
      : null,
  };
}

// Cancels an order that hasn't been delivered and voids its invoice. The rules
// (admin only, a reason is required, not once delivered, not once money was
// received, invoice kept but marked void, balance reversed, history and
// integration events) live in the cancel_order database function so the
// future ERP behaves identically; this only adds the notifications.
export async function cancelOrder(orderId: string, reason: string) {
  const caller = await getCurrentProfile();
  if (!caller || caller.role !== "admin") {
    throw new Error("Only an admin can cancel an order.");
  }
  if (!reason.trim()) throw new Error("Give a reason for cancelling.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_order", {
    p_order_id: orderId,
    p_reason: reason.trim(),
  });
  if (error) throw new Error(dbErrorMessage(error));

  const result = data as { previous_status: string; rider_id: string | null };
  deferPush(async () => {
    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("salesman_id, client:clients(name)")
      .eq("id", orderId)
      .single();
    const clientName =
      (order?.client as unknown as { name: string } | null)?.name ?? "An order";
    if (result.previous_status === "out_for_delivery" && result.rider_id) {
      await sendPushToUser(result.rider_id, {
        title: "Delivery cancelled",
        body: `${clientName} — do not deliver this order.`,
        url: "/rider",
      });
    }
    if (order?.salesman_id) {
      await sendPushToUser(order.salesman_id, {
        title: "Order cancelled",
        body: `${clientName} — ${reason.trim()}`,
        url: `/salesman/orders/${orderId}`,
      });
    }
  });
}

// ------------------------------------------------------------------
// The office doing a salesman's or a rider's job
// ------------------------------------------------------------------

async function requireAdmin(action: string) {
  const caller = await getCurrentProfile();
  if (!caller || caller.role !== "admin") {
    throw new Error(`Only an admin can ${action}.`);
  }
  return caller;
}

// Takes an order for any client, credited to a salesman (normally the
// client's own, so per-salesman sales stay right); the order records the admin
// as the person who entered it. Same checks as a salesman's order (products
// must be in the client's active catalog, date required, rates may be
// discounted), then the admin_create_order database function, which repeats
// the checks so the ERP can't skip them.
export async function createOrderAsAdmin(input: {
  clientId: string;
  salesmanId: string;
  items: OrderLineInput[];
  expectedDeliveryDate: string;
}): Promise<string> {
  await requireAdmin("take an order for a client");
  if (!input.salesmanId) throw new Error("Choose the salesman this order counts for.");
  const deliveryDate = parseExpectedDeliveryDate(input.expectedDeliveryDate);
  if (!deliveryDate) throw new Error("Choose a delivery date.");
  const lineItems = usableLineItems(input.items);

  const validIds = new Set(
    (await listProductsWithPricingForClient(input.clientId)).map((p) => p.id),
  );
  if (lineItems.some((i) => !validIds.has(i.product_id))) {
    throw new Error("One of the selected products is no longer available.");
  }

  const supabase = await createClient();
  const { data: orderId, error } = await supabase.rpc("admin_create_order", {
    p_client_id: input.clientId,
    p_salesman_id: input.salesmanId,
    p_items: lineItems.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })),
    p_expected_delivery_date: deliveryDate,
  });
  if (error || !orderId) throw new Error(error ? dbErrorMessage(error) : "Could not create the order.");

  const total = lineItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  deferPush(async () => {
    const admin = createAdminClient();
    const { data: client } = await admin
      .from("clients")
      .select("name")
      .eq("id", input.clientId)
      .single();
    await sendPushToUser(input.salesmanId, {
      title: "Order placed by the office",
      body: `${client?.name ?? "A client"} · ${formatRs(total)} · deliver ${formatDeliveryDate(deliveryDate)}`,
      url: `/salesman/orders/${orderId}`,
    });
  });

  return orderId as string;
}

// Moves a delivery forward for the rider (to any later step), or delivers an
// order that never had a rider (office pickup). For "delivered" the invoice is
// raised first if the order has none yet (an order delivered without a rider,
// or one assigned before invoices moved to assignment): the database refuses
// to mark an order delivered without one. If marking fails after that, the
// invoice simply stays with the order, exactly as if a rider had been assigned.
export async function adminUpdateDelivery(orderId: string, status: AdvancedStatus) {
  await requireAdmin("update a delivery");
  if (!["picked_up", "on_the_way", "delivered"].includes(status)) {
    throw new Error("Choose Picked up, On the way or Delivered.");
  }

  if (status === "delivered") await createInvoiceForOrder(orderId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_update_delivery", {
    p_order_id: orderId,
    p_status: status,
  });
  if (error) throw new Error(dbErrorMessage(error));

  const result = data as { rider_id: string | null; to_status: AdvancedStatus };
  if (result.rider_id && result.to_status === "delivered") {
    const riderId = result.rider_id;
    deferPush(() =>
      sendPushToUser(riderId, {
        title: "Delivery completed by the office",
        body: "An order on your list was marked delivered and has left it.",
        url: "/rider",
      }),
    );
  }
}
