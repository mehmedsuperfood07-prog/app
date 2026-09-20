import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getInvoiceDownloadUrl } from "@/lib/invoices";
import type { DeliveryStatus } from "@/lib/deliveries";

export const ORDER_FILTERS = ["all", "placed", "out_for_delivery", "delivered"] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

export type AdminOrderListItem = {
  id: string;
  status: string;
  createdAt: string;
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
  const [all, placed, out, delivered] = await Promise.all([
    count(),
    count("placed"),
    count("out_for_delivery"),
    count("delivered"),
  ]);
  return {
    all: all.count ?? 0,
    placed: placed.count ?? 0,
    out_for_delivery: out.count ?? 0,
    delivered: delivered.count ?? 0,
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
      "id, status, created_at, salesman_id, rider_id, client:clients(name), order_items(quantity, unit_price_at_order_time), deliveries(status)",
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
  history: { status: string; changedAt: string; changedBy: string | null }[];
  invoice: { number: string; amount: number; downloadUrl: string | null } | null;
};

export async function getAdminOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, created_at, created_offline_at, client_id, salesman_id, rider_id")
    .eq("id", id)
    .maybeSingle();
  if (!order) return null;

  const [
    { data: client },
    { data: items },
    { data: history },
    { data: delivery },
    { data: invoice },
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
      .select("invoice_number, amount, pdf_url")
      .eq("order_id", id)
      .limit(1)
      .maybeSingle(),
  ]);

  const profileIds = [
    ...new Set(
      [order.salesman_id, order.rider_id, ...(history ?? []).map((h) => h.changed_by)].filter(
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
    riderName: order.rider_id ? (names.get(order.rider_id) ?? null) : null,
    deliveryStatus: (delivery?.status as DeliveryStatus | undefined) ?? null,
    deliveredAt: delivery?.delivered_at ?? null,
    items: itemRows,
    total: itemRows.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    history: (history ?? []).map((h) => ({
      status: h.status,
      changedAt: h.changed_at,
      changedBy: h.changed_by ? (names.get(h.changed_by) ?? null) : null,
    })),
    invoice: invoice
      ? {
          number: invoice.invoice_number,
          amount: invoice.amount,
          downloadUrl: invoice.pdf_url ? await getInvoiceDownloadUrl(invoice.pdf_url) : null,
        }
      : null,
  };
}
