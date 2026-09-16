import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";

// Runs on the service-role client: this is a system-triggered side effect
// of a rider marking a delivery complete (see advanceDelivery in
// lib/deliveries.ts), not something the rider is requesting on their own
// authority. The rider has no RLS access to invoices or to a client's
// ledger balance, and shouldn't — the authorization for "this order was
// really just delivered" already happened in the RLS-respecting calls
// that ran before this one.
//
// Known limitation: these are separate network calls, not one DB
// transaction, so a failure partway through (e.g. the balance update)
// can leave an invoice row without a matching balance bump. Acceptable
// for a "basic" Phase 1 invoice — it throws rather than swallowing the
// error, so a partial failure is visible instead of silent. A proper fix
// would move this into a single Postgres function/transaction if it
// becomes a real problem.
export async function createInvoiceForOrder(orderId: string) {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, client_id, client:clients(name, address, phone)")
    .eq("id", orderId)
    .single();
  if (!order) throw new Error("Order not found.");

  const { data: items } = await admin
    .from("order_items")
    .select(
      "quantity, unit_price_at_order_time, product:products(name, variant, unit, pack_size)",
    )
    .eq("order_id", orderId);

  type Client = { name: string; address: string | null; phone: string | null };
  type Product = { name: string; variant: string | null; unit: string; pack_size: string };
  const client = order.client as unknown as Client | null;

  const lineItems = ((items ?? []) as unknown as {
    quantity: number;
    unit_price_at_order_time: number;
    product: Product | null;
  }[]).map((i) => ({
    productName: i.product?.name ?? "Unknown product",
    variant: i.product?.variant ?? null,
    unit: i.product?.unit ?? "",
    packSize: i.product?.pack_size ?? "",
    quantity: i.quantity,
    unitPrice: i.unit_price_at_order_time,
  }));

  const total = lineItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const { data: invoiceNumber, error: numberError } = await admin.rpc("next_invoice_number");
  if (numberError || !invoiceNumber) {
    throw new Error(numberError?.message ?? "Could not generate invoice number.");
  }

  const pdfBuffer = await renderToBuffer(
    <InvoiceDocument
      invoiceNumber={invoiceNumber}
      issuedAt={new Date().toLocaleDateString("en-GB")}
      client={{
        name: client?.name ?? "Unknown client",
        address: client?.address ?? null,
        phone: client?.phone ?? null,
      }}
      items={lineItems}
      total={total}
    />,
  );

  const pdfPath = `${orderId}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("invoices")
    .upload(pdfPath, pdfBuffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { error: invoiceError } = await admin.from("invoices").insert({
    order_id: orderId,
    invoice_number: invoiceNumber,
    pdf_url: pdfPath,
    amount: total,
  });
  if (invoiceError) throw new Error(invoiceError.message);

  const { error: balanceError } = await admin.rpc("increment_client_balance", {
    p_client_id: order.client_id,
    p_amount: total,
  });
  if (balanceError) throw new Error(balanceError.message);
}

export type AdminInvoiceRow = {
  id: string;
  invoice_number: string;
  amount: number;
  paid_amount: number;
  created_at: string;
  pdf_url: string | null;
  client: { id: string; name: string } | null;
};

export async function listInvoicesForAdmin(): Promise<AdminInvoiceRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, amount, paid_amount, created_at, pdf_url, order:orders(client:clients(id, name))",
    )
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    invoice_number: string;
    amount: number;
    paid_amount: number;
    created_at: string;
    pdf_url: string | null;
    order: { client: { id: string; name: string } | null } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    invoice_number: r.invoice_number,
    amount: r.amount,
    paid_amount: r.paid_amount,
    created_at: r.created_at,
    pdf_url: r.pdf_url,
    client: r.order?.client ?? null,
  }));
}

// The invoices storage bucket's RLS requires is_admin(), same as the
// invoices table itself, so this only ever succeeds for an admin's own
// session — no separate role check needed here.
export async function getInvoiceDownloadUrl(pdfPath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("invoices")
    .createSignedUrl(pdfPath, 60 * 5);
  if (error) return null;
  return data.signedUrl;
}
