import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { isSubtypeInCategory } from "@/lib/constants";
import type { PaymentTerm } from "@/components/payment-term-fields";

export {
  CLIENT_CATEGORIES,
  CLIENT_CATEGORY_LABELS,
  CLIENT_SUBTYPES_BY_CATEGORY,
  CLIENT_SUBTYPE_LABELS,
  type ClientCategory,
  type ClientSubtype,
} from "@/lib/constants";
import type { ClientCategory, ClientSubtype } from "@/lib/constants";

export type ClientRecord = {
  id: string;
  name: string;
  client_category: ClientCategory;
  client_subtype: ClientSubtype;
  address: string | null;
  phone: string | null;
  contact_person_name: string | null;
  contact_person_designation: string | null;
  contact_person_phone: string | null;
  payment_term: PaymentTerm;
  credit_limit: number;
  current_balance: number;
  active: boolean;
  area: { id: string; name: string } | null;
  salesman: { id: string; full_name: string } | null;
};

export type ClientInput = {
  name: string;
  client_category: ClientCategory;
  client_subtype: ClientSubtype;
  address?: string | null;
  area_id?: string | null;
  phone?: string | null;
  contact_person_name?: string | null;
  contact_person_designation?: string | null;
  contact_person_phone?: string | null;
  payment_term: PaymentTerm;
  credit_limit: number;
  assigned_salesman_id?: string | null;
};

const CLIENT_COLUMNS =
  "id, name, client_category, client_subtype, address, phone, contact_person_name, contact_person_designation, contact_person_phone, payment_term, credit_limit, current_balance, active, area:areas(id, name), salesman:profiles(id, full_name)";

export async function listClients(): Promise<ClientRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select(CLIENT_COLUMNS).order("name");
  return (data ?? []) as unknown as ClientRecord[];
}

// These three are the admin-only client-management operations (full edit
// access to any client, including credit_limit/active/reassignment) — as
// opposed to createMyClient below, which a salesman uses to add their own
// new client. Server Actions are independently addressable POST endpoints,
// not gated by which page links to them, so the role check has to happen
// here rather than relying on "only the admin page renders this form."
async function requireAdminCaller() {
  const caller = await getCurrentProfile();
  if (!caller || caller.role !== "admin") {
    throw new Error("Only an admin can manage client accounts.");
  }
}

function validateClient(input: {
  name: string;
  credit_limit: number;
  client_category: string;
  client_subtype: string;
  payment_term: string;
}) {
  if (!input.name) throw new Error("Client name is required.");
  if (!Number.isFinite(input.credit_limit) || input.credit_limit < 0) {
    throw new Error("Credit limit must be a number, 0 or more.");
  }
  if (!isSubtypeInCategory(input.client_category, input.client_subtype)) {
    throw new Error("Choose a valid client type.");
  }
  if (input.payment_term !== "cash" && input.payment_term !== "credit") {
    throw new Error("Choose a valid payment term.");
  }
}

// A cash client never carries a credit limit, no matter what a request
// says — the UI already hides the field for "cash", this just makes sure
// a direct/tampered request can't set one behind the scenes either.
function normalizePaymentTerm<T extends { payment_term: PaymentTerm; credit_limit: number }>(
  input: T,
): T {
  return input.payment_term === "cash" ? { ...input, credit_limit: 0 } : input;
}

export async function createClientRecord(input: ClientInput) {
  validateClient(input);
  await requireAdminCaller();

  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert(normalizePaymentTerm(input));
  if (error) throw new Error(dbErrorMessage(error));
}

export async function updateClientRecord(id: string, input: ClientInput) {
  validateClient(input);
  await requireAdminCaller();

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update(normalizePaymentTerm(input))
    .eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
}

export async function setClientActive(id: string, active: boolean) {
  await requireAdminCaller();

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ active })
    .eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
}

// Salesman-facing: RLS already scopes "clients" select/insert to the
// caller's own assigned clients, so these just add search/area narrowing
// on top of that instead of re-implementing ownership checks.
export async function listMyClients(filters: {
  search?: string;
  areaId?: string;
}): Promise<ClientRecord[]> {
  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("active", true)
    .order("name");

  if (filters.search) query = query.ilike("name", `%${filters.search}%`);
  if (filters.areaId) query = query.eq("area_id", filters.areaId);

  const { data } = await query;
  return (data ?? []) as unknown as ClientRecord[];
}

export type NewClientInput = {
  name: string;
  client_category: ClientCategory;
  client_subtype: ClientSubtype;
  address?: string | null;
  area_id?: string | null;
  phone?: string | null;
  contact_person_name?: string | null;
  contact_person_designation?: string | null;
  contact_person_phone?: string | null;
  payment_term: PaymentTerm;
  credit_limit: number;
};

export async function createMyClient(input: NewClientInput) {
  validateClient(input);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("clients")
    .insert({ ...normalizePaymentTerm(input), assigned_salesman_id: user.id });
  if (error) throw new Error(dbErrorMessage(error));
}
