"use server";

import { revalidatePath } from "next/cache";
import {
  createStaffAccount,
  updateStaffProfile,
  setStaffActive,
  resetStaffPassword,
} from "@/lib/staff";
import type { Role } from "@/lib/auth";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export async function createStaffAccountAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || undefined;
  const role = String(formData.get("role") ?? "salesman") as Role;

  try {
    await createStaffAccount({ email, password, full_name, phone, role });
  } catch (err) {
    return fail(err, "Could not create account.");
  }

  revalidatePath("/admin/accounts");
  return ok(`Account created for ${full_name}.`);
}

export async function updateStaffProfileAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;

  try {
    await updateStaffProfile(id, { full_name, phone });
  } catch (err) {
    return fail(err, "Could not save changes.");
  }

  revalidatePath("/admin/accounts");
  return ok("Saved.");
}

export async function setStaffActiveAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  try {
    await setStaffActive(id, active);
  } catch (err) {
    return fail(err, "Could not update the account.");
  }

  revalidatePath("/admin/accounts");
  return ok(active ? "Account reactivated." : "Account deactivated.");
}

export async function resetStaffPasswordAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await resetStaffPassword(id, password);
  } catch (err) {
    return fail(err, "Could not reset the password.");
  }

  return ok("Password updated.");
}
