import { createClient } from "@/lib/supabase/server";

export const CUSTOMER_TYPES = [
  "general_store",
  "departmental_store",
  "bakery",
  "factory_canteen",
  "distributor",
] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  general_store: "General Store",
  departmental_store: "Departmental Store",
  bakery: "Bakery",
  factory_canteen: "Factory / Staff Canteen",
  distributor: "Distributor",
};

export type ClientRecord = {
  id: string;
  name: string;
  customer_type: CustomerType;
  address: string | null;
  phone: string | null;
  credit_limit: number;
  current_balance: number;
  active: boolean;
  area: { id: string; name: string } | null;
  salesman: { id: string; full_name: string } | null;
};

export type ClientInput = {
  name: string;
  customer_type: CustomerType;
  address?: string | null;
  area_id?: string | null;
  phone?: string | null;
  credit_limit: number;
  assigned_salesman_id?: string | null;
};

export async function listClients(): Promise<ClientRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select(
      "id, name, customer_type, address, phone, credit_limit, current_balance, active, area:areas(id, name), salesman:profiles(id, full_name)",
    )
    .order("name");
  return (data ?? []) as unknown as ClientRecord[];
}

export async function createClientRecord(input: ClientInput) {
  if (!input.name) throw new Error("Client name is required.");

  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert(input);
  if (error) throw new Error(error.message);
}

export async function updateClientRecord(id: string, input: ClientInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setClientActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ active })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
