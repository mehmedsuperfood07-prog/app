import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, type Role } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";

export type CreateStaffInput = {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: Role;
  area_ids?: string[];
  move_customers?: boolean;
};

const ROLES: Role[] = ["admin", "salesman", "rider", "office", "assistant"];
const MIN_PASSWORD_LENGTH = 6;

// The admin API bypasses RLS entirely, so the admin-only check has to
// happen here rather than relying on the database.
async function requireAdminCaller() {
  const caller = await getCurrentProfile();
  if (!caller || caller.role !== "admin") {
    throw new Error("Only an admin can manage staff accounts.");
  }
  return caller;
}

function validatePassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

export async function createStaffAccount(input: CreateStaffInput) {
  await requireAdminCaller();

  if (!input.full_name) throw new Error("Full name is required.");
  if (!/^\S+@\S+$/.test(input.email)) throw new Error("Enter a valid email address.");
  if (!ROLES.includes(input.role)) throw new Error("Choose a valid role.");
  validatePassword(input.password);

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      phone: input.phone ?? null,
    },
    // The role goes in app_metadata, which only the server can set. The database takes a new
    // login's role from there and ignores one in user_metadata, which anyone signing up could
    // fill in (supabase/migrations/20261114000000_security_tightening.sql).
    app_metadata: { role: input.role },
  });

  if (error) throw new Error(error.message);
  // Belt and braces: the profile gets the chosen role even if the database is older than
  // that migration, or a later change to the sign-up trigger misses it.
  {
    const { error: roleError } = await admin.from("profiles").update({ role: input.role }).eq("id", data.user.id);
    if (roleError) throw new Error(roleError.message);
  }

  if (input.role === "salesman" && input.area_ids?.length) {
    await setSalesmanAreas(data.user.id, input.area_ids, input.move_customers ?? false);
  }

  return data.user;
}

// Which areas a salesman covers. Returns how many customers moved to them.
export async function setSalesmanAreas(id: string, areaIds: string[], moveCustomers: boolean): Promise<number> {
  await requireAdminCaller();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_salesman_areas", {
    p_salesman: id,
    p_area_ids: areaIds,
    p_move_customers: moveCustomers,
  });
  if (error) throw new Error(dbErrorMessage(error));
  return (data as number) ?? 0;
}

// Two salesmen exchange their areas and those areas' customers. Returns how many moved.
export async function swapSalesmenAreas(a: string, b: string): Promise<number> {
  await requireAdminCaller();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_swap_salesman_areas", { p_a: a, p_b: b });
  if (error) throw new Error(dbErrorMessage(error));
  return (data as number) ?? 0;
}

export async function updateStaffProfile(
  id: string,
  input: { full_name: string; phone: string | null },
) {
  await requireAdminCaller();
  if (!input.full_name) throw new Error("Full name is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: input.full_name, phone: input.phone })
    .eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
}

// Deactivating does two things: flips profiles.active (which the app
// checks on every page load and at sign-in) AND bans the auth user, so a
// staff member who's been let go can't sign in again or refresh an
// existing session either.
export async function setStaffActive(id: string, active: boolean) {
  const caller = await requireAdminCaller();
  if (!active && id === caller.id) {
    throw new Error("You can't deactivate your own account.");
  }

  const admin = createAdminClient();
  const supabase = await createClient();

  if (active) {
    const { error: unbanError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: "none",
    });
    if (unbanError) throw new Error(unbanError.message);
  }

  const { error } = await supabase.from("profiles").update({ active }).eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));

  if (!active) {
    const { error: banError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: "876000h",
    });
    if (banError) console.error("[staff] could not ban deactivated user:", banError.message);
  }
}

export async function resetStaffPassword(id: string, password: string) {
  await requireAdminCaller();
  validatePassword(password);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) throw new Error(error.message);
}

export type StaffMember = {
  id: string;
  full_name: string;
  phone: string | null;
  role: Role;
  active: boolean;
};

export async function listStaff(): Promise<StaffMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, active")
    .order("role")
    .order("full_name");
  return (data ?? []) as StaffMember[];
}

export async function listActiveSalesmen() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "salesman")
    .eq("active", true)
    .order("full_name");
  return data ?? [];
}

export async function listActiveRiders() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "rider")
    .eq("active", true)
    .order("full_name");
  return data ?? [];
}
