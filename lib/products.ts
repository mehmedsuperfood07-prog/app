import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";

export { PRODUCT_UNITS, type ProductUnit } from "@/lib/constants";
import type { ProductUnit } from "@/lib/constants";

export type Product = {
  id: string;
  name: string;
  variant: string | null;
  unit: ProductUnit;
  pack_size: string;
  default_price: number;
  category: string | null;
  active: boolean;
};

export type ProductInput = {
  name: string;
  variant?: string | null;
  unit: ProductUnit;
  pack_size: string;
  default_price: number;
  category?: string | null;
};

function validateProduct(input: ProductInput) {
  if (!input.name || !input.pack_size) {
    throw new Error("Name and pack size are required.");
  }
  if (!Number.isFinite(input.default_price) || input.default_price < 0) {
    throw new Error("Enter a valid price.");
  }
}

export async function listProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, variant, unit, pack_size, default_price, category, active")
    .order("name");
  return data ?? [];
}

export async function createProduct(input: ProductInput) {
  validateProduct(input);

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert(input);
  if (error) throw new Error(dbErrorMessage(error));
}

export async function updateProduct(id: string, input: ProductInput) {
  validateProduct(input);

  const supabase = await createClient();
  const { error } = await supabase.from("products").update(input).eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
}

export async function setProductActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ active })
    .eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
}

// The pack sizes the product form offers (owner, 2026-11-21): a list the office adds to itself.
export type PackSize = { id: string; unit: ProductUnit; size: string; active: boolean };

// Numbers in order (1, 2, 5, 10, 25, 50), then any others by name.
export function sortPackSizes<T extends { size: string }>(sizes: T[]): T[] {
  const num = (s: string) => (/^\d+(\.\d+)?$/.test(s) ? Number(s) : Infinity);
  return [...sizes].sort((a, b) => num(a.size) - num(b.size) || a.size.localeCompare(b.size));
}

export async function listPackSizes(): Promise<PackSize[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("pack_sizes").select("id, unit, size, active");
  return sortPackSizes((data ?? []) as PackSize[]);
}

export async function addPackSize(unit: ProductUnit, size: string): Promise<PackSize> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_pack_size", { p_unit: unit, p_size: size });
  if (error) throw new Error(dbErrorMessage(error));
  const row = data as PackSize;
  return { id: row.id, unit: row.unit, size: row.size, active: row.active };
}

export async function setPackSizeActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_pack_size_active", { p_id: id, p_active: active });
  if (error) throw new Error(dbErrorMessage(error));
}

export async function removePackSize(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_pack_size", { p_id: id });
  if (error) throw new Error(dbErrorMessage(error));
}
