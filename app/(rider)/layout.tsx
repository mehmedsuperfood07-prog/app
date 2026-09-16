import { requireRole } from "@/lib/auth";
import { RoleShell } from "@/components/role-shell";

export default async function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("rider");

  return (
    <RoleShell title="Mehmed Delivery" profile={profile}>
      {children}
    </RoleShell>
  );
}
