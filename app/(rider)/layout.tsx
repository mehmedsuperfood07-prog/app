import { requireRole } from "@/lib/auth";
import { MobileShell } from "@/components/mobile/mobile-shell";

export default async function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("rider");

  return (
    <MobileShell title="Mehmed Delivery" profile={profile}>
      {children}
    </MobileShell>
  );
}
