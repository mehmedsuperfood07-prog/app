"use server";

import { revalidatePath } from "next/cache";
import {
  createProduct,
  updateProduct,
  setProductActive,
  type ProductInput,
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
