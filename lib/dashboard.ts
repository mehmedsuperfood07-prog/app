import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
  ordersToday: number;
  needsRider: number;
  outForDelivery: number;
  outstandingBalance: number;
  invoicesThisWeek: number;
  invoicedThisWeek: number;
  recentOrders: {
    id: string;
    status: string;
    createdAt: string;
    clientName: string;
    total: number;
  }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const [
    { count: ordersToday },
    { count: needsRider },
    { count: outForDelivery },
    { data: clients },
    { data: invoices },
    { data: recentOrdersRaw },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfToday.toISOString()),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "placed"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "out_for_delivery"),
    supabase.from("clients").select("current_balance").eq("active", true),
    supabase
      .from("invoices")
      .select("amount")
      .gte("created_at", startOfWeek.toISOString()),
    supabase
      .from("orders")
      .select("id, status, created_at, client:clients(name), order_items(quantity, unit_price_at_order_time)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  type RecentOrderRow = {
    id: string;
    status: string;
    created_at: string;
    client: { name: string } | null;
    order_items: { quantity: number; unit_price_at_order_time: number }[];
  };

  return {
    ordersToday: ordersToday ?? 0,
    needsRider: needsRider ?? 0,
    outForDelivery: outForDelivery ?? 0,
    outstandingBalance: (clients ?? []).reduce((sum, c) => sum + c.current_balance, 0),
    invoicesThisWeek: invoices?.length ?? 0,
    invoicedThisWeek: (invoices ?? []).reduce((sum, i) => sum + i.amount, 0),
    recentOrders: ((recentOrdersRaw ?? []) as unknown as RecentOrderRow[]).map((o) => ({
      id: o.id,
      status: o.status,
      createdAt: o.created_at,
      clientName: o.client?.name ?? "Unknown client",
      total: o.order_items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price_at_order_time,
        0,
      ),
    })),
  };
}
