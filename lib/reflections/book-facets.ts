import type { ThemeKey } from "@/lib/enrichment/theme-vocabulary";
import type { CastMember } from "./cast";

/**
 * What a reader-facing surface may know about a book's enrichment: trusted options
 * only, or why a dimension is unavailable. No sources, scores or raw records. Each
 * dimension stands alone — a book can have themes without characters or places.
 */

export type ReaderTheme = { key: ThemeKey; label: string };
export type ReaderPlace = { label: string; aliases: string[] };

export type FacetUnavailableReason =
  | "sources-unavailable"
  | "not-enough-trusted-characters"
  | "not-enough-trusted-themes"
  | "no-places"
  | "only-broad-places"
  | "insufficient-specific-places"
  | "catalogue-noise";

export type Facet<T> = { status: "available"; options: T[] } | { status: "unavailable"; reason: FacetUnavailableReason };

export type BookFacets = {
  characters: Facet<CastMember>;
  themes: Facet<ReaderTheme>;
  places: Facet<ReaderPlace>;
};
