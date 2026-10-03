import "server-only";
import type { BookCast, CastMember } from "@/lib/reflections/cast";
import { REFLECTION_LIMITS } from "@/lib/reflections/types";
import type { CharacterEnrichment } from "./characters";

const MIN_CAST = 3;

function singleLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function fitsAnswer(text: string): boolean {
  return text.length > 0 && text.length <= REFLECTION_LIMITS.characterName;
}

/**
 * What a reader may see: names from a high- or medium-confidence shortlist only, and
 * nothing about sources, scores or discarded candidates. Labels must fit the reflection's
 * character field, so choosing one always saves exactly the name that was shown.
 */
export function castFromEnrichment(enrichment: CharacterEnrichment): BookCast | null {
  if (enrichment.status !== "enriched") return null;
  if (enrichment.confidence !== "high" && enrichment.confidence !== "medium") return null;

  const seen = new Set<string>();
  const characters: CastMember[] = [];
  for (const character of enrichment.characters) {
    if (character.confidence === "low") continue;
    const label = singleLine(character.label);
    if (!fitsAnswer(label) || seen.has(label)) continue;
    seen.add(label);
    const aliases = character.aliases.map(singleLine).filter((alias) => fitsAnswer(alias) && alias !== label);
    characters.push({ label, aliases });
  }
  return characters.length >= MIN_CAST ? { characters } : null;
}
