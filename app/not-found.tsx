import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
        <SearchX size={26} />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Page not found
      </h1>
      <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        That page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground active:bg-accent/90"
      >
        Back to the app
      </Link>
    </div>
  );
}
