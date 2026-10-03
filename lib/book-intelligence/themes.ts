// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import { themeLabels, type ThemeKey } from "@/lib/enrichment/theme-vocabulary";
import type { ReferenceCorpus } from "./reference-corpus";
import { LL_P0001, LL_P001, LL_P05, logLikelihood, per10k, rateRatio, round, sparkline, spread } from "./stats";
import { CUE_MATCHER, THEME_CUE_VERSION, THEME_CUES, cuesForWord } from "./theme-cues";
import { chapterSizes, commonWords, commonWordsOf, type TokenizedText } from "./text";

/**
 * Controlled themes from text: how much more often the book uses a theme's cue words
 * than a background corpus of comparable novels, and whether that excess is steady
 * across chapters and carried by several different words. Deterministic and
 * explainable; it cannot tell a theme the book explores from a word it merely repeats.
 */
export const THEMES_METHOD_VERSION = `theme-keyness-v1+cues-v${THEME_CUE_VERSION}`;

export type TextThemeSupport = "strong" | "moderate" | "weak" | "none";

export type TextTheme = {
  key: ThemeKey;
  label: string;
  count: number;
  per10k: number;
  referencePer10k: number;
  ratio: number;
  logLikelihood: number;
  perReference: { title: string; per10k: number }[];
  beatsReferences: number;
  spread: number;
  distribution: string;
  distinctCues: number;
  topCues: { cue: string; count: number }[];
  dominantCueShare: number;
  support: TextThemeSupport;
  /** Which bar the theme failed to clear for the next support level. */
  shortOf: string[];
  /** Public-domain excerpts for development diagnostics only. */
  excerpts: string[];
};

export type ThemeAnalysis = { method: string; targetSize: number; referenceSize: number; themes: TextTheme[] };

type Tally = { total: number; perChapter: number[]; cues: Map<string, number> };

function countCues(words: string[], chapters: number[] | null, chapterCount: number): Map<ThemeKey, Tally> {
  const tallies = new Map<ThemeKey, Tally>();
  const add = (theme: ThemeKey, cue: string, chapter: number) => {
    const tally = tallies.get(theme) ?? { total: 0, perChapter: new Array<number>(chapterCount).fill(0), cues: new Map() };
    tally.total++;
    tally.perChapter[chapter]++;
    tally.cues.set(cue, (tally.cues.get(cue) ?? 0) + 1);
    tallies.set(theme, tally);
  };
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;
    const chapter = chapters ? chapters[i] : 0;
    for (const hit of cuesForWord(word)) add(hit.theme, hit.cue, chapter);
    for (const phrase of CUE_MATCHER.phrases) {
      if (phrase.words[0] === word && phrase.words.every((part, offset) => words[i + offset] === part)) add(phrase.theme, phrase.cue, chapter);
    }
  }
  return tallies;
}

function supportOf(theme: Omit<TextTheme, "support" | "shortOf" | "excerpts">, references: number): { support: TextThemeSupport; shortOf: string[] } {
  const levels: { level: TextThemeSupport; checks: [boolean, string][] }[] = [
    {
      level: "strong",
      checks: [
        [theme.ratio >= 2, "ratio ≥ 2"],
        [theme.logLikelihood >= LL_P0001, "G² ≥ 15.13"],
        [theme.beatsReferences >= references - 1, `above all but one background book`],
        [theme.spread >= 0.5, "in ≥ 50% of chapters"],
        [theme.distinctCues >= 3, "≥ 3 distinct cue words"],
        [theme.dominantCueShare <= 0.6, "no cue word > 60% of hits"],
      ],
    },
    {
      level: "moderate",
      checks: [
        [theme.ratio >= 1.5, "ratio ≥ 1.5"],
        [theme.logLikelihood >= LL_P001, "G² ≥ 10.83"],
        [theme.beatsReferences >= Math.ceil(references * 0.66), "above ⅔ of background books"],
        [theme.spread >= 0.3, "in ≥ 30% of chapters"],
        [theme.distinctCues >= 2, "≥ 2 distinct cue words"],
        [theme.dominantCueShare <= 0.75, "no cue word > 75% of hits"],
      ],
    },
    { level: "weak", checks: [[theme.ratio >= 1.25, "ratio ≥ 1.25"], [theme.logLikelihood >= LL_P05, "G² ≥ 3.84"]] },
  ];
  for (const { level, checks } of levels) {
    const failed = checks.filter(([ok]) => !ok).map(([, label]) => label);
    if (failed.length === 0) {
      const next = levels[levels.findIndex((entry) => entry.level === level) - 1];
      return { support: level, shortOf: next ? next.checks.filter(([ok]) => !ok).map(([, label]) => label) : [] };
    }
  }
  return { support: "none", shortOf: levels[2].checks.filter(([ok]) => !ok).map(([, label]) => label) };
}

function excerptsFor(text: TokenizedText, theme: ThemeKey, limit: number): string[] {
  const cueSet = new Set<string>(THEME_CUES[theme]);
  const scored = text.paragraphs
    .map((paragraph) => {
      const sentences = paragraph.text.split(/(?<=[.!?]["”’]?)\s+/);
      const best = sentences
        .map((sentence) => {
          const distinct = new Set(commonWords([sentence]).flatMap((word) => (word ? cuesForWord(word).filter((hit) => hit.theme === theme).map((hit) => hit.cue) : [])));
          for (const phrase of CUE_MATCHER.phrases) if (phrase.theme === theme && sentence.toLowerCase().includes(phrase.cue)) distinct.add(phrase.cue);
          return { sentence, distinct: distinct.size };
        })
        .sort((a, b) => b.distinct - a.distinct)[0];
      return { chapter: paragraph.chapter, ...best };
    })
    .filter((item) => item.distinct >= 2 && cueSet.size > 0)
    .sort((a, b) => b.distinct - a.distinct);
  const picked: string[] = [];
  const chapters = new Set<number>();
  for (const item of scored) {
    if (chapters.has(item.chapter)) continue;
    chapters.add(item.chapter);
    const sentence = item.sentence.length > 280 ? `${item.sentence.slice(0, 277)}…` : item.sentence;
    picked.push(`[${text.chapterLabels[item.chapter]}] ${sentence}`);
    if (picked.length >= limit) break;
  }
  return picked;
}

export function analyzeThemes(text: TokenizedText, corpus: ReferenceCorpus): ThemeAnalysis {
  const sizes = chapterSizes(text);
  const target = commonWordsOf(text);
  const targetSize = target.words.filter(Boolean).length;
  const targetTallies = countCues(target.words, target.chapters, sizes.length);
  const referenceTallies = corpus.texts.map((reference) => ({ reference, tallies: countCues(reference.words, null, 1) }));

  const themes = (Object.keys(THEME_CUES) as ThemeKey[]).map((key): TextTheme => {
    const tally = targetTallies.get(key) ?? { total: 0, perChapter: new Array<number>(sizes.length).fill(0), cues: new Map<string, number>() };
    const referenceCount = referenceTallies.reduce((sum, { tallies }) => sum + (tallies.get(key)?.total ?? 0), 0);
    const perReference = referenceTallies.map(({ reference, tallies }) => ({
      title: reference.title,
      per10k: round(per10k(tallies.get(key)?.total ?? 0, reference.size)),
    }));
    const targetRate = per10k(tally.total, targetSize);
    const topCues = [...tally.cues.entries()].sort((a, b) => b[1] - a[1]).map(([cue, count]) => ({ cue, count }));
    const base = {
      key,
      label: themeLabels[key],
      count: tally.total,
      per10k: round(targetRate),
      referencePer10k: round(per10k(referenceCount, corpus.size)),
      ratio: round(rateRatio(tally.total, targetSize, referenceCount, corpus.size)),
      logLikelihood: round(logLikelihood(tally.total, targetSize, referenceCount, corpus.size), 1),
      perReference,
      beatsReferences: perReference.filter((reference) => targetRate > reference.per10k).length,
      spread: round(spread(tally.perChapter)),
      distribution: sparkline(tally.perChapter, sizes),
      distinctCues: tally.cues.size,
      topCues: topCues.slice(0, 6),
      dominantCueShare: tally.total === 0 ? 0 : round(topCues[0].count / tally.total),
    };
    const { support, shortOf } = supportOf(base, corpus.texts.length);
    return { ...base, support, shortOf, excerpts: support === "strong" || support === "moderate" ? excerptsFor(text, key, 2) : [] };
  });

  const order: Record<TextThemeSupport, number> = { strong: 3, moderate: 2, weak: 1, none: 0 };
  themes.sort((a, b) => order[b.support] - order[a.support] || b.logLikelihood - a.logLikelihood);
  return { method: THEMES_METHOD_VERSION, targetSize, referenceSize: corpus.size, themes };
}
