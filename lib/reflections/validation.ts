import {
  LIKED_ASPECTS,
  REFLECTION_EMOTIONS,
  REFLECTION_LIMITS,
  WORLD_ANSWERS,
  type BookReflectionInput,
  type Rating,
} from "./types";

const INVALID = Symbol("invalid");
type Parsed<T> = T | typeof INVALID;

function parseRating(value: unknown): Parsed<Rating | null> {
  if (value === undefined || value === null) return null;
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5
    ? (value as Rating)
    : INVALID;
}

/** Names are single-line: whitespace runs collapse to one space. Blank means unanswered. */
function parseCharacterName(value: unknown): Parsed<string | null> {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return INVALID;
  const name = value.replace(/\s+/g, " ").trim();
  if (name === "") return null;
  return name.length <= REFLECTION_LIMITS.characterName ? name : INVALID;
}

function parseFinalThought(value: unknown): Parsed<string | null> {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return INVALID;
  const thought = value.replace(/\r\n?/g, "\n").trim();
  if (thought === "") return null;
  return thought.length <= REFLECTION_LIMITS.finalThought ? thought : INVALID;
}

/** Only known keys, each at most once, in the canonical option order. */
function parseSelection<T extends string>(value: unknown, options: readonly T[]): Parsed<T[]> {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > options.length * 2) return INVALID;
  if (!value.every((item) => typeof item === "string" && (options as readonly string[]).includes(item))) {
    return INVALID;
  }
  const chosen = new Set<string>(value);
  return options.filter((option) => chosen.has(option));
}

function parseWorldAnswer(value: unknown): Parsed<BookReflectionInput["wouldLiveThere"]> {
  if (value === undefined || value === null) return null;
  return (WORLD_ANSWERS as readonly unknown[]).includes(value)
    ? (value as BookReflectionInput["wouldLiveThere"])
    : INVALID;
}

/**
 * Rebuilds a reflection from untrusted client input. Any malformed field rejects
 * the whole reflection rather than being silently dropped; unknown fields are ignored.
 */
export function parseReflectionInput(value: unknown): BookReflectionInput | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;

  const rating = parseRating(raw.rating);
  const favoriteCharacter = parseCharacterName(raw.favoriteCharacter);
  const leastFavoriteCharacter = parseCharacterName(raw.leastFavoriteCharacter);
  const likedAspects = parseSelection(raw.likedAspects, LIKED_ASPECTS);
  const emotions = parseSelection(raw.emotions, REFLECTION_EMOTIONS);
  const wouldLiveThere = parseWorldAnswer(raw.wouldLiveThere);
  const finalThought = parseFinalThought(raw.finalThought);

  if (
    rating === INVALID ||
    favoriteCharacter === INVALID ||
    leastFavoriteCharacter === INVALID ||
    likedAspects === INVALID ||
    emotions === INVALID ||
    wouldLiveThere === INVALID ||
    finalThought === INVALID
  ) {
    return null;
  }

  return { rating, favoriteCharacter, leastFavoriteCharacter, likedAspects, emotions, wouldLiveThere, finalThought };
}
