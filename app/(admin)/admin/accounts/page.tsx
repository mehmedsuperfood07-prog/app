import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createStaffAccountAction } from "@/lib/actions/staff";
import { Field, SelectField } from "@/components/form-field";
import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";
import { StatusPill } from "@/components/mobile/status-pill";

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
    <div>
      <PageHeader
        title="Staff Accounts"
        subtitle="No public sign-up — every account is created here"
      />

      {error && (
        <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          <AlertCircle size={14} /> {error}
        </p>
      )}
      {created && (
        <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent-soft-foreground">
          Account created.
        </p>
      )}

      <Card className="mb-5">
        <form action={createStaffAccountAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name" name="full_name" required />
            <Field label="Phone" name="phone" />
          </div>
          <Field label="Email" name="email" type="email" required />
          <Field label="Temporary password" name="password" required />
          <SelectField label="Role" name="role" defaultValue="salesman">
            <option value="salesman">Salesman</option>
            <option value="rider">Rider</option>
            <option value="admin">Admin</option>
          </SelectField>
          <button
            type="submit"
            className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-foreground active:bg-accent/90"
          >
            Create account
          </button>
        </form>
      </Card>

      <div className="space-y-2.5">
        {staff?.map((s) => (
          <Card key={s.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                {s.full_name}
              </div>
              <div className="text-xs capitalize text-zinc-500 dark:text-zinc-400">
                {s.role}
                {s.phone && ` · ${s.phone}`}
              </div>
            </div>
            <StatusPill tone={s.active ? "strong" : "neutral"}>
              {s.active ? "Active" : "Inactive"}
            </StatusPill>
          </Card>
        ))}
      </div>
    </div>
  );
}
