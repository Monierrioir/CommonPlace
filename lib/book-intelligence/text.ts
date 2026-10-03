// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import type { SourceText } from "./source-text";

export type Token = {
  /** As written, without a trailing possessive 's. */
  text: string;
  lower: string;
  possessive: boolean;
  capitalized: boolean;
  /** First word of a paragraph, sentence or quotation — where capitals say nothing about names. */
  sentenceStart: boolean;
  /** Characters between the previous token (or paragraph start) and this one. */
  gapBefore: string;
  chapter: number;
  paragraph: number;
};

export type TokenizedText = {
  tokens: Token[];
  /** Token index where each chapter starts, plus a final end index. */
  chapterStarts: number[];
  chapterLabels: string[];
  paragraphs: { chapter: number; text: string; firstToken: number; endToken: number }[];
  wordCount: number;
};

const WORD = /\p{L}+(?:['’-]\p{L}+)*/gu;
const POSSESSIVE = /['’]s$/i;
const ABBREVIATIONS = new Set(["mr", "mrs", "dr", "st", "messrs", "mme", "mlle", "m"]);

export function tokenize(source: SourceText): TokenizedText {
  const tokens: Token[] = [];
  const chapterStarts: number[] = [];
  const paragraphs: TokenizedText["paragraphs"] = [];
  source.chapters.forEach((chapter, chapterIndex) => {
    chapterStarts.push(tokens.length);
    for (const text of chapter.paragraphs) {
      const firstToken = tokens.length;
      const paragraph = paragraphs.length;
      let last = 0;
      let previous: Token | null = null;
      for (const match of text.matchAll(WORD)) {
        const raw = match[0];
        const gapBefore = text.slice(last, match.index);
        last = match.index + raw.length;
        const possessive = POSSESSIVE.test(raw) && raw.length > 2;
        const word = possessive ? raw.slice(0, -2) : raw;
        const abbreviation = previous !== null && ABBREVIATIONS.has(previous.lower) && /^\.\s+$/.test(gapBefore);
        const sentenceStart = previous === null || (!abbreviation && /[.!?]|["“‘(]/.test(gapBefore));
        const token: Token = {
          text: word,
          lower: word.toLowerCase().replace(/’/g, "'"),
          possessive,
          capitalized: /^\p{Lu}/u.test(word),
          sentenceStart,
          gapBefore,
          chapter: chapterIndex,
          paragraph,
        };
        tokens.push(token);
        previous = token;
      }
      paragraphs.push({ chapter: chapterIndex, text, firstToken, endToken: tokens.length });
    }
  });
  chapterStarts.push(tokens.length);
  return { tokens, chapterStarts, chapterLabels: source.chapters.map((chapter) => chapter.label), paragraphs, wordCount: tokens.length };
}

/**
 * Lowercase words for frequency comparisons. A capitalised word in mid-sentence is used
 * as a proper noun ("Hope" the character, not hope) and becomes "" so it counts as
 * nothing while keeping word positions for phrases and determiner contexts.
 */
export function commonWords(paragraphs: string[]): string[] {
  const words: string[] = [];
  for (const text of paragraphs) {
    let last = 0;
    let first = true;
    for (const match of text.matchAll(WORD)) {
      const raw = match[0];
      const gap = text.slice(last, match.index);
      last = match.index + raw.length;
      const word = POSSESSIVE.test(raw) && raw.length > 2 ? raw.slice(0, -2) : raw;
      const properNoun = !first && /^\p{Lu}/u.test(word) && !/[.!?]|["“‘(]/.test(gap);
      words.push(properNoun ? "" : word.toLowerCase().replace(/’/g, "'"));
      first = false;
    }
    words.push("");
  }
  return words;
}

/** The same view of the analysed text, aligned with its tokens, plus the chapter of each word. */
export function commonWordsOf(text: TokenizedText): { words: string[]; chapters: number[] } {
  return {
    words: text.tokens.map((token) => (token.capitalized && !token.sentenceStart ? "" : token.lower)),
    chapters: text.tokens.map((token) => token.chapter),
  };
}

/** Per-chapter word counts, for normalising distributions. */
export function chapterSizes(text: TokenizedText): number[] {
  return text.chapterStarts.slice(0, -1).map((start, index) => text.chapterStarts[index + 1] - start);
}
