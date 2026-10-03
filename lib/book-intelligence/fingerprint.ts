// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import type { SourceText } from "./source-text";

/**
 * Content fingerprint: hashes of every run of eight consecutive words. Two sources of
 * the same edition share most of them; different translations share almost none. Only
 * hashes are compared or kept — never the words — so the same check could confirm an
 * edition match for text Commonplace is not allowed to store.
 */
const SHINGLE = 8;

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function fingerprint(source: SourceText): Set<number> {
  const words = source.chapters
    .flatMap((chapter) => chapter.paragraphs)
    .join(" ")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .match(/\p{L}+(?:'\p{L}+)*/gu) ?? [];
  const hashes = new Set<number>();
  for (let i = 0; i + SHINGLE <= words.length; i++) hashes.add(fnv1a(words.slice(i, i + SHINGLE).join(" ")));
  return hashes;
}

/** Share of the sample's fingerprints found in the candidate: ~1 for the same text, ~0 otherwise. */
export function containment(sample: Set<number>, candidate: Set<number>): number {
  if (sample.size === 0) return 0;
  let shared = 0;
  for (const hash of sample) if (candidate.has(hash)) shared++;
  return shared / sample.size;
}
