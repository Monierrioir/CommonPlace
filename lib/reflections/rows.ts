import {
  LIKED_ASPECTS,
  REFLECTION_EMOTIONS,
  WORLD_ANSWERS,
  type BookReflection,
  type Rating,
  type WorldAnswer,
} from "./types";

/** Mapping between public.book_reflections rows and the app's reflection type. */

export const REFLECTION_COLUMNS =
  "rating, favorite_character, least_favorite_character, liked_aspects, emotions, would_live_there, final_thought, created_at, updated_at";

export type ReflectionRow = {
  rating: number | null;
  favorite_character: string | null;
  least_favorite_character: string | null;
  liked_aspects: string[] | null;
  emotions: string[] | null;
  would_live_there: string | null;
  final_thought: string | null;
  created_at: string;
  updated_at: string;
};

function knownSelection<T extends string>(values: string[] | null, options: readonly T[]): T[] {
  const chosen = new Set(values ?? []);
  return options.filter((option) => chosen.has(option));
}

export function toBookReflection(row: ReflectionRow): BookReflection {
  return {
    rating: row.rating !== null && row.rating >= 1 && row.rating <= 5 ? (row.rating as Rating) : null,
    favoriteCharacter: row.favorite_character,
    leastFavoriteCharacter: row.least_favorite_character,
    likedAspects: knownSelection(row.liked_aspects, LIKED_ASPECTS),
    emotions: knownSelection(row.emotions, REFLECTION_EMOTIONS),
    wouldLiveThere: (WORLD_ANSWERS as readonly (string | null)[]).includes(row.would_live_there)
      ? (row.would_live_there as WorldAnswer)
      : null,
    finalThought: row.final_thought,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
