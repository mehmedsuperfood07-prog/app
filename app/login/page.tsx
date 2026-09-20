import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const notice = error === "inactive" ? "This account has been deactivated." : undefined;

  return (
    <div className="min-h-dvh bg-background">
      <div
        className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-[#1b7a3e] to-[#1b3a12] px-6 pb-24 text-white"
        style={{ paddingTop: "calc(var(--safe-top) + 4rem)" }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative mx-auto flex max-w-sm flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl font-black text-[#1b7a3e] shadow-lg shadow-black/20">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Mehmed Super Foods</h1>
          <p className="mt-1 text-sm text-white/80">Order Manager</p>
        </div>
      </div>

      <div className="relative -mt-14 px-5 pb-10">
        <div className="animate-page mx-auto w-full max-w-sm rounded-3xl border border-zinc-200/70 bg-surface p-6 shadow-xl shadow-black/5 dark:border-zinc-800">
          <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome back
          </h2>
          <p className="mb-5 mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to your staff account
          </p>
          <LoginForm notice={notice} />
        </div>
        <p className="mt-6 text-center text-xs text-zinc-400">
          Bulk food supply · Lahore, Pakistan
        </p>
      </div>
    </div>
  );
}
