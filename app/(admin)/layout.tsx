import { requireRole } from "@/lib/auth";
import { RoleShell } from "@/components/role-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("admin");

  return (
    <RoleShell title="Mehmed Admin" profile={profile}>
      {children}
    </RoleShell>
  );
}
