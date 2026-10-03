import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { loginPathFor } from "./routes";

export type CurrentUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

/**
 * The verified signed-in user for this request, or null. Identity comes from
 * `getClaims()`, which validates the JWT signature rather than trusting the cookie.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  const rawName = claims.user_metadata?.display_name;
  const displayName = typeof rawName === "string" && rawName.trim() ? rawName.trim() : null;

  return { id: claims.sub, email: claims.email ?? null, displayName };
});

/** Use in protected pages: returns the user or redirects to login, preserving the destination. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPathFor(returnTo));
  return user;
}

export function userInitial(user: CurrentUser): string {
  const source = user.displayName ?? user.email ?? "";
  return source.trim().charAt(0).toLocaleUpperCase() || "·";
}
