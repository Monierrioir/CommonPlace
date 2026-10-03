// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import "server-only";
import { fetchGutenbergText, gutenbergBody, gutenbergChapters } from "./gutenberg";
import { commonWords } from "./text";

/**
 * Background corpus for "used more than usual" comparisons. It is never evidence about
 * the analysed book: it only tells the pipeline how often ordinary novels use a word.
 * Chosen for period and register (nineteenth-century novels, mostly Russian in English
 * translation), with two Hogarth translations so a translator's habits are not
 * mistaken for a book's concerns. Public domain in the US; read from the Gutenberg mirror.
 */
export const REFERENCE_BOOKS = [
  { ebookId: 2554, title: "Crime and Punishment", note: "Dostoevsky, tr. Constance Garnett" },
  { ebookId: 2638, title: "The Idiot", note: "Dostoevsky, tr. Eva Martin" },
  { ebookId: 1081, title: "Dead Souls", note: "Gogol, tr. D. J. Hogarth" },
  { ebookId: 47935, title: "Fathers and Sons", note: "Turgenev, tr. C. J. Hogarth" },
  { ebookId: 1342, title: "Pride and Prejudice", note: "Austen" },
  { ebookId: 1400, title: "Great Expectations", note: "Dickens" },
] as const;

export type ReferenceText = { ebookId: number; title: string; note: string; words: string[]; size: number };

export type ReferenceCorpus = { texts: ReferenceText[]; failures: string[]; size: number };

export async function loadReferenceCorpus(excludeEbookId: number | null): Promise<ReferenceCorpus> {
  const texts: ReferenceText[] = [];
  const failures: string[] = [];
  for (const book of REFERENCE_BOOKS) {
    if (book.ebookId === excludeEbookId) continue;
    const file = await fetchGutenbergText(book.ebookId);
    if (!file.ok) {
      failures.push(`${book.title}: ${file.error}`);
      continue;
    }
    const body = gutenbergBody(file.raw);
    if (!body) {
      failures.push(`${book.title}: Gutenberg start/end markers not found`);
      continue;
    }
    const words = commonWords(gutenbergChapters(body).chapters.flatMap((chapter) => chapter.paragraphs));
    texts.push({ ...book, words, size: words.filter(Boolean).length });
  }
  return { texts, failures, size: texts.reduce((sum, text) => sum + text.size, 0) };
}
