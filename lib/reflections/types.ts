/**
 * A reader's private reflection on a book they finished. Stored values are stable
 * machine-readable keys; display labels may change freely. Every list and limit
 * here mirrors a constraint in supabase/migrations/20260930120000_book_reflections.sql.
 */

export const RATINGS = [1, 2, 3, 4, 5] as const;
export type Rating = (typeof RATINGS)[number];

export const LIKED_ASPECTS = [
  "characters",
  "story",
  "world",
  "atmosphere",
  "writing",
  "themes",
  "romance",
  "pacing",
] as const;
export type LikedAspect = (typeof LIKED_ASPECTS)[number];

export const likedAspectLabels: Record<LikedAspect, string> = {
  characters: "Characters",
  story: "Story",
  world: "World",
  atmosphere: "Atmosphere",
  writing: "Writing",
  themes: "Themes",
  romance: "Romance",
  pacing: "Pacing",
};

export const REFLECTION_EMOTIONS = [
  "happy",
  "sad",
  "anxious",
  "hopeful",
  "nostalgic",
  "inspired",
  "devastated",
  "comforted",
  "unsettled",
  "thoughtful",
] as const;
export type ReflectionEmotion = (typeof REFLECTION_EMOTIONS)[number];

export const reflectionEmotionLabels: Record<ReflectionEmotion, string> = {
  happy: "Happy",
  sad: "Sad",
  anxious: "Anxious",
  hopeful: "Hopeful",
  nostalgic: "Nostalgic",
  inspired: "Inspired",
  devastated: "Devastated",
  comforted: "Comforted",
  unsettled: "Unsettled",
  thoughtful: "Thoughtful",
};

export const WORLD_ANSWERS = ["yes", "maybe", "no"] as const;
export type WorldAnswer = (typeof WORLD_ANSWERS)[number];

export const worldAnswerLabels: Record<WorldAnswer, string> = {
  yes: "Yes, take me there",
  maybe: "Maybe",
  no: "Absolutely not",
};

export const REFLECTION_LIMITS = {
  characterName: 120,
  finalThought: 1000,
} as const;

/** The answers a reader gives. Unanswered questions are null or empty, never guessed. */
export type BookReflectionInput = {
  rating: Rating | null;
  favoriteCharacter: string | null;
  leastFavoriteCharacter: string | null;
  likedAspects: LikedAspect[];
  emotions: ReflectionEmotion[];
  wouldLiveThere: WorldAnswer | null;
  finalThought: string | null;
};

export type BookReflection = BookReflectionInput & {
  /** ISO 8601 timestamps. */
  createdAt: string;
  updatedAt: string;
};

/** True when nothing was answered — such a reflection is not stored. */
export function isEmptyReflection(reflection: BookReflectionInput): boolean {
  return (
    reflection.rating === null &&
    reflection.favoriteCharacter === null &&
    reflection.leastFavoriteCharacter === null &&
    reflection.likedAspects.length === 0 &&
    reflection.emotions.length === 0 &&
    reflection.wouldLiveThere === null &&
    reflection.finalThought === null
  );
}
