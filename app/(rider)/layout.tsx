import { requireRole } from "@/lib/auth";
import { MobileShell } from "@/components/mobile/mobile-shell";
import { PushSoundPlayer } from "@/components/push-sound-player";

export default async function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("rider");

  return (
    <>
      <PushSoundPlayer />
      <MobileShell title="Mehmed Delivery" profile={profile}>
        {children}
      </MobileShell>
    </>
  );
}
