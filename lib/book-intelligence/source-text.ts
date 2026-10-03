// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.

/** A text as the pipeline reads it: story chapters only, with edition apparatus kept apart. */
export type SourceChapter = {
  label: string;
  paragraphs: string[];
  /** Lowercased words the source set in italics (often untranslated terms). */
  italics: string[];
};

export type SourceText = {
  chapters: SourceChapter[];
  /** Translator/editor footnotes and similar edition material: never analysed as story text. */
  apparatus: string[];
  /** Pages or sections left out, with the reason. */
  skipped: string[];
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ""))
    .replace(/[\u200b\u00ad]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
