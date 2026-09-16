"use client";

import { ShellHeader } from "@/components/mobile/shell-header";
import type { Profile } from "@/lib/auth";

export function MobileShell({
  title,
  profile,
  bottomNav,
  children,
}: {
  title: string;
  profile: Profile;
  bottomNav?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <ShellHeader title={title} profile={profile} />
      <main
        className="mx-auto max-w-lg px-4 py-5"
        style={{
          paddingBottom: bottomNav
            ? "calc(var(--safe-bottom) + 5.5rem)"
            : "calc(var(--safe-bottom) + 1.25rem)",
        }}
      >
        {children}
      </main>
      {bottomNav}
    </div>
  );
}
