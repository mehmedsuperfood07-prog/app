import { redirect } from "next/navigation";
import { getCurrentProfile, roleHome } from "@/lib/auth";

export default async function Home() {
  const profile = await getCurrentProfile();

  redirect(profile ? roleHome(profile.role) : "/login");
}
