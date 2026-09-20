"use server";

import { revalidatePath } from "next/cache";
import {
  createArea,
  deleteArea,
  assignSalesmanToArea,
  unassignSalesmanFromArea,
} from "@/lib/areas";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export async function createAreaAction(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();

  try {
    await createArea(name);
  } catch (err) {
    return fail(err, "Could not create area.");
  }

  revalidatePath("/admin/areas");
  return ok(`${name} added.`);
}

export async function deleteAreaAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");

  try {
    await deleteArea(id);
  } catch (err) {
    return fail(err, "Could not delete area.");
  }

  revalidatePath("/admin/areas");
  return ok("Area deleted.");
}

export async function assignSalesmanAction(formData: FormData): Promise<ActionResult> {
  const areaId = String(formData.get("area_id") ?? "");
  const salesmanId = String(formData.get("salesman_id") ?? "");
  if (!salesmanId) return { ok: false, error: "Choose a salesman first." };

  try {
    await assignSalesmanToArea(salesmanId, areaId);
  } catch (err) {
    return fail(err, "Could not assign salesman.");
  }

  revalidatePath("/admin/areas");
  return ok("Salesman assigned.");
}

export async function unassignSalesmanAction(formData: FormData): Promise<ActionResult> {
  const areaId = String(formData.get("area_id") ?? "");
  const salesmanId = String(formData.get("salesman_id") ?? "");

  try {
    await unassignSalesmanFromArea(salesmanId, areaId);
  } catch (err) {
    return fail(err, "Could not remove salesman.");
  }

  revalidatePath("/admin/areas");
  return ok("Salesman removed.");
}
