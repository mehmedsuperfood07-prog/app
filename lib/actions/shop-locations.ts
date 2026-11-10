"use server";

import { revalidatePath } from "next/cache";
import { reviewShopLocation, setShopLocation } from "@/lib/shop-locations";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export async function reviewShopLocationAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("client_id") ?? "");
  const confirm = formData.get("confirm") === "true";
  try {
    await reviewShopLocation(id, confirm);
  } catch (err) {
    return fail(err, "Could not update the location.");
  }
  revalidatePath("/admin/shop-locations");
  return ok(confirm ? "Location confirmed." : "Location removed. It can be saved again.");
}

export async function setShopLocationAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("client_id") ?? "");
  try {
    await setShopLocation(id, String(formData.get("coordinates") ?? ""));
  } catch (err) {
    return fail(err, "Could not save the location.");
  }
  revalidatePath("/admin/shop-locations");
  return ok("Location saved and confirmed.");
}
