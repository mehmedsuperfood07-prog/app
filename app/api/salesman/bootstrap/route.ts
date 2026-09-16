import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Everything a salesman's device needs to build orders offline, in one
// round trip (connectivity in the field is the whole reason this exists,
// so fewer requests matters more than clean separation of concerns).
// RLS already scopes every query below to "my clients" / my own orders —
// this route doesn't need its own authorization check on top of that.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const [
    { data: clients },
    { data: products },
    { data: overrides },
    { data: orders },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, name, customer_type, address, phone, credit_limit, current_balance, active, area:areas(id, name)",
      )
      .order("name"),
    supabase
      .from("products")
      .select("id, name, variant, unit, pack_size, default_price, active")
      .eq("active", true)
      .order("name"),
    supabase.from("price_overrides").select("client_id, product_id, special_price"),
    supabase
      .from("orders")
      .select(
        "id, status, created_at, client:clients(id, name), order_items(quantity, unit_price_at_order_time)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  type ClientRow = {
    id: string;
    name: string;
    customer_type: string;
    address: string | null;
    phone: string | null;
    credit_limit: number;
    current_balance: number;
    active: boolean;
    area: { id: string; name: string } | null;
  };
  type OrderRow = {
    id: string;
    status: string;
    created_at: string;
    client: { id: string; name: string } | null;
    order_items: { quantity: number; unit_price_at_order_time: number }[];
  };

  return NextResponse.json({
    clients: ((clients ?? []) as unknown as ClientRow[]).map((c) => ({
      id: c.id,
      name: c.name,
      customer_type: c.customer_type,
      address: c.address,
      phone: c.phone,
      credit_limit: c.credit_limit,
      current_balance: c.current_balance,
      active: c.active,
      area_id: c.area?.id ?? null,
      area_name: c.area?.name ?? null,
    })),
    products: products ?? [],
    priceOverrides: (overrides ?? []).map((o) => ({
      id: `${o.client_id}:${o.product_id}`,
      client_id: o.client_id,
      product_id: o.product_id,
      special_price: o.special_price,
    })),
    orders: ((orders ?? []) as unknown as OrderRow[]).map((o) => ({
      id: o.id,
      status: o.status,
      created_at: o.created_at,
      client_id: o.client?.id ?? "",
      client_name: o.client?.name ?? "Unknown client",
      total: o.order_items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price_at_order_time,
        0,
      ),
    })),
  });
}
