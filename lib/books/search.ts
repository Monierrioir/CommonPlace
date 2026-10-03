import { searchOpenLibrary } from "./open-library";
import type { BookSearchOutcome } from "./types";

export const MAX_QUERY_LENGTH = 200;

/** Collapses whitespace, trims, and caps length. Returns "" when there is nothing to search. */
export function normalizeSearchQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

export function searchPath(query: string): string {
  return `/search?${new URLSearchParams({ q: query })}`;
}

export async function searchBooks(query: string): Promise<BookSearchOutcome> {
  if (!query) return { status: "ok", query, results: [], totalMatches: 0 };
  return searchOpenLibrary(query);
}
