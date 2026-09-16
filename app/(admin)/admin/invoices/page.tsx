import { Download } from "lucide-react";
import { listInvoicesForAdmin, getInvoiceDownloadUrl } from "@/lib/invoices";
import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";

export default async function AdminInvoicesPage() {
  const invoices = await listInvoicesForAdmin();
  const withUrls = await Promise.all(
    invoices.map(async (inv) => ({
      ...inv,
      downloadUrl: inv.pdf_url ? await getInvoiceDownloadUrl(inv.pdf_url) : null,
    })),
  );

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Generated automatically when a rider marks an order delivered"
      />

      <div className="space-y-2.5">
        {withUrls.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">No invoices yet.</p>
        )}
        {withUrls.map((inv) => (
          <Card key={inv.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                {inv.client?.name ?? "Unknown client"}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {inv.invoice_number} · {new Date(inv.created_at).toLocaleDateString()}
              </div>
              <div className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Rs {inv.amount}{" "}
                <span className="text-xs font-normal text-zinc-500">
                  (Rs {inv.paid_amount} paid)
                </span>
              </div>
            </div>
            {inv.downloadUrl && (
              <a
                href={inv.downloadUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Download invoice"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <Download size={17} />
              </a>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
