// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import "server-only";
import { ENRICHMENT_USER_AGENT, fetchJson, isRecord, type FetchOutcome } from "@/lib/enrichment/http";

const CACHE_SECONDS = 60 * 60 * 24 * 7;
const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

/** Plain-text fetch through Next's data cache. Bodies over 2 MB are not cached, so callers keep to smaller files. */
export async function fetchText(url: string, timeoutMs: number): Promise<FetchOutcome<string>> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "text/plain, text/html", "User-Agent": ENRICHMENT_USER_AGENT },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return { ok: false, error: `responded with ${response.status}` };
    return { ok: true, data: await response.text() };
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return { ok: false, error: `timed out after ${timeoutMs} ms` };
    }
    return { ok: false, error: "request failed" };
  }
}

export type Binding = Record<string, { value: string } | undefined>;

export async function sparql(query: string): Promise<FetchOutcome<Binding[]>> {
  const params = new URLSearchParams({ query, format: "json" });
  const result = await fetchJson(`${SPARQL_ENDPOINT}?${params}`, { timeoutMs: 15000, accept: "application/sparql-results+json" });
  if (!result.ok) return result;
  const bindings =
    isRecord(result.data) && isRecord(result.data.results) && Array.isArray(result.data.results.bindings)
      ? (result.data.results.bindings as Binding[])
      : null;
  return bindings ? { ok: true, data: bindings } : { ok: false, error: "unexpected SPARQL response" };
}

export { fetchJson, isRecord };
