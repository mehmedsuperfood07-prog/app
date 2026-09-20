"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClientRecord,
  updateClientRecord,
  setClientActive,
  createMyClient,
  type ClientInput,
  type NewClientInput,
} from "@/lib/clients";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

function parseClientInput(formData: FormData): ClientInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    customer_type: String(
      formData.get("customer_type") ?? "general_store",
    ) as ClientInput["customer_type"],
    address: String(formData.get("address") ?? "").trim() || null,
    area_id: String(formData.get("area_id") ?? "") || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    credit_limit: Number(formData.get("credit_limit") ?? 0),
    assigned_salesman_id: String(formData.get("assigned_salesman_id") ?? "") || null,
  };
}

export async function createClientAction(formData: FormData): Promise<ActionResult> {
  const input = parseClientInput(formData);
  try {
    await createClientRecord(input);
  } catch (err) {
    return fail(err, "Could not create client.");
  }

  revalidatePath("/admin/clients");
  return ok(`${input.name} added.`);
}

export async function updateClientAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");

  try {
    await updateClientRecord(id, parseClientInput(formData));
  } catch (err) {
    return fail(err, "Could not update client.");
  }

  revalidatePath("/admin/clients");
  return ok("Client saved.");
}

export async function toggleClientActiveAction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  try {
    await setClientActive(id, active);
  } catch (err) {
    return fail(err, "Could not update client.");
  }

  revalidatePath("/admin/clients");
  return ok(active ? "Client activated." : "Client deactivated.");
}

function parseNewClientInput(formData: FormData): NewClientInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    customer_type: String(
      formData.get("customer_type") ?? "general_store",
    ) as NewClientInput["customer_type"],
    address: String(formData.get("address") ?? "").trim() || null,
    area_id: String(formData.get("area_id") ?? "") || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    credit_limit: Number(formData.get("credit_limit") ?? 0),
  };
}

export async function createMyClientAction(formData: FormData): Promise<ActionResult | void> {
  try {
    await createMyClient(parseNewClientInput(formData));
  } catch (err) {
    return fail(err, "Could not create client.");
  }

  redirect("/salesman?created=1");
}
