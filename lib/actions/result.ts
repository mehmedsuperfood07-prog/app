// Not a "use server" file on purpose: server-action modules may only
// export async functions, and these are plain helpers shared by all of
// them. Actions return one of these instead of redirecting with the
// message in the URL, so forms can show a toast in place without
// scrolling the page or leaving a stale ?error= behind.

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export function ok(message?: string): ActionResult {
  return { ok: true, message };
}

export function fail(err: unknown, fallback = "Something went wrong."): ActionResult {
  return { ok: false, error: err instanceof Error && err.message ? err.message : fallback };
}
