import "server-only";
import type { BookFacets, Facet, ReaderPlace, ReaderTheme } from "@/lib/reflections/book-facets";
import type { CastMember } from "@/lib/reflections/cast";
import type { BookEnrichment } from "./book";
import { castFromEnrichment } from "./cast";
import type { CharacterEnrichment } from "./characters";
import type { PlaceEnrichment } from "./places";
import type { ThemeEnrichment } from "./themes";

/** Reduces enrichment results to what a reader may see. Each dimension is judged on its own. */

export function charactersFacet(characters: CharacterEnrichment): Facet<CastMember> {
  const cast = castFromEnrichment(characters);
  if (cast) return { status: "available", options: cast.characters };
  return { status: "unavailable", reason: characters.status === "failed" ? "sources-unavailable" : "not-enough-trusted-characters" };
}

export function themesFacet(themes: ThemeEnrichment): Facet<ReaderTheme> {
  if (themes.status === "enriched") {
    return { status: "available", options: themes.themes.map((theme) => ({ key: theme.key, label: theme.label })) };
  }
  return { status: "unavailable", reason: themes.status === "failed" ? "sources-unavailable" : "not-enough-trusted-themes" };
}

export function placesFacet(places: PlaceEnrichment): Facet<ReaderPlace> {
  if (!places.eligibility.eligible) return { status: "unavailable", reason: places.eligibility.reason };
  return { status: "available", options: places.places.map((place) => ({ label: place.label, aliases: place.aliases })) };
}

export function bookFacets(book: BookEnrichment): BookFacets {
  return {
    characters: charactersFacet(book.characters),
    themes: themesFacet(book.themes),
    places: placesFacet(book.places),
  };
}
