"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProduct,
  updateProduct,
  setProductActive,
  type ProductInput,
} from "@/lib/products";

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

export async function createProductAction(formData: FormData) {
  try {
    await createProduct(parseProductInput(formData));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create product.";
    redirect(`/admin/products?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/products");
}

export async function updateProductAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  try {
    await updateProduct(id, parseProductInput(formData));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update product.";
    redirect(`/admin/products?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/products");
}

export async function toggleProductActiveAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  await setProductActive(id, active);

  revalidatePath("/admin/products");
}
