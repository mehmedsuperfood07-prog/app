import { logout } from "@/lib/actions/auth";
import type { Profile } from "@/lib/auth";

export function RoleShell({
  title,
  profile,
  children,
}: {
  title: string;
  profile: Profile;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            {profile.full_name}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="text-zinc-600 underline dark:text-zinc-400"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
