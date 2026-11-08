"use server";

import { revalidatePath } from "next/cache";
import {
  createStaffAccount,
  updateStaffProfile,
  setStaffActive,
  resetStaffPassword,
  setSalesmanAreas,
  swapSalesmenAreas,
} from "@/lib/staff";
import type { Role } from "@/lib/auth";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export async function createStaffAccountAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || undefined;
  const role = String(formData.get("role") ?? "salesman") as Role;
  const area_ids = formData.getAll("area_ids").map(String);
  const move_customers = formData.get("move_customers") === "on";

  try {
    await createStaffAccount({ email, password, full_name, phone, role, area_ids, move_customers });
  } catch (err) {
    return fail(err, "Could not create account.");
  }

  revalidateAreas();
  return ok(`Account created for ${full_name}.`);
}

function revalidateAreas() {
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/areas");
  revalidatePath("/admin/clients");
}

const movedText = (n: number) => (n === 0 ? "" : ` ${n} customer${n === 1 ? "" : "s"} moved.`);

export async function setSalesmanAreasAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const areaIds = formData.getAll("area_ids").map(String);
  const move = formData.get("move_customers") === "on";

  let moved = 0;
  try {
    moved = await setSalesmanAreas(id, areaIds, move);
  } catch (err) {
    return fail(err, "Could not save the areas.");
  }

  revalidateAreas();
  return ok(`Areas saved.${movedText(moved)}`);
}

export async function swapSalesmenAreasAction(formData: FormData): Promise<ActionResult> {
  const a = String(formData.get("salesman_a") ?? "");
  const b = String(formData.get("salesman_b") ?? "");

  let moved = 0;
  try {
    moved = await swapSalesmenAreas(a, b);
  } catch (err) {
    return fail(err, "Could not swap the areas.");
  }

  revalidateAreas();
  return ok(`Areas swapped.${movedText(moved)}`);
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
