import { createClient } from "@/lib/supabase/server";

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
export async function createOrder(clientId: string, items: OrderLineInput[]) {
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

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ client_id: clientId, salesman_id: user.id, status: "placed" })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Could not create order.");
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    lineItems.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price_at_order_time: priceMap.get(i.product_id)!,
    })),
  );

  if (itemsError) throw new Error(itemsError.message);

  await supabase
    .from("order_status_history")
    .insert({ order_id: order.id, status: "placed", changed_by: user.id });

  return order.id as string;
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
