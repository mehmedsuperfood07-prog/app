import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { formatDate } from "@/lib/format";

// Runs on the service-role client: the invoice is a system-generated side
// effect of an admin assigning a rider (assignRiderToOrder in
// lib/deliveries.ts), not something the caller writes directly. The one
// other caller is advanceDelivery, as a fallback for orders assigned before
// invoices moved to the assignment step; there the caller is a rider, who
// has no RLS access to invoices or to a client's ledger balance, and
// shouldn't. The authorization already happened in the RLS-respecting
// calls that ran before this one.
//
// Idempotent: the assignment's conditional update already guarantees this
// runs once per order, but a retry or replay must still never produce a
// second invoice (and a second charge to the client's balance), so an
// existing invoice for the order short-circuits everything below.
//
// Known limitation: these are separate network calls, not one DB
// transaction. The one partial failure that would be silent is an invoice
// with no balance charge (the existing-invoice check above would then skip
// the charge on every retry), so that case removes the invoice again and
// throws; a failure at any earlier step leaves nothing behind but an unused
// invoice number and a PDF the next attempt overwrites. A proper fix would
// move this into a single Postgres function/transaction if it becomes a
// real problem.
export async function createInvoiceForOrder(orderId: string) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("invoices")
    .select("id")
    .eq("order_id", orderId)
    .limit(1);
  if (existing && existing.length > 0) return;

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
      issuedAt={formatDate(new Date())}
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

  const { data: invoice, error: invoiceError } = await admin
    .from("invoices")
    .insert({
      order_id: orderId,
      invoice_number: invoiceNumber,
      pdf_url: pdfPath,
      amount: total,
    })
    .select("id")
    .single();
  if (invoiceError || !invoice) {
    throw new Error(invoiceError?.message ?? "Could not save the invoice.");
  }

  const { error: balanceError } = await admin.rpc("increment_client_balance", {
    p_client_id: order.client_id,
    p_amount: total,
  });
  if (balanceError) {
    await admin.from("invoices").delete().eq("id", invoice.id);
    throw new Error(balanceError.message);
  }
}

export type AdminInvoiceRow = {
  id: string;
  order_id: string;
  invoice_number: string;
  amount: number;
  paid_amount: number;
  created_at: string;
  pdf_url: string | null;
  voided_at: string | null;
  client: { id: string; name: string } | null;
};

export async function listInvoicesForAdmin(): Promise<AdminInvoiceRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select(
      "id, order_id, invoice_number, amount, paid_amount, created_at, pdf_url, voided_at, order:orders(client:clients(id, name))",
    )
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    order_id: string;
    invoice_number: string;
    amount: number;
    paid_amount: number;
    created_at: string;
    pdf_url: string | null;
    voided_at: string | null;
    order: { client: { id: string; name: string } | null } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    order_id: r.order_id,
    invoice_number: r.invoice_number,
    amount: r.amount,
    paid_amount: r.paid_amount,
    created_at: r.created_at,
    pdf_url: r.pdf_url,
    voided_at: r.voided_at,
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
