import { listInvoicesForAdmin, getInvoiceDownloadUrl } from "@/lib/invoices";

export default async function AdminInvoicesPage() {
  const invoices = await listInvoicesForAdmin();
  const withUrls = await Promise.all(
    invoices.map(async (inv) => ({
      ...inv,
      downloadUrl: inv.pdf_url ? await getInvoiceDownloadUrl(inv.pdf_url) : null,
    })),
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Invoices
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Generated automatically when a rider marks an order delivered.
        </p>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Invoice</th>
            <th className="py-2">Client</th>
            <th className="py-2">Date</th>
            <th className="py-2">Amount</th>
            <th className="py-2">Paid</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {withUrls.map((inv) => (
            <tr
              key={inv.id}
              className="border-b border-zinc-100 dark:border-zinc-900"
            >
              <td className="py-2 text-zinc-900 dark:text-zinc-50">
                {inv.invoice_number}
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">
                {inv.client?.name ?? "Unknown client"}
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">
                {new Date(inv.created_at).toLocaleDateString()}
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">
                Rs {inv.amount}
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">
                Rs {inv.paid_amount}
              </td>
              <td className="py-2">
                {inv.downloadUrl && (
                  <a
                    href={inv.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-600 underline dark:text-zinc-400"
                  >
                    Download
                  </a>
                )}
              </td>
            </tr>
          ))}
          {withUrls.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-center text-zinc-500">
                No invoices yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
