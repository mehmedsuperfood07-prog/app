import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, type Role } from "@/lib/auth";

export type CreateStaffInput = {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: Role;
};

// The admin API bypasses RLS entirely, so the admin-only check has to
// happen here rather than relying on the database.
export async function createStaffAccount(input: CreateStaffInput) {
  const caller = await getCurrentProfile();
  if (!caller || caller.role !== "admin") {
    throw new Error("Only an admin can create staff accounts.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      phone: input.phone ?? null,
      role: input.role,
    },
  });

  if (error) throw new Error(error.message);

  return data.user;
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
