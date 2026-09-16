"use server";

import { createClient } from "@/lib/supabase/server";
import { roleHome } from "@/lib/auth";
import { redirect } from "next/navigation";

// TEMPORARY debug helper — reports only structural facts (length, and
// the index/code of the first character outside Latin-1) so it never
// logs the actual secret/password content itself.
function scanForBadChar(label: string, value: string | undefined) {
  if (!value) return { label, present: false };
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code > 255) {
      return { label, present: true, length: value.length, badIndex: i, badCode: code };
    }
  }
  return { label, present: true, length: value.length, badIndex: null };
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    // TEMPORARY: server-side only (Vercel Runtime Logs), never shown to
    // the visitor — diagnosing a deployment issue. Remove once resolved.
    console.error("[login debug] signInWithPassword failed:", {
      email,
      status: error?.status,
      code: error?.code,
      message: error?.message,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      passwordScan: scanForBadChar("password", password),
      anonKeyScan: scanForBadChar("anonKey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      serviceKeyScan: scanForBadChar("serviceKey", process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    redirect("/login?error=invalid");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .single();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    redirect("/login?error=inactive");
  }

  redirect(roleHome(profile.role));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
