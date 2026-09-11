import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/domain/types";

export type CurrentUser = {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    // A valid Supabase Auth session with no matching profile row (e.g. the
    // profile was deleted directly in the database while the auth user
    // still exists) would otherwise loop forever: this function returning
    // null sends the caller to /login, but the proxy's own "already
    // authenticated -> /dashboard" rule immediately bounces it back, since
    // the session itself is still perfectly valid. A Server Component
    // render can't clear the session cookie itself (see
    // createSupabaseServerClient's setAll), so route through a handler that
    // can, instead of returning null here.
    redirect("/auth/invalid-session");
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    role: profile.role as Role,
  };
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
