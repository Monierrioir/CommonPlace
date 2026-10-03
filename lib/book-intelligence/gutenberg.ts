// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import "server-only";
import { fetchText } from "./http";
import type { SourceChapter, SourceText } from "./source-text";

/**
 * Project Gutenberg's website is for human visitors only; automated access must go
 * through its mirrors (https://www.gutenberg.org/policy/robot_access.html). This reads
 * one file per book from gutenberg.pglaf.org, the project's own mirror host.
 */
const MIRROR = "https://gutenberg.pglaf.org";

export function mirrorDirectory(ebookId: number): string {
  const digits = String(ebookId);
  const levels = digits.length > 1 ? digits.slice(0, -1).split("") : ["0"];
  return `${MIRROR}/${levels.join("/")}/${digits}/`;
}

export type GutenbergFile = { ebookId: number; url: string; landingPage: string };

export async function fetchGutenbergText(ebookId: number): Promise<{ ok: true; file: GutenbergFile; raw: string } | { ok: false; error: string }> {
  const directory = mirrorDirectory(ebookId);
  for (const name of [`${ebookId}-0.txt`, `${ebookId}.txt`, `${ebookId}-8.txt`]) {
    const result = await fetchText(directory + name, 20000);
    if (result.ok) {
      return { ok: true, file: { ebookId, url: directory + name, landingPage: `https://www.gutenberg.org/ebooks/${ebookId}` }, raw: result.data };
    }
  }
  return { ok: false, error: `no plain-text file for #${ebookId} on the mirror` };
}

/** The text between Gutenberg's START and END markers: the licence and header are never analysed. */
export function gutenbergBody(raw: string): string | null {
  const start = /\*\*\* ?START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i.exec(raw);
  const end = /\*\*\* ?END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i.exec(raw);
  if (!start || !end || end.index <= start.index) return null;
  return raw.slice(start.index + start[0].length, end.index).replace(/\r\n?/g, "\n");
}

const HEADING = /^(?:(?:CHAPTER|Chapter|BOOK|Book|PART|Part)\s+(?:[IVXLC]+|\d+|[A-Z][a-z]+)\b.*|[IVXLC]+\.?)$/;
const DIVISION = /^(?:BOOK|Book|PART|Part)\s+([IVXLC]+|\d+|[A-Z][a-z]+)\b/;

/** Splits on chapter-like heading lines; everything before the first heading is treated as front matter. */
export function gutenbergChapters(body: string): SourceText {
  const blocks = body.split(/\n\s*\n/).map((block) => block.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  const chapters: SourceChapter[] = [];
  const skipped: string[] = [];
  let current: SourceChapter | null = null;
  let front = 0;
  let division: string | null = null;
  for (const block of blocks) {
    if (HEADING.test(block) && block.length < 80) {
      if (current && current.paragraphs.length > 0) chapters.push(current);
      const divisionMatch = DIVISION.exec(block);
      if (divisionMatch) division = `${block.slice(0, 4).toUpperCase() === "BOOK" ? "Book" : "Part"} ${divisionMatch[1]}`;
      const bare = /^[IVXLC]+\.?$/.test(block);
      const label = bare ? `${division ? `${division}, ` : ""}Chapter ${block.replace(".", "")}` : block.replace(/\s*-{3,}\s*$/, "");
      current = { label, paragraphs: [], italics: [] };
      continue;
    }
    if (!current) {
      front++;
      continue;
    }
    if (/^\[Illustration/.test(block)) continue;
    current.paragraphs.push(block.replace(/_/g, ""));
  }
  if (current && current.paragraphs.length > 0) chapters.push(current);
  if (front > 0) skipped.push(`${front} block(s) before the first chapter heading (front matter, preface)`);
  if (chapters.length === 0) {
    return { chapters: [{ label: "Whole text", paragraphs: blocks, italics: [] }], apparatus: [], skipped: ["no chapter headings found"] };
  }
  return { chapters, apparatus: [], skipped };
}
