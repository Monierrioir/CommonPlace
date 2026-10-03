import {
  isBookcaseStyleId,
  isDecorationId,
  isLightingStyleId,
  isShelfStyleId,
  isSlotId,
  isValidArrangement,
  isWallStyleId,
  MAX_DECORATIONS,
  type DecorationPlacement,
  type ShelfPreferences,
} from "./catalogue";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(value);
  return own.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

/** Decorations as stored or submitted: exactly `{ slot, item }` objects forming a valid arrangement. */
export function parseDecorations(value: unknown): DecorationPlacement[] | null {
  if (!Array.isArray(value) || value.length > MAX_DECORATIONS) return null;
  const placements: DecorationPlacement[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry) || !hasExactKeys(entry, ["slot", "item"])) return null;
    if (!isSlotId(entry.slot) || !isDecorationId(entry.item)) return null;
    placements.push({ slot: entry.slot, item: entry.item });
  }
  return isValidArrangement(placements) ? placements : null;
}

/** Strictly parses preferences sent by the editor. Anything unknown or extra rejects the whole value. */
export function parseShelfPreferences(value: unknown): ShelfPreferences | null {
  if (!isPlainObject(value) || !hasExactKeys(value, ["bookcase", "shelf", "wall", "lighting", "decorations"])) return null;
  const { bookcase, shelf, wall, lighting } = value;
  if (!isBookcaseStyleId(bookcase) || !isShelfStyleId(shelf) || !isWallStyleId(wall) || !isLightingStyleId(lighting)) {
    return null;
  }
  const decorations = parseDecorations(value.decorations);
  if (!decorations) return null;
  return { bookcase, shelf, wall, lighting, decorations };
}
