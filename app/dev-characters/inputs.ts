// TEMPORARY development diagnostics for book enrichment — delete with this folder.
import "server-only";
import { searchBooks } from "@/lib/books/search";
import { enrichBook, type BookEnrichment } from "@/lib/enrichment/book";
import { bookFacets } from "@/lib/enrichment/facets";
import { WORK_ID_PATTERN } from "@/lib/enrichment/open-library";
import type { EnrichmentOptions } from "@/lib/enrichment/work";
import { getCurrentUserLibrary } from "@/lib/library/queries";
import { planQuestions, type QuestionPlan } from "@/lib/reflections/question-plan";

export type SearchParams = Record<string, string | string[] | undefined>;

export type Target = { workId: string; origin: string; coverUrl?: string | null };
export type Report = { target: Target; result: BookEnrichment; plan: QuestionPlan };

// Test books are found through the app's own Open Library search, never hard-coded data.
const DEFAULT_QUERIES = [
  "dune frank herbert",
  "harry potter philosopher's stone",
  "crime and punishment dostoyevsky",
  "the housekeeper and the professor",
  "stoner john williams",
  "oblomov goncharov",
];
// The Dune id that is actually stored in our catalog; Open Library has since merged it.
const DEFAULT_WORKS = ["OL893415W"];
const MAX_TARGETS = 20;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function readOptions(params: SearchParams): EnrichmentOptions {
  const simulate = first(params.simulate);
  return simulate === "openlibrary" || simulate === "wikidata" ? { simulateFailure: simulate } : {};
}

export async function resolveTargets(params: SearchParams): Promise<Target[]> {
  const works = first(params.works).split(/[\s,]+/).filter((id) => WORK_ID_PATTERN.test(id));
  const queries = first(params.q).split("|").map((query) => query.trim()).filter(Boolean);
  const fromLibrary = first(params.library) === "1";
  const useDefaults = works.length === 0 && queries.length === 0 && !fromLibrary;

  const targets: Target[] = [];
  for (const workId of useDefaults ? DEFAULT_WORKS : works) {
    targets.push({ workId, origin: useDefaults ? "stored catalog id (merged on Open Library)" : "work id" });
  }
  for (const query of useDefaults ? DEFAULT_QUERIES : queries) {
    const outcome = await searchBooks(query.slice(0, 200));
    const top = outcome.status === "ok" ? outcome.results[0] : undefined;
    if (top) targets.push({ workId: top.providerId, origin: `search “${query}” → ${top.title}`, coverUrl: top.cover?.url });
  }
  if (fromLibrary) {
    const library = await getCurrentUserLibrary();
    if (library.status === "ok") {
      for (const entry of library.entries) {
        targets.push({ workId: entry.providerWorkId, origin: `your library: ${entry.title}`, coverUrl: entry.coverUrl });
      }
    }
  }

  const seen = new Set<string>();
  return targets.filter((target) => !seen.has(target.workId) && seen.add(target.workId)).slice(0, MAX_TARGETS);
}

/** Sequential on purpose, to keep the request rate low for both services. */
export async function buildReports(params: SearchParams): Promise<Report[]> {
  const options = readOptions(params);
  const reports: Report[] = [];
  for (const target of await resolveTargets(params)) {
    const result = await enrichBook(target.workId, options);
    reports.push({ target, result, plan: planQuestions(bookFacets(result)) });
  }
  return reports;
}
