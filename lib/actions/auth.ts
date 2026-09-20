"use server";

import { createClient } from "@/lib/supabase/server";
import { roleHome } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/actions/result";

export async function login(formData: FormData): Promise<ActionResult | void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { ok: false, error: "Incorrect email or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .single();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    return { ok: false, error: "This account has been deactivated." };
  }

  redirect(roleHome(profile.role));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
