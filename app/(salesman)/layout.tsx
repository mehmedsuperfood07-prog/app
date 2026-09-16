import { requireRole } from "@/lib/auth";
import { RoleShell } from "@/components/role-shell";

export default async function SalesmanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("salesman");

  return (
    <RoleShell title="Mehmed Sales" profile={profile}>
      {children}
    </RoleShell>
  );
}
