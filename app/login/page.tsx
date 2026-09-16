import { login } from "@/lib/actions/auth";
import { Button } from "@/components/mobile/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col justify-center bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-accent-foreground shadow-lg shadow-accent/20">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Mehmed Order Manager
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to your staff account
          </p>
        </div>

        <form action={login} className="space-y-4">
          {error === "invalid" && (
            <p className="rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
              Incorrect email or password.
            </p>
          )}
          {error === "inactive" && (
            <p className="rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
              This account has been deactivated.
            </p>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="w-full rounded-xl border border-zinc-300 bg-surface px-4 py-3 text-sm dark:border-zinc-700"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-zinc-300 bg-surface px-4 py-3 text-sm dark:border-zinc-700"
            />
          </div>

          <Button type="submit" className="mt-2 w-full py-3.5">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
