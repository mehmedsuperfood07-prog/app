import "server-only";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";

export type ShopRow = {
  id: string;
  name: string;
  address: string | null;
  area: string | null;
  salesman: string | null;
  location: { latitude: number; longitude: number; accuracy_m: number | null; status: "pending" | "confirmed"; saved_at: string } | null;
};

export async function listShopLocations(): Promise<ShopRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, address, area:areas(name), salesman:profiles(full_name), location:client_locations(latitude, longitude, accuracy_m, status, saved_at)")
    .eq("active", true)
    .order("name");
  type Row = Omit<ShopRow, "area" | "salesman"> & { area: { name: string } | null; salesman: { full_name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({ ...r, area: r.area?.name ?? null, salesman: r.salesman?.full_name ?? null }));
}

export async function reviewShopLocation(clientId: string, confirm: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_client_location", { p_client: clientId, p_confirm: confirm });
  if (error) throw new Error(dbErrorMessage(error));
}

export async function setShopLocation(clientId: string, coordinates: string) {
  const match = coordinates.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) throw new Error("Copy the two numbers from the map, like 31.5204, 74.3587.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_client_location", { p_client: clientId, p_lat: Number(match[1]), p_lng: Number(match[2]) });
  if (error) throw new Error(dbErrorMessage(error));
}
