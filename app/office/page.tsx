import { redirect } from "next/navigation";
import { MonitorSmartphone } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentProfile, roleHome } from "@/lib/auth";
import { ERP_URL } from "@/lib/erp";

// Office logins (accounts, auditor…) use the ERP, not this app. They sign in here only by
// mistake; this tells them where to go.
export default async function OfficePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/login?error=inactive");
  if (profile.role !== "office") redirect(roleHome(profile.role));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
        <MonitorSmartphone size={26} />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Your work is in the ERP
      </h1>
      <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        {profile.full_name}, this login is for the office system. Open the ERP and sign in there with the same email and
        password.
      </p>
      <a
        href={ERP_URL}
        className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground active:bg-accent/90"
      >
        Open the ERP
      </a>
      <div className="mt-4">
        <SignOutButton />
      </div>
    </div>
  );
}
