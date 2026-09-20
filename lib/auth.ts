import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Role = "admin" | "salesman" | "rider";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: Role;
  active: boolean;
};

export function roleHome(role: Role) {
  switch (role) {
    case "admin":
      return "/admin";
    case "salesman":
      return "/salesman";
    case "rider":
      return "/rider";
  }
}

// Memoized per request: a page's layout and the page itself both need the
// signed-in profile, and without this each would repeat the auth check
// and profile query — two extra database round trips on every screen.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, active")
    .eq("id", user.id)
    .single();

  return profile;
});

// Server Component layout guard: redirects to /login if signed out, to the
// user's own role home if signed in as the wrong role.
export async function requireRole(role: Role): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (!profile.active) redirect("/login?error=inactive");
  if (profile.role !== role) redirect(roleHome(profile.role));

  return profile;
}
