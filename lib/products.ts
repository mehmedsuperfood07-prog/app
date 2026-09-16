import { createClient } from "@/lib/supabase/server";

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

export async function listProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, variant, unit, pack_size, default_price, category, active")
    .order("name");
  return data ?? [];
}

export async function createProduct(input: ProductInput) {
  if (!input.name || !input.pack_size) {
    throw new Error("Name and pack size are required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert(input);
  if (error) throw new Error(error.message);
}

export async function updateProduct(id: string, input: ProductInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setProductActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ active })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
