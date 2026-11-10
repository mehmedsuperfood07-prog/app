import { requireRole } from "@/lib/auth";
import { MobileShell } from "@/components/mobile/mobile-shell";
import { SyncStatusIndicator } from "@/components/sync-status-indicator";

// Business assistants, placed in a shop. They only mark attendance.
export default async function AssistantLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("assistant");
  return (
    <MobileShell title="Attendance" profile={profile}>
      <div className="mb-4 flex justify-end">
        <SyncStatusIndicator />
      </div>
      {children}
    </MobileShell>
  );
}
