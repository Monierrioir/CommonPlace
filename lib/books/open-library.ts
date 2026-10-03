import { openLibraryCoverUrl } from "./covers";
import type { BookSearchOutcome, BookSearchResult } from "./types";

const SEARCH_ENDPOINT = "https://openlibrary.org/search.json";
const WORKS_BASE_URL = "https://openlibrary.org/works";

const SEARCH_FIELDS = [
  "key",
  "title",
  "author_name",
  "first_publish_year",
  "cover_i",
  "edition_count",
] as const;

const RESULT_LIMIT = 24;
const REQUEST_TIMEOUT_MS = 8000;
const REVALIDATE_SECONDS = 60 * 60;
// Open Library asks API consumers to identify themselves.
const USER_AGENT = "Commonplace/0.1 (private beta)";

type OpenLibrarySearchField = (typeof SEARCH_FIELDS)[number];

/** Subset of a Search API document, limited to the `fields` we request. */
export type OpenLibrarySearchDoc = {
  key: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
};

export type OpenLibrarySearchResponse = {
  numFound: number;
  start: number;
  docs: OpenLibrarySearchDoc[];
};

function isSearchResponse(value: unknown): value is { numFound: number; docs: unknown[] } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.numFound === "number" && Array.isArray(candidate.docs);
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function normalizeDoc(doc: unknown): BookSearchResult | null {
  if (typeof doc !== "object" || doc === null) return null;
  const raw = doc as Partial<Record<OpenLibrarySearchField, unknown>>;

  const workId = typeof raw.key === "string" ? /^\/works\/(OL\d+W)$/.exec(raw.key)?.[1] : undefined;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!workId || !title) return null;

  const authors = Array.isArray(raw.author_name)
    ? raw.author_name
        .filter((name): name is string => typeof name === "string")
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  const coverId = positiveInteger(raw.cover_i);

  return {
    provider: "openlibrary",
    providerId: workId,
    title,
    authors: [...new Set(authors)],
    firstPublishYear: positiveInteger(raw.first_publish_year),
    editionCount: positiveInteger(raw.edition_count),
    // L is fetched once by the image optimizer and resized, so covers stay sharp on high-DPI screens.
    cover: coverId ? { sourceId: String(coverId), url: openLibraryCoverUrl(coverId, "L") } : null,
    providerUrl: `${WORKS_BASE_URL}/${workId}`,
  };
}

export async function searchOpenLibrary(query: string): Promise<BookSearchOutcome> {
  const params = new URLSearchParams({
    q: query,
    fields: SEARCH_FIELDS.join(","),
    limit: String(RESULT_LIMIT),
  });

  try {
    const response = await fetch(`${SEARCH_ENDPOINT}?${params}`, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[open-library] search responded with ${response.status}`);
      return { status: "error", query };
    }

    const data: unknown = await response.json();
    if (!isSearchResponse(data)) {
      console.error("[open-library] unexpected search response shape");
      return { status: "error", query };
    }

    const seen = new Set<string>();
    const results: BookSearchResult[] = [];
    for (const doc of data.docs) {
      const book = normalizeDoc(doc);
      if (book && !seen.has(book.providerId)) {
        seen.add(book.providerId);
        results.push(book);
      }
    }

    return { status: "ok", query, results, totalMatches: data.numFound };
  } catch (error) {
    console.error("[open-library] search request failed", error);
    return { status: "error", query };
  }
}
