import { createClient } from "@/lib/supabase/server";

export type Area = {
  id: string;
  name: string;
};

export type AreaWithSalesmen = Area & {
  salesmen: { id: string; full_name: string }[];
};

export async function listAreas(): Promise<Area[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("areas").select("id, name").order("name");
  return data ?? [];
}

type AssignmentRow = {
  area_id: string;
  salesman: { id: string; full_name: string } | null;
};

export async function listAreasWithSalesmen(): Promise<AreaWithSalesmen[]> {
  const supabase = await createClient();

  const [{ data: areas }, { data: assignmentsData }] = await Promise.all([
    supabase.from("areas").select("id, name").order("name"),
    supabase
      .from("salesman_areas")
      .select("area_id, salesman:profiles(id, full_name)"),
  ]);

  const assignments = (assignmentsData ?? []) as unknown as AssignmentRow[];

  return (areas ?? []).map((area) => ({
    ...area,
    salesmen: assignments
      .filter((a) => a.area_id === area.id)
      .map((a) => a.salesman)
      .filter((s): s is { id: string; full_name: string } => Boolean(s)),
  }));
}

export async function createArea(name: string) {
  if (!name) throw new Error("Area name is required.");

  const supabase = await createClient();
  const { error } = await supabase.from("areas").insert({ name });
  if (error) throw new Error(error.message);
}

export async function deleteArea(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("areas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function assignSalesmanToArea(salesmanId: string, areaId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("salesman_areas")
    .insert({ salesman_id: salesmanId, area_id: areaId });
  if (error) throw new Error(error.message);
}

export async function unassignSalesmanFromArea(
  salesmanId: string,
  areaId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("salesman_areas")
    .delete()
    .eq("salesman_id", salesmanId)
    .eq("area_id", areaId);
  if (error) throw new Error(error.message);
}
