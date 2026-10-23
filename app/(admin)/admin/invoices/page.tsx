import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { listInvoicesForAdmin, getInvoiceDownloadUrl } from "@/lib/invoices";
import { formatDate, formatRs } from "@/lib/format";
import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";
import { StatusPill } from "@/components/mobile/status-pill";

export default async function AdminInvoicesPage() {
  const invoices = await listInvoicesForAdmin();
  const withUrls = await Promise.all(
    invoices.map(async (inv) => ({
      ...inv,
      downloadUrl: inv.pdf_url ? await getInvoiceDownloadUrl(inv.pdf_url) : null,
    })),
  );

  // Void invoices (from cancelled orders) stay listed for the record but
  // never count towards what was billed.
  const live = invoices.filter((i) => !i.voided_at);
  const voidCount = invoices.length - live.length;
  const totalInvoiced = live.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={
          invoices.length > 0
            ? `${live.length} invoice${live.length === 1 ? "" : "s"} · ${formatRs(totalInvoiced)} in total${
                voidCount > 0 ? ` · ${voidCount} void` : ""
              }`
            : "Generated automatically when you assign a rider to an order"
        }
      />

      {withUrls.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
            <FileText size={22} />
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">No invoices yet</p>
          <p className="mt-0.5 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
            An invoice is created automatically the moment you assign a rider to an order.
          </p>
        </div>
      ) : (
        <div className="grid items-start gap-2.5 lg:grid-cols-2">
          {withUrls.map((inv) => (
            <Card key={inv.id} className="flex items-center justify-between gap-3">
              <Link href={`/admin/orders/${inv.order_id}`} className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                    {inv.client?.name ?? "Unknown client"}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {inv.invoice_number} · {formatDate(inv.created_at)}
                  </div>
                  {inv.voided_at ? (
                    <div className="mt-0.5 flex items-center gap-2 text-sm">
                      <span className="font-semibold text-zinc-400 line-through">{formatRs(inv.amount)}</span>
                      <StatusPill>Void</StatusPill>
                    </div>
                  ) : (
                    <div className="mt-0.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatRs(inv.amount)}{" "}
                      <span className="text-xs font-normal text-zinc-500">
                        ({formatRs(inv.paid_amount)} paid)
                      </span>
                    </div>
                  )}
                </div>
              </Link>
              {inv.downloadUrl && (
                <a
                  href={inv.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Download invoice ${inv.invoice_number}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <Download size={17} />
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
