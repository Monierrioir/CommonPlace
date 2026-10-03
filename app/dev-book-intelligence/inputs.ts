// TEMPORARY development diagnostics for Book Intelligence research — delete with this folder.
import "server-only";
import { searchBooks } from "@/lib/books/search";
import { analyzeBook, type BookIntelligenceReport } from "@/lib/book-intelligence/analyze";
import { WORK_ID_PATTERN } from "@/lib/enrichment/open-library";

export type SearchParams = Record<string, string | string[] | undefined>;

// Found through the app's own search, like the other dev page — never a hard-coded mapping.
const DEFAULT_QUERY = "oblomov goncharov";

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export async function buildReport(params: SearchParams): Promise<{ origin: string; report: BookIntelligenceReport } | null> {
  const requested = first(params.work);
  const pinned = Number(first(params.gutenberg));
  const pinnedId = Number.isInteger(pinned) && pinned > 0 ? pinned : null;
  let workId = WORK_ID_PATTERN.test(requested) ? requested : "";
  let origin = workId ? "work id" : "";
  if (!workId) {
    const query = first(params.q) || DEFAULT_QUERY;
    const outcome = await searchBooks(query.slice(0, 200));
    const top = outcome.status === "ok" ? outcome.results[0] : undefined;
    if (!top) return null;
    workId = top.providerId;
    origin = `search “${query}” → ${top.title}`;
  }
  return { origin, report: await analyzeBook(workId, pinnedId) };
}
