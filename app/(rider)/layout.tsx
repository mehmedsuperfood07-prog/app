import { requireRole } from "@/lib/auth";
import { MobileShell } from "@/components/mobile/mobile-shell";
import { PushRefreshListener } from "@/components/push-refresh-listener";
import { PushSoundPlayer } from "@/components/push-sound-player";
import { PushSubscriptionSync } from "@/components/push-subscription-sync";

export default async function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("rider");

  return (
    <>
      <PushRefreshListener />
      <PushSoundPlayer />
      <PushSubscriptionSync />
      <MobileShell title="Mehmed Delivery" profile={profile}>
        {children}
      </MobileShell>
    </>
  );
}
