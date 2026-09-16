import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";

export default function AdminHome() {
  return (
    <div>
      <PageHeader title="Dashboard" />
      <Card>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Order and invoice reporting land here in a later step. Use the menu
          (top left) for clients, products, areas, orders, invoices, and
          staff accounts.
        </p>
      </Card>
    </div>
  );
}
