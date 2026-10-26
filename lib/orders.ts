import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { createInvoiceForOrder } from "@/lib/invoices";
import { dbErrorMessage } from "@/lib/errors";
import { deferPush, sendPushToRole, sendPushToUser } from "@/lib/push";
import { addDaysToISODate, formatDeliveryDate, formatRs, todayPakistanISO } from "@/lib/format";

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

// Drops empty or nonsensical lines; throws if nothing is left to order.
export function usableLineItems(items: OrderLineInput[]): OrderLineInput[] {
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
  return lineItems;
}

// The date the salesman promised the client ("YYYY-MM-DD"). The order form
// won't submit without one, but an order queued on a phone before the field
// existed still reaches us without it, so a missing date is accepted here and
// stored as null. A real date only has to be a real calendar day and not wildly
// off: an offline order can reach the server days after it was taken, so
// recent past dates are fine.
export function parseExpectedDeliveryDate(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const asDate = match && new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
  if (
    !match ||
    !asDate ||
    asDate.getUTCFullYear() !== +match[1] ||
    asDate.getUTCMonth() !== +match[2] - 1 ||
    asDate.getUTCDate() !== +match[3]
  ) {
    throw new Error("The delivery date isn't a valid date.");
  }
  const today = todayPakistanISO();
  if (value < addDaysToISODate(today, -30) || value > addDaysToISODate(today, 366)) {
    throw new Error("The delivery date is too far from today.");
  }
  return value;
}

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
  expectedDeliveryDate?: string | null,
) {
  const deliveryDate = parseExpectedDeliveryDate(expectedDeliveryDate);
  const lineItems = usableLineItems(items);

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
    p_expected_delivery_date: deliveryDate,
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
      body: `${client?.name ?? "A client"} · ${formatRs(total)}${
        deliveryDate ? ` · deliver ${formatDeliveryDate(deliveryDate)}` : ""
      }`,
      url: "/admin/orders",
    });
  });

  return orderId as string;
}

export type OrderDetail = {
  id: string;
  status: string;
  created_at: string;
  expected_delivery_date: string | null;
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
      "id, status, created_at, expected_delivery_date, client:clients(id, name, address, phone), order_items(id, quantity, unit_price_at_order_time, product:products(id, name, variant, unit, pack_size))",
    )
    .eq("id", orderId)
    .single();
  return data as unknown as OrderDetail | null;
}

// ------------------------------------------------------------------
// Editing an order (the salesman until a rider is assigned, the office
// until it is delivered — the edit_order database function decides)
// ------------------------------------------------------------------

export type OrderForEditing = {
  id: string;
  status: string;
  expectedDeliveryDate: string | null;
  client: { id: string; name: string; balance: number; creditLimit: number };
  // Every product the form should offer: the client's active catalog, plus any
  // product already on the order that has since been switched off.
  products: OrderProduct[];
  lines: { productId: string; quantity: number; unitPrice: number }[];
  // The live invoice, if the order has one (only an admin can see invoices;
  // a salesman's editable orders never have one yet).
  invoice: { number: string; amount: number } | null;
};

export async function getOrderForEditing(orderId: string): Promise<OrderForEditing | null> {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, expected_delivery_date, client:clients(id, name, current_balance, credit_limit), order_items(quantity, unit_price_at_order_time, product:products(id, name, variant, unit, pack_size, default_price))",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  type Row = {
    id: string;
    status: string;
    expected_delivery_date: string | null;
    client: { id: string; name: string; current_balance: number; credit_limit: number } | null;
    order_items: {
      quantity: number;
      unit_price_at_order_time: number;
      product: {
        id: string;
        name: string;
        variant: string | null;
        unit: string;
        pack_size: string;
        default_price: number;
      } | null;
    }[];
  };
  const o = order as unknown as Row;
  if (!o.client) return null;

  const [catalog, { data: invoice }] = await Promise.all([
    listProductsWithPricingForClient(o.client.id),
    supabase
      .from("invoices")
      .select("invoice_number, amount")
      .eq("order_id", orderId)
      .is("voided_at", null)
      .maybeSingle(),
  ]);
  const inCatalog = new Set(catalog.map((p) => p.id));
  const switchedOff = o.order_items
    .map((i) => i.product)
    .filter((p): p is NonNullable<typeof p> => !!p && !inCatalog.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      variant: p.variant,
      unit: p.unit,
      pack_size: p.pack_size,
      price: p.default_price,
    }));

  return {
    id: o.id,
    status: o.status,
    expectedDeliveryDate: o.expected_delivery_date,
    client: {
      id: o.client.id,
      name: o.client.name,
      balance: o.client.current_balance,
      creditLimit: o.client.credit_limit,
    },
    products: [...catalog, ...switchedOff],
    lines: o.order_items
      .filter((i) => i.product)
      .map((i) => ({
        productId: i.product!.id,
        quantity: i.quantity,
        unitPrice: i.unit_price_at_order_time,
      })),
    invoice: invoice ? { number: invoice.invoice_number, amount: invoice.amount } : null,
  };
}

type EditResult = {
  status: string;
  client_id: string;
  salesman_id: string;
  rider_id: string | null;
  before_total: number;
  after_total: number;
  lines_changed: boolean;
  voided_invoice: { invoice_number: string; amount: number } | null;
};

// Same checks as placing an order, then the edit_order database function,
// which decides who may edit what and, for an invoiced order, voids the old
// invoice and takes it off the balance. A fresh invoice for the new lines is
// raised straight after. If that fails the edit still stands and the order
// simply has no invoice until the office presses "Generate invoice" on it
// (marking it delivered raises one too), so the caller gets a warning, not an
// error.
export async function editOrder(
  orderId: string,
  input: { items: OrderLineInput[]; expectedDeliveryDate: string },
): Promise<{ invoiceWarning: string | null; newInvoice: boolean }> {
  const caller = await getCurrentProfile();
  if (!caller) throw new Error("Not signed in.");
  const deliveryDate = parseExpectedDeliveryDate(input.expectedDeliveryDate);
  if (!deliveryDate) throw new Error("Choose a delivery date.");
  const lineItems = usableLineItems(input.items);

  const current = await getOrderForEditing(orderId);
  if (!current) throw new Error("Order not found.");
  const allowed = new Set(current.products.map((p) => p.id));
  if (lineItems.some((i) => !allowed.has(i.product_id))) {
    throw new Error("One of the selected products is no longer available.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("edit_order", {
    p_order_id: orderId,
    p_items: lineItems.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })),
    p_expected_delivery_date: deliveryDate,
  });
  if (error) throw new Error(dbErrorMessage(error));
  const result = data as EditResult;

  let invoiceWarning: string | null = null;
  if (result.voided_invoice) {
    try {
      await createInvoiceForOrder(orderId);
    } catch (err) {
      invoiceWarning = `The order was changed, but the new invoice could not be generated${
        err instanceof Error && err.message ? ` (${err.message})` : ""
      }. Open the order and tap "Generate invoice".`;
    }
  }

  const clientName = current.client.name;
  const change = `${formatRs(Number(result.before_total))} → ${formatRs(Number(result.after_total))}`;
  deferPush(async () => {
    if (caller.role === "admin") {
      if (result.salesman_id) {
        await sendPushToUser(result.salesman_id, {
          title: "Order changed by the office",
          body: `${clientName} · ${change}`,
          url: `/salesman/orders/${orderId}`,
        });
      }
    } else {
      await sendPushToRole("admin", {
        title: "Order edited",
        body: `${clientName} · ${change}`,
        url: `/admin/orders/${orderId}`,
      });
    }
    if (result.status === "out_for_delivery" && result.rider_id) {
      await sendPushToUser(result.rider_id, {
        title: "Order changed",
        body: `${clientName} — check the items before you deliver.`,
        url: `/rider/${orderId}`,
      });
    }
  });

  return { invoiceWarning, newInvoice: !!result.voided_invoice && !invoiceWarning };
}
