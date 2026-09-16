"use server";

import { redirect } from "next/navigation";
import { createStaffAccount } from "@/lib/staff";
import type { Role } from "@/lib/auth";

export async function createStaffAccountAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || undefined;
  const role = String(formData.get("role") ?? "salesman") as Role;

  try {
    await createStaffAccount({ email, password, full_name, phone, role });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create account.";
    redirect(`/admin/accounts?error=${encodeURIComponent(message)}`);
  }

  redirect("/admin/accounts?created=1");
}
