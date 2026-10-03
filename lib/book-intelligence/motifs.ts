// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import { DETERMINERS, STOPWORDS } from "./lexicon";
import type { ReferenceCorpus } from "./reference-corpus";
import { LL_P0001, concentration, logLikelihood, per10k, rateRatio, round, sparkline, spread } from "./stats";
import { cuesForWord } from "./theme-cues";
import { chapterSizes, commonWordsOf, type TokenizedText } from "./text";

/**
 * Candidate motifs: concrete recurring things. A word qualifies when it behaves like a
 * noun (usually preceded by a determiner), the book uses it far more than the
 * background novels, and it recurs across the book rather than in one episode. The
 * pipeline proposes; it cannot judge symbolic weight, so every motif needs review.
 */
export const MOTIFS_METHOD_VERSION = "motif-keyness-v1";

const MIN_COUNT = 8;
const MIN_RATIO = 3;
const MIN_NOUNNESS = 0.4;
const MIN_SPREAD = 0.2;
const MAX_CONCENTRATION = 0.5;

export type MotifCandidate = {
  word: string;
  count: number;
  per10k: number;
  referencePer10k: number;
  ratio: number;
  logLikelihood: number;
  spread: number;
  concentration: number;
  nounness: number;
  distribution: string;
  modifiers: { word: string; count: number }[];
  italicInSource: boolean;
  status: "candidate" | "rejected";
  reason: string;
  excerpt: string | null;
};

export type MotifAnalysis = { method: string; candidates: MotifCandidate[]; rejected: MotifCandidate[] };

function counts(words: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const word of words) if (word) map.set(word, (map.get(word) ?? 0) + 1);
  return map;
}

export function analyzeMotifs(text: TokenizedText, corpus: ReferenceCorpus, nameWords: Set<string>, italics: Set<string>): MotifAnalysis {
  const sizes = chapterSizes(text);
  const { words, chapters } = commonWordsOf(text);
  const targetSize = words.filter(Boolean).length;
  const reference = new Map<string, number>();
  for (const referenceText of corpus.texts) {
    for (const [word, count] of counts(referenceText.words)) reference.set(word, (reference.get(word) ?? 0) + count);
  }

  const stats = new Map<string, { count: number; determined: number; perChapter: number[]; modifiers: Map<string, number>; firstIndex: number }>();
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word || word.length < 4 || STOPWORDS.has(word) || DETERMINERS.has(word)) continue;
    const entry = stats.get(word) ?? { count: 0, determined: 0, perChapter: new Array<number>(sizes.length).fill(0), modifiers: new Map(), firstIndex: i };
    entry.count++;
    entry.perChapter[chapters[i]]++;
    const previous = words[i - 1] ?? "";
    if (DETERMINERS.has(previous) || DETERMINERS.has(words[i - 2] ?? "")) entry.determined++;
    if (previous && !STOPWORDS.has(previous) && !DETERMINERS.has(previous)) entry.modifiers.set(previous, (entry.modifiers.get(previous) ?? 0) + 1);
    stats.set(word, entry);
  }

  const evaluated: MotifCandidate[] = [];
  for (const [word, entry] of stats) {
    if (entry.count < MIN_COUNT) continue;
    const referenceCount = reference.get(word) ?? 0;
    const ratio = rateRatio(entry.count, targetSize, referenceCount, corpus.size);
    const g2 = logLikelihood(entry.count, targetSize, referenceCount, corpus.size);
    if (ratio < MIN_RATIO || g2 < LL_P0001) continue;

    const nounness = entry.determined / entry.count;
    const wordSpread = spread(entry.perChapter);
    const wordConcentration = concentration(entry.perChapter);
    let reason = "noun-like, far more frequent than in the background novels, recurring across the book";
    let status: MotifCandidate["status"] = "candidate";
    if (nameWords.has(word)) [status, reason] = ["rejected", "part of a character or place name"];
    else if (cuesForWord(word).length > 0) [status, reason] = ["rejected", `a theme cue word (${cuesForWord(word).map((hit) => hit.theme).join(", ")}) — counted under themes`];
    else if (nounness < MIN_NOUNNESS) [status, reason] = ["rejected", `rarely used as a noun (${Math.round(nounness * 100)}% after a determiner)`];
    else if (wordSpread < MIN_SPREAD) [status, reason] = ["rejected", `confined to ${Math.round(wordSpread * 100)}% of chapters`];
    else if (wordConcentration > MAX_CONCENTRATION) [status, reason] = ["rejected", `${Math.round(wordConcentration * 100)}% of uses in one chapter — an episode, not a recurring element`];

    const paragraph = text.paragraphs.find((p) => entry.firstIndex >= p.firstToken && entry.firstIndex < p.endToken);
    const sentence = paragraph?.text.split(/(?<=[.!?]["”’]?)\s+/).find((s) => s.toLowerCase().includes(word)) ?? null;
    evaluated.push({
      word,
      count: entry.count,
      per10k: round(per10k(entry.count, targetSize)),
      referencePer10k: round(per10k(referenceCount, corpus.size)),
      ratio: round(ratio, 1),
      logLikelihood: round(g2, 1),
      spread: round(wordSpread),
      concentration: round(wordConcentration),
      nounness: round(nounness),
      distribution: sparkline(entry.perChapter, sizes),
      modifiers: [...entry.modifiers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([modifier, count]) => ({ word: modifier, count })),
      italicInSource: italics.has(word),
      status,
      reason,
      excerpt: sentence && sentence.length > 220 ? `${sentence.slice(0, 217)}…` : sentence,
    });
  }

  evaluated.sort((a, b) => b.logLikelihood - a.logLikelihood);
  return {
    method: MOTIFS_METHOD_VERSION,
    candidates: evaluated.filter((item) => item.status === "candidate").slice(0, 25),
    rejected: evaluated.filter((item) => item.status === "rejected").slice(0, 25),
  };
}
