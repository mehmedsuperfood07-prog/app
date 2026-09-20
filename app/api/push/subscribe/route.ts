import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Registers this browser for push as the CURRENT signed-in user — user_id
// always comes from the session, never from the request body, so nobody
// can subscribe on another user's behalf.
//
// The write goes through the service-role client on purpose: the endpoint
// column is unique per browser, and when someone signs in as a different
// user on a browser that was last used by someone else (e.g. demoing
// admin, then rider, on one laptop) the existing row belongs to the
// previous user. RLS would block that user from updating it, leaving the
// browser subscribed to the wrong person's notifications. The endpoint is
// a secret URL only that browser knows, so whoever presents it *is* the
// device's current user.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const endpoint: unknown = body?.endpoint;
  const p256dh: unknown = body?.keys?.p256dh;
  const auth: unknown = body?.keys?.auth;

  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    endpoint.length > 2048 ||
    typeof p256dh !== "string" ||
    typeof auth !== "string" ||
    p256dh.length > 256 ||
    auth.length > 256
  ) {
    return NextResponse.json({ error: "Malformed subscription." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint, p256dh, auth },
    { onConflict: "endpoint" },
  );

  if (error) return NextResponse.json({ error: "Could not save subscription." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
