// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.

/** Critical values of Dunning's log-likelihood (1 d.f.): p < 0.05, 0.001, 0.0001. */
export const LL_P05 = 3.84;
export const LL_P001 = 10.83;
export const LL_P0001 = 15.13;

/**
 * Dunning's log-likelihood G² for a count in the target versus a reference corpus.
 * Positive when the target uses it more than expected, negative when less.
 */
export function logLikelihood(targetCount: number, targetSize: number, referenceCount: number, referenceSize: number): number {
  const total = targetCount + referenceCount;
  if (total === 0) return 0;
  const expectedTarget = (targetSize * total) / (targetSize + referenceSize);
  const expectedReference = (referenceSize * total) / (targetSize + referenceSize);
  const term = (observed: number, expected: number) => (observed > 0 ? observed * Math.log(observed / expected) : 0);
  const g2 = 2 * (term(targetCount, expectedTarget) + term(referenceCount, expectedReference));
  return targetCount / targetSize >= referenceCount / referenceSize ? g2 : -g2;
}

/** Relative frequency ratio with +0.5 smoothing, so absent words do not divide by zero. */
export function rateRatio(targetCount: number, targetSize: number, referenceCount: number, referenceSize: number): number {
  return (targetCount + 0.5) / targetSize / ((referenceCount + 0.5) / referenceSize);
}

export function per10k(count: number, size: number): number {
  return size === 0 ? 0 : (count / size) * 10000;
}

/** Share of chapters with at least one occurrence. */
export function spread(perChapter: number[]): number {
  return perChapter.length === 0 ? 0 : perChapter.filter((count) => count > 0).length / perChapter.length;
}

/** Largest single-chapter share of all occurrences: near 1 means one episode, not a recurring element. */
export function concentration(perChapter: number[]): number {
  const total = perChapter.reduce((sum, count) => sum + count, 0);
  return total === 0 ? 0 : Math.max(...perChapter) / total;
}

const BARS = "▁▂▃▄▅▆▇█";

/** Rate per chapter as a compact bar string; a space marks a chapter with none. */
export function sparkline(perChapter: number[], chapterSizes: number[]): string {
  const rates = perChapter.map((count, index) => (chapterSizes[index] ? count / chapterSizes[index] : 0));
  const max = Math.max(...rates, 0);
  if (max === 0) return "";
  return rates.map((rate) => (rate === 0 ? "·" : BARS[Math.min(BARS.length - 1, Math.floor((rate / max) * (BARS.length - 1)))])).join("");
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
