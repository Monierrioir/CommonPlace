type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

/**
 * Reads the public Supabase settings. Each variable must be referenced literally
 * (`process.env.NEXT_PUBLIC_…`) so Next.js can inline it into browser bundles.
 * Errors name missing variables but never include their values.
 */
export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !publishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);

  if (!url || !publishableKey) {
    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(", ")}. ` +
        "Add them to .env.local (see the Supabase project's Connect dialog) and restart the dev server.",
    );
  }

  return { url, publishableKey };
}
