"use server";

import { revalidatePath } from "next/cache";
import {
  createProduct,
  updateProduct,
  setProductActive,
  addPackSize,
  setPackSizeActive,
  removePackSize,
  type PackSize,
  type ProductInput,
  type ProductUnit,
} from "@/lib/products";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

function parseProductInput(formData: FormData): ProductInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    variant: String(formData.get("variant") ?? "").trim() || null,
    unit: String(formData.get("unit") ?? "kg") as ProductInput["unit"],
    pack_size: String(formData.get("pack_size") ?? "").trim(),
    default_price: Number(formData.get("default_price") ?? 0),
    category: String(formData.get("category") ?? "").trim() || null,
  };
}

export async function createProductAction(formData: FormData): Promise<ActionResult> {
  try {
    await createProduct(parseProductInput(formData));
  } catch (err) {
    return fail(err, "Could not create product.");
  }

  revalidatePath("/admin/products");
  return ok("Product added.");
}

export async function updateProductAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");

  try {
    await updateProduct(id, parseProductInput(formData));
  } catch (err) {
    return fail(err, "Could not update product.");
  }

  revalidatePath("/admin/products");
  return ok("Product saved.");
}

export async function toggleProductActiveAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  try {
    await setProductActive(id, active);
  } catch (err) {
    return fail(err, "Could not update product.");
  }

  revalidatePath("/admin/products");
  return ok(active ? "Product activated." : "Product deactivated.");
}

// Called straight from the product form's "Add a new size" (not a form submit), so it returns
// the size it saved for the form to choose.
export async function addPackSizeAction(
  unit: string,
  size: string,
): Promise<{ ok: true; size: PackSize } | { ok: false; error: string }> {
  try {
    const saved = await addPackSize(unit as ProductUnit, size);
    revalidatePath("/admin/products");
    return { ok: true, size: saved };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not add the size." };
  }
}

export async function setPackSizeActiveAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  try {
    await setPackSizeActive(id, active);
  } catch (err) {
    return fail(err, "Could not change the size.");
  }
  revalidatePath("/admin/products");
  return ok(active ? "Size shown on the product form again." : "Size hidden from the product form.");
}

export async function removePackSizeAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  try {
    await removePackSize(id);
  } catch (err) {
    return fail(err, "Could not remove the size.");
  }
  revalidatePath("/admin/products");
  return ok("Size removed.");
}
