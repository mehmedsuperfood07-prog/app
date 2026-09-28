import { NextResponse } from "next/server";
import { createOrder, type OrderLineInput } from "@/lib/orders";

// Pushes one queued order from a salesman's local outbox (lib/offline/sync.ts).
// unit_price travels with each line — see lib/orders.ts for why that's
// trusted now (on-the-spot discounts) while product_id still isn't.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.client_id !== "string" || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const items: OrderLineInput[] = body.items
    .filter(
      (i: unknown): i is { product_id: string; quantity: number; unit_price: number } =>
        typeof i === "object" &&
        i !== null &&
        typeof (i as { product_id?: unknown }).product_id === "string" &&
        typeof (i as { quantity?: unknown }).quantity === "number" &&
        typeof (i as { unit_price?: unknown }).unit_price === "number",
    )
    .map((i: { product_id: string; quantity: number; unit_price: number }) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
    }));

  const createdOfflineAt =
    typeof body.created_offline_at === "string" ? body.created_offline_at : undefined;

  try {
    const orderId = await createOrder(body.client_id, items, createdOfflineAt);
    return NextResponse.json({ orderId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not place order.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
