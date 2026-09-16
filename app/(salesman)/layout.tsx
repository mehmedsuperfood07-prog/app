import { requireRole } from "@/lib/auth";
import { MobileShell } from "@/components/mobile/mobile-shell";
import { BottomNav } from "@/components/mobile/bottom-nav";
import { SyncStatusIndicator } from "@/components/sync-status-indicator";

export default async function SalesmanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("salesman");

  return (
    <MobileShell title="Mehmed Sales" profile={profile} bottomNav={<BottomNav />}>
      <div className="mb-4 flex justify-end">
        <SyncStatusIndicator />
      </div>
      {children}
    </MobileShell>
  );
}
