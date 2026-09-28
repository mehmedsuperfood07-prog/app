import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deferPush, sendPushToRole } from "@/lib/push";
import { formatRs } from "@/lib/format";

export type OrderProduct = {
  id: string;
  name: string;
  variant: string | null;
  unit: string;
  pack_size: string;
  price: number;
};

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
  unit_price: number;
};

const MAX_LINE_QUANTITY = 100_000;

// unit_price comes from the salesman now, not the catalog — on-the-spot
// discounts are a normal part of how this business sells, so whatever
// the salesman enters at order time (typically less than the catalog/
// override price, but never forced to be) is what actually gets charged.
// What's still never trusted from the client is which PRODUCT is being
// sold: every product_id below is checked against the real, active
// catalog for this client, so a tampered/unknown id can't slip through
// even though the price itself now can be anything non-negative.
//
// createdOfflineAt, when set, records that this order was actually built
// on the device at that earlier time even though it's only reaching the
// server now — see orders.created_offline_at / synced_at in the schema.
export async function createOrder(
  clientId: string,
  items: OrderLineInput[],
  createdOfflineAt?: string,
) {
  const lineItems = items.filter(
    (i) =>
      Number.isFinite(i.quantity) &&
      i.quantity > 0 &&
      i.quantity <= MAX_LINE_QUANTITY &&
      Number.isFinite(i.unit_price) &&
      i.unit_price >= 0,
  );
  if (lineItems.length === 0) {
    throw new Error("Add at least one product with a quantity.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  // Replay-safe: an offline order that reached the server but whose
  // response never made it back gets re-sent by the device. The moment it
  // was taken on the device (created_offline_at) is unique per queued
  // order, so if we've already stored one for this salesman and client we
  // hand back that order instead of creating a second, double-billed one.
  if (createdOfflineAt) {
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("salesman_id", user.id)
      .eq("client_id", clientId)
      .eq("created_offline_at", createdOfflineAt)
      .limit(1);
    if (existing && existing.length > 0) return existing[0].id as string;
  }

  const validProducts = await listProductsWithPricingForClient(clientId);
  const validIds = new Set(validProducts.map((p) => p.id));

  for (const item of lineItems) {
    if (!validIds.has(item.product_id)) {
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
      unit_price: i.unit_price,
    })),
    p_created_offline_at: createdOfflineAt ?? null,
  });

  if (rpcError || !orderId) {
    throw new Error(rpcError?.message ?? "Could not create order.");
  }

  const total = lineItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  // Sent after the response goes back, so the salesman's order confirms
  // immediately instead of waiting on the push services.
  deferPush(async () => {
    const admin = createAdminClient();
    const { data: client } = await admin
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .single();
    await sendPushToRole("admin", {
      title: "New order placed",
      body: `${client?.name ?? "A client"} · ${formatRs(total)}`,
      url: "/admin/orders",
    });
  });

  return orderId as string;
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
