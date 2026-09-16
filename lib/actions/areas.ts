"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createArea,
  deleteArea,
  assignSalesmanToArea,
  unassignSalesmanFromArea,
} from "@/lib/areas";

export async function createAreaAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();

  try {
    await createArea(name);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create area.";
    redirect(`/admin/areas?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/areas");
}

export async function deleteAreaAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  try {
    await deleteArea(id);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not delete area.";
    redirect(`/admin/areas?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/areas");
}

export async function assignSalesmanAction(formData: FormData) {
  const areaId = String(formData.get("area_id") ?? "");
  const salesmanId = String(formData.get("salesman_id") ?? "");
  if (!salesmanId) return;

  try {
    await assignSalesmanToArea(salesmanId, areaId);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not assign salesman.";
    redirect(`/admin/areas?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/areas");
}

export async function unassignSalesmanAction(formData: FormData) {
  const areaId = String(formData.get("area_id") ?? "");
  const salesmanId = String(formData.get("salesman_id") ?? "");

  await unassignSalesmanFromArea(salesmanId, areaId);

  revalidatePath("/admin/areas");
}
