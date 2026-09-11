import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reached when a Supabase Auth session is valid but its profile row is
 * gone (see lib/auth/current-user.ts). A Server Component render can't
 * clear the session cookie itself, so getCurrentUser redirects here — a
 * real Route Handler, which can — instead of straight to /login, which
 * would just bounce back to /dashboard via the proxy's own
 * already-authenticated redirect and loop forever.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?reason=invalid_session", request.url));
}
