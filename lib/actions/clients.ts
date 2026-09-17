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

export async function createClientAction(formData: FormData) {
  try {
    await createClientRecord(parseClientInput(formData));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create client.";
    redirect(`/admin/clients?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/clients");
}

export async function updateClientAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  try {
    await updateClientRecord(id, parseClientInput(formData));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update client.";
    redirect(`/admin/clients?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/clients");
}

export async function toggleClientActiveAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  try {
    await setClientActive(id, active);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update client.";
    redirect(`/admin/clients?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/clients");
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

export async function createMyClientAction(formData: FormData) {
  try {
    await createMyClient(parseNewClientInput(formData));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create client.";
    redirect(`/salesman/clients/new?error=${encodeURIComponent(message)}`);
  }

  redirect("/salesman?created=1");
}
