import { ChevronDown, UserPlus } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { listStaff, type StaffMember } from "@/lib/staff";
import {
  createStaffAccountAction,
  updateStaffProfileAction,
  setStaffActiveAction,
  resetStaffPasswordAction,
} from "@/lib/actions/staff";
import { ActionForm } from "@/components/action-form";
import { Field, SelectField } from "@/components/form-field";
import { PageHeader } from "@/components/mobile/page-header";
import { StatusPill } from "@/components/mobile/status-pill";
import { SubmitButton } from "@/components/mobile/submit-button";

const detailsClasses =
  "group overflow-hidden rounded-2xl border border-zinc-200/80 bg-surface shadow-sm dark:border-zinc-800";

const ROLE_TONE = { admin: "strong", salesman: "medium", rider: "soft" } as const;

export default async function AccountsPage() {
  const [staff, me] = await Promise.all([listStaff(), getCurrentProfile()]);

  return (
    <div>
      <PageHeader
        title="Staff Accounts"
        subtitle="No public sign-up — every account is created here"
      />

      <details className={`${detailsClasses} mb-4`}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <span className="flex items-center gap-1.5">
            <UserPlus size={16} className="text-accent" /> Add staff account
          </span>
          <ChevronDown
            size={16}
            className="text-zinc-400 transition-transform group-open:rotate-180"
          />
        </summary>
        <ActionForm
          action={createStaffAccountAction}
          resetOnSuccess
          className="space-y-3 border-t border-zinc-100 p-4 dark:border-zinc-800"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name" name="full_name" required />
            <Field label="Phone" name="phone" type="tel" />
          </div>
          <Field label="Email" name="email" type="email" required autoComplete="off" />
          <Field
            label="Temporary password"
            name="password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            autoComplete="off"
          />
          <SelectField label="Role" name="role" defaultValue="salesman">
            <option value="salesman">Salesman</option>
            <option value="rider">Rider</option>
            <option value="admin">Admin</option>
          </SelectField>
          <SubmitButton pendingLabel="Creating…">Create account</SubmitButton>
        </ActionForm>
      </details>

      <div className="grid items-start gap-2.5 lg:grid-cols-2">
        {staff.map((s) => (
          <StaffCard key={s.id} member={s} isMe={s.id === me?.id} />
        ))}
      </div>
    </div>
  );
}

function StaffCard({ member: s, isMe }: { member: StaffMember; isMe: boolean }) {
  return (
    <details className={detailsClasses}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {s.full_name.trim().charAt(0).toUpperCase() || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
              {s.full_name}
            </span>
            {isMe && <span className="text-[11px] font-medium text-zinc-400">(you)</span>}
          </div>
          <div className="text-xs capitalize text-zinc-500 dark:text-zinc-400">
            {s.role}
            {s.phone && ` · ${s.phone}`}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusPill tone={ROLE_TONE[s.role]}>{s.role}</StatusPill>
          {!s.active && <StatusPill tone="neutral">Inactive</StatusPill>}
        </div>
        <ChevronDown
          size={16}
          className="shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="space-y-4 border-t border-zinc-100 px-4 py-4 dark:border-zinc-800">
        <ActionForm action={updateStaffProfileAction} className="space-y-3">
          <input type="hidden" name="id" value={s.id} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name" name="full_name" defaultValue={s.full_name} required />
            <Field label="Phone" name="phone" type="tel" defaultValue={s.phone ?? ""} />
          </div>
          <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
        </ActionForm>

        <ActionForm
          action={resetStaffPasswordAction}
          resetOnSuccess
          className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800"
        >
          <input type="hidden" name="id" value={s.id} />
          <Field
            label="New password"
            name="password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            autoComplete="off"
          />
          <SubmitButton variant="outline" pendingLabel="Updating…">
            Reset password
          </SubmitButton>
        </ActionForm>

        {!isMe && (
          <ActionForm
            action={setStaffActiveAction}
            confirmMessage={
              s.active
                ? `Deactivate ${s.full_name}? They will be signed out and unable to log in until reactivated.`
                : undefined
            }
          >
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="active" value={(!s.active).toString()} />
            <SubmitButton variant="outline" pendingLabel="Updating…">
              {s.active ? "Deactivate account" : "Reactivate account"}
            </SubmitButton>
          </ActionForm>
        )}
      </div>
    </details>
  );
}
