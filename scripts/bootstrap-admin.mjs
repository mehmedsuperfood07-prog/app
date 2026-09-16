// One-time seed for the very first admin account. Every account after
// this one is created through the in-app Staff Accounts page (which
// requires being signed in as an admin already).
//
// Usage: node scripts/bootstrap-admin.mjs <email> <password> "<full name>"

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.",
  );
  process.exit(1);
}

const [, , email, password, fullName] = process.argv;

if (!email || !password || !fullName) {
  console.error(
    'Usage: node scripts/bootstrap-admin.mjs <email> <password> "<full name>"',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName, role: "admin" },
});

if (error) {
  console.error("Failed to create admin:", error.message);
  process.exit(1);
}

console.log("Admin account created:", data.user.id, data.user.email);
