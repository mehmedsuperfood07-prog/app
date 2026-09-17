import { requireRole } from "@/lib/auth";
import { AdminShell } from "@/components/mobile/admin-shell";
import { PushRefreshListener } from "@/components/push-refresh-listener";
import { PushSoundPlayer } from "@/components/push-sound-player";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("admin");

  return (
    <>
      <PushRefreshListener />
      <PushSoundPlayer />
      <AdminShell profile={profile}>{children}</AdminShell>
    </>
  );
}
