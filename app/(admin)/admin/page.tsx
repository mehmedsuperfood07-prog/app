import Link from "next/link";

export default function AdminHome() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Client, product, and order management land here in the next build
        steps.
      </p>
      <Link
        href="/admin/accounts"
        className="mt-4 inline-block text-sm text-zinc-700 underline dark:text-zinc-300"
      >
        Manage staff accounts →
      </Link>
    </div>
  );
}
