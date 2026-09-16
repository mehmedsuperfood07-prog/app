import { createClient } from "@/lib/supabase/server";
import { createStaffAccountAction } from "@/lib/actions/staff";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { error, created } = await searchParams;
  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, active")
    .order("full_name");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Staff Accounts
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create salesman, rider, and admin logins. There is no public
          sign-up — every account is created here.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {created && <p className="text-sm text-green-600">Account created.</p>}

      <form
        action={createStaffAccountAction}
        className="max-w-md space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Full name
            </label>
            <input
              name="full_name"
              required
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Phone
            </label>
            <input
              name="phone"
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Temporary password
          </label>
          <input
            name="password"
            type="text"
            required
            minLength={6}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Role
          </label>
          <select
            name="role"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="salesman">Salesman</option>
            <option value="rider">Rider</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Create account
        </button>
      </form>

      <table className="w-full max-w-2xl text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Name</th>
            <th className="py-2">Phone</th>
            <th className="py-2">Role</th>
            <th className="py-2">Active</th>
          </tr>
        </thead>
        <tbody>
          {staff?.map((s) => (
            <tr
              key={s.id}
              className="border-b border-zinc-100 dark:border-zinc-900"
            >
              <td className="py-2 text-zinc-900 dark:text-zinc-50">
                {s.full_name}
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">
                {s.phone ?? "—"}
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">
                {s.role}
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">
                {s.active ? "Yes" : "No"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
