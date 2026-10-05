import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // .well-known holds the Digital Asset Links file that ties the Android
    // app to this site; Google's checker and Android fetch it with no
    // cookies and no patience for extra work, so it skips the session refresh.
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
