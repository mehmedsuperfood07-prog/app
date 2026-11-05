import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// The ERP link (CLAUDE.md section 4, "The ERP link"). While the ERP's switch is off
// (public.erp_linked() false, always so on a database without the ERP) the app behaves
// exactly as before. Once on, the ERP makes the challan when a rider is assigned and the
// invoice when the order is delivered (database triggers in 20261030000000_erp_link.sql),
// and keeps clients.current_balance; the app stops making its own invoices.

// Memoized per request: several steps of one action ask.
export const isErpLinked = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("erp_linked");
  return !error && data === true;
});

// Where staff open the ERP, for links from the order screens.
export const ERP_URL = process.env.NEXT_PUBLIC_ERP_URL ?? "https://mehmed-erp.mehmed-erp.workers.dev";

export type ErpCredit = { balance: number; overdue: number; oldestDaysLate: number | null };

// Each customer the signed-in person may see, with what is late (erp.order_app_credit).
// Empty while unlinked.
export async function getErpCredit(): Promise<Map<string, ErpCredit>> {
  if (!(await isErpLinked())) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.schema("erp").rpc("order_app_credit");
  if (error || !data) return new Map();
  return new Map(
    (data as { client_id: string; balance: number; overdue: number; oldest_days_late: number | null }[]).map((r) => [
      r.client_id,
      { balance: Number(r.balance), overdue: Number(r.overdue), oldestDaysLate: r.oldest_days_late },
    ]),
  );
}

export type ErpInvoice = {
  number: string;
  invoiceDate: string;
  total: number;
  balance: number;
};

// The ERP invoice made for an order once it was delivered (erp.order_app_invoice), or
// null: not delivered yet, refused by the ERP, or unlinked.
export async function getErpInvoice(orderId: string): Promise<ErpInvoice | null> {
  if (!(await isErpLinked())) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.schema("erp").rpc("order_app_invoice", { p_order_id: orderId });
  if (error || !data) return null;
  const d = data as { number: string; invoice_date: string; total: number; balance: number };
  return { number: d.number, invoiceDate: d.invoice_date, total: Number(d.total), balance: Number(d.balance) };
}

// Orders the app invoiced itself before the link: their invoice is in the ERP's opening
// balances, so changing or cancelling them here would leave the books wrong. Once linked
// they are corrected in the ERP instead (Goods came back, or a rebate).
export async function assertNotInvoicedBeforeLink(orderId: string, what: "change" | "cancel") {
  if (!(await isErpLinked())) return;
  const supabase = await createClient();
  const { data } = await supabase.from("invoices").select("invoice_number").eq("order_id", orderId).is("voided_at", null).limit(1);
  const invoice = data?.[0];
  if (invoice) {
    throw new Error(
      `This order was invoiced (${invoice.invoice_number}) before the ERP was connected, so it can't be ${
        what === "change" ? "changed" : "cancelled"
      } here. Correct it in the ERP with "Goods came back" or a rebate.`,
    );
  }
}
