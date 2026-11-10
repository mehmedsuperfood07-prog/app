import Link from "next/link";
import { CalendarCheck } from "lucide-react";
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
    <MobileShell title="Sales" profile={profile} bottomNav={<BottomNav />}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/salesman/attendance" className="flex items-center gap-1.5 text-sm font-semibold text-accent">
          <CalendarCheck size={16} /> Attendance
        </Link>
        <SyncStatusIndicator />
      </div>
      {children}
    </MobileShell>
  );
}
