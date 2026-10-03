export const LOGIN_PATH = "/login";
export const SIGNUP_PATH = "/signup";
export const DEFAULT_SIGNED_IN_PATH = "/library";

const protectedPrefixes = ["/library", "/profile"] as const;

export function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Accepts only same-site relative paths for post-login redirects, so a crafted
 * `?next=` can never send someone to another origin.
 */
export function safeNextPath(value: unknown, fallback: string = DEFAULT_SIGNED_IN_PATH): string {
  if (typeof value !== "string" || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (value === LOGIN_PATH || value === SIGNUP_PATH) return fallback;
  return value;
}

export function loginPathFor(nextPath: string): string {
  return `${LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`;
}
