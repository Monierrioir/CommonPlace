import "server-only";

/**
 * Polite, never-throwing JSON fetches for open metadata sources. Responses go
 * through Next's data cache, so each URL — and therefore each work — is fetched
 * at most once per revalidation window, whichever reader triggers it.
 */

const CACHE_SECONDS = 60 * 60 * 24 * 7;

// Open Library and Wikimedia both ask clients to identify themselves; a contact
// address (optional, not a secret) raises Open Library's rate limit.
const contact = process.env.ENRICHMENT_CONTACT?.trim();
export const ENRICHMENT_USER_AGENT = `Commonplace/0.1 (private beta; book enrichment${contact ? `; ${contact}` : ""})`;

export type FetchOutcome<T> = { ok: true; data: T } | { ok: false; error: string };

export async function fetchJson(
  url: string,
  { timeoutMs, accept = "application/json" }: { timeoutMs: number; accept?: string },
): Promise<FetchOutcome<unknown>> {
  try {
    const response = await fetch(url, {
      headers: { Accept: accept, "User-Agent": ENRICHMENT_USER_AGENT },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404) return { ok: false, error: "not found (404)" };
    if (response.status === 429) return { ok: false, error: "rate limited (429)" };
    if (!response.ok) return { ok: false, error: `responded with ${response.status}` };
    return { ok: true, data: await response.json() };
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return { ok: false, error: `timed out after ${timeoutMs} ms` };
    }
    return { ok: false, error: "request failed" };
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
