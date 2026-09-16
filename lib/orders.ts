import { createClient } from "@/lib/supabase/server";
import { sendPushToRole } from "@/lib/push";

export type OrderProduct = {
  id: string;
  name: string;
  variant: string | null;
  unit: string;
  pack_size: string;
  price: number;
};

export type OrderClient = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  current_balance: number;
  credit_limit: number;
  area: { name: string } | null;
};

export async function getClientForOrder(
  clientId: string,
): Promise<OrderClient | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select(
      "id, name, address, phone, current_balance, credit_limit, area:areas(name)",
    )
    .eq("id", clientId)
    .single();
  return data as unknown as OrderClient | null;
}

// Effective price = the client's negotiated override if one exists,
// otherwise the catalog default. Never the other way around.
export async function listProductsWithPricingForClient(
  clientId: string,
): Promise<OrderProduct[]> {
  const supabase = await createClient();
  const [{ data: products }, { data: overrides }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, variant, unit, pack_size, default_price")
      .eq("active", true)
      .order("name"),
    supabase
      .from("price_overrides")
      .select("product_id, special_price")
      .eq("client_id", clientId),
  ]);

  const overrideMap = new Map(
    (overrides ?? []).map((o) => [o.product_id, o.special_price]),
  );

  return (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    variant: p.variant,
    unit: p.unit,
    pack_size: p.pack_size,
    price: overrideMap.get(p.id) ?? p.default_price,
  }));
}

export type OrderLineInput = {
  product_id: string;
  quantity: number;
};

// Prices are always looked up here from the catalog/override tables at
// submit time — never taken from the client request — so a salesman can
// never place an order at a price they typed or tampered with in the form.
// This also holds for orders queued offline (see lib/offline/sync.ts):
// the price locked into order_items is always whatever the catalog says
// at the moment the order actually reaches the server, not whatever was
// cached on the device when the salesman built the order. That can
// occasionally surprise a salesman if a price changed while they were
// offline, but it's the same trust boundary as the online path, and
// correct trumps a cached number nobody can vouch for.
//
// createdOfflineAt, when set, records that this order was actually built
// on the device at that earlier time even though it's only reaching the
// server now — see orders.created_offline_at / synced_at in the schema.
export async function createOrder(
  clientId: string,
  items: OrderLineInput[],
  createdOfflineAt?: string,
) {
  const lineItems = items.filter((i) => i.quantity > 0);
  if (lineItems.length === 0) {
    throw new Error("Add at least one product with a quantity.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const priced = await listProductsWithPricingForClient(clientId);
  const priceMap = new Map(priced.map((p) => [p.id, p.price]));

  for (const item of lineItems) {
    if (!priceMap.has(item.product_id)) {
      throw new Error("One of the selected products is no longer available.");
    }
  }

  // One atomic RPC (order + order_items + order_status_history) rather
  // than three separate inserts — see the migration that introduced
  // create_order_with_items for why: a concurrent reader could otherwise
  // catch the order between steps and see a real order with zero items.
  const { data: orderId, error: rpcError } = await supabase.rpc("create_order_with_items", {
    p_client_id: clientId,
    p_salesman_id: user.id,
    p_items: lineItems.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: priceMap.get(i.product_id)!,
    })),
    p_created_offline_at: createdOfflineAt ?? null,
  });

  if (rpcError || !orderId) {
    throw new Error(rpcError?.message ?? "Could not create order.");
  }

  const total = lineItems.reduce(
    (sum, i) => sum + i.quantity * priceMap.get(i.product_id)!,
    0,
  );
  const client = await getClientForOrder(clientId);
  // Awaited, not fire-and-forget: on serverless, an un-awaited promise
  // can get cut off once the response is sent, so this has to finish
  // before createOrder returns. sendPushToRole never throws on its own.
  await sendPushToRole("admin", {
    title: "New order placed",
    body: `${client?.name ?? "A client"} · Rs ${total}`,
    url: `/admin/orders`,
  });

  return orderId as string;
}

export type OrderSummary = {
  id: string;
  status: string;
  created_at: string;
  client: { id: string; name: string } | null;
  total: number;
};

type OrderListRow = {
  id: string;
  status: string;
  created_at: string;
  client: { id: string; name: string } | null;
  order_items: { quantity: number; unit_price_at_order_time: number }[];
};

export async function listOrdersForSalesman(): Promise<OrderSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, status, created_at, client:clients(id, name), order_items(quantity, unit_price_at_order_time)",
    )
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as OrderListRow[]).map((o) => ({
    id: o.id,
    status: o.status,
    created_at: o.created_at,
    client: o.client,
    total: o.order_items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price_at_order_time,
      0,
    ),
  }));
}

export type OrderDetail = {
  id: string;
  status: string;
  created_at: string;
  client: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
  order_items: {
    id: string;
    quantity: number;
    unit_price_at_order_time: number;
    product: {
      id: string;
      name: string;
      variant: string | null;
      unit: string;
      pack_size: string;
    } | null;
  }[];
};

export async function getOrderDetail(
  orderId: string,
): Promise<OrderDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, status, created_at, client:clients(id, name, address, phone), order_items(id, quantity, unit_price_at_order_time, product:products(id, name, variant, unit, pack_size))",
    )
    .eq("id", orderId)
    .single();
  return data as unknown as OrderDetail | null;
}
