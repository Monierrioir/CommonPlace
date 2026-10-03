import { seededIndex } from "@/lib/seeded";

/**
 * Purely cosmetic, per-book physical variation on the shelf. Derived from a stable identifier
 * (never stored, never random) so a book always stands the same way on every render and device.
 */
export type BookVariation = {
  /** Multiplier of the shelf's base book height. */
  heightFactor: number;
  /** Visible page-block depth, in px. */
  thickness: number;
  /** Lean in degrees; 0 for most books. Positive leans right. */
  lean: number;
  /** Space before the book, in px. */
  gapBefore: number;
};

const heightFactors = [1, 0.95, 0.97, 0.91, 0.99, 0.93, 0.96, 0.89] as const;
const thicknesses = [4, 5, 6, 7, 8, 5, 6, 9] as const;
// Roughly one book in four leans, never by more than a degree.
const leans = [0, 0, 0, 0, 0, 0, -0.7, 0.6, 0, -0.9, 0, 0.8] as const;
const gaps = [2, 3, 2, 4, 3, 5, 2, 3] as const;

function pick<T>(options: readonly T[], seed: string, salt: string): T {
  return options[seededIndex(`${seed}:${salt}`, options.length)];
}

export function bookVariation(id: string): BookVariation {
  return {
    heightFactor: pick(heightFactors, id, "height"),
    thickness: pick(thicknesses, id, "thickness"),
    lean: pick(leans, id, "lean"),
    gapBefore: pick(gaps, id, "gap"),
  };
}
