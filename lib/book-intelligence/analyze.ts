// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import "server-only";
import { enrichBook, type BookEnrichment } from "@/lib/enrichment/book";
import { containment, fingerprint } from "./fingerprint";
import { fetchGutenbergText, gutenbergBody, gutenbergChapters } from "./gutenberg";
import { findInCatalog } from "./gutenberg-catalog";
import { identifyWork, type TextSourceCandidate, type WorkIdentity } from "./identity";
import { analyzeMotifs, type MotifAnalysis } from "./motifs";
import { extractNames, type NameExtraction } from "./names";
import { mergeProfile, PROFILE_MERGE_VERSION, type BookProfileDraft } from "./profile";
import { loadReferenceCorpus, type ReferenceCorpus } from "./reference-corpus";
import type { SourceText } from "./source-text";
import { round } from "./stats";
import { tokenize } from "./text";
import { analyzeThemes, type ThemeAnalysis } from "./themes";
import { describeWikisourceWork, fetchWikisourceText } from "./wikisource";

/** Containment above this means the candidate carries the same edition's text. */
const SAME_TEXT = 0.6;

export type MatchMethod = "identifier-chain" | "identifier-chain + content fingerprint" | "manual-pin";

export type TextSourceReport = {
  kind: "wikisource" | "gutenberg";
  locator: string;
  url: string;
  matchedBy: MatchMethod;
  chain: string[];
  licence: string[];
  edition: TextSourceCandidate["edition"] | null;
  excludedNames: string[];
};

export type SourceAttempt = { source: string; outcome: string };

export type Coverage = {
  source: string;
  chapters: number;
  paragraphs: number;
  words: number;
  apparatusNotes: number;
  skipped: string[];
  completeness: string;
};

export type BookIntelligenceReport = {
  workId: string;
  generatedAt: string;
  identity: WorkIdentity;
  source: TextSourceReport | null;
  sourceError: string | null;
  attempts: SourceAttempt[];
  coverage: Coverage | null;
  reference: { books: { title: string; note: string; words: number }[]; words: number; failures: string[] };
  names: NameExtraction | null;
  themes: ThemeAnalysis | null;
  motifs: MotifAnalysis | null;
  structured: BookEnrichment;
  profile: BookProfileDraft;
  versions: Record<string, string>;
  timingsMs: Record<string, number>;
};

type Loaded = { source: TextSourceReport; text: SourceText; complete: boolean };

async function loadGutenberg(ebookId: number): Promise<{ ok: true; url: string; licence: string[]; text: SourceText } | { ok: false; error: string }> {
  const file = await fetchGutenbergText(ebookId);
  if (!file.ok) return file;
  const body = gutenbergBody(file.raw);
  if (!body) return { ok: false, error: "Gutenberg start/end markers not found" };
  if (/copyrighted project gutenberg ebook|this ebook is copyrighted/i.test(file.raw)) return { ok: false, error: "the file declares a copyright: not used" };
  const licence = /for\s+the\s+use\s+of\s+anyone\s+anywhere\s+in\s+the\s+United\s+States/i.test(file.raw)
    ? ["Project Gutenberg licence text: “for the use of anyone anywhere in the United States … at no cost and with almost no restrictions”", "Public domain status is a US determination; other jurisdictions differ"]
    : ["The mirror file carries no licence boilerplate; rights rest on the Project Gutenberg listing (US public domain unless the file states a copyright) — confirm on the landing page before any non-dev use"];
  return { ok: true, url: file.file.landingPage, licence, text: gutenbergChapters(body) };
}

function excludedFor(edition: TextSourceCandidate["edition"] | null, extra: string[] = []): string[] {
  return [edition?.translator, ...extra].filter((name): name is string => Boolean(name));
}

/**
 * Identifier-linked text first. When it is only partial, Gutenberg's catalogue may point
 * to a complete copy; that copy is used only if its content fingerprint shows it is the
 * same edition's text. A catalogue match on title and author alone is never enough.
 */
async function resolveText(identity: WorkIdentity, pinned: number | null, attempts: SourceAttempt[]): Promise<Loaded | null> {
  if (pinned) {
    const file = await loadGutenberg(pinned);
    attempts.push({ source: `Gutenberg #${pinned} (manual pin)`, outcome: file.ok ? "loaded" : file.error });
    if (!file.ok) return null;
    return {
      source: { kind: "gutenberg", locator: String(pinned), url: file.url, matchedBy: "manual-pin", chain: [`Manually pinned Project Gutenberg #${pinned} for a comparison run — not matched by identifiers`], licence: file.licence, edition: null, excludedNames: identity.authorNames },
      text: file.text,
      complete: true,
    };
  }

  const english = identity.candidates.filter((candidate) => !candidate.edition.language || /english/i.test(candidate.edition.language));
  let partial: (Loaded & { wikisource: TextSourceCandidate }) | null = null;

  for (const candidate of english) {
    if (candidate.kind === "gutenberg") {
      const file = await loadGutenberg(Number(candidate.locator));
      attempts.push({ source: `Gutenberg #${candidate.locator} (identifier)`, outcome: file.ok ? "loaded — complete text" : file.error });
      if (file.ok) {
        return {
          source: { kind: "gutenberg", locator: candidate.locator, url: file.url, matchedBy: "identifier-chain", chain: candidate.chain, licence: file.licence, edition: candidate.edition, excludedNames: excludedFor(candidate.edition, identity.authorNames) },
          text: file.text,
          complete: true,
        };
      }
      continue;
    }
    const described = await describeWikisourceWork(candidate.locator);
    if (!described.ok) {
      attempts.push({ source: `Wikisource “${candidate.locator}”`, outcome: described.error });
      continue;
    }
    const work = described.work;
    if (!work.publicDomainAsserted) {
      attempts.push({ source: `Wikisource “${work.title}”`, outcome: "no public-domain licence template on the page — not used" });
      continue;
    }
    const fetched = await fetchWikisourceText(work);
    const total = work.chapterPages.length + work.missingPages.length;
    attempts.push({
      source: `Wikisource “${work.title}” (identifier)`,
      outcome: fetched.ok ? `${work.chapterPages.length} of ${total} chapter pages transcribed${work.missingPages.length ? " — partial" : ""}` : fetched.error,
    });
    if (!fetched.ok) continue;
    const loaded: Loaded = {
      source: { kind: "wikisource", locator: work.title, url: work.url, matchedBy: "identifier-chain", chain: candidate.chain, licence: work.licenceTemplates, edition: candidate.edition, excludedNames: excludedFor(candidate.edition, identity.authorNames) },
      text: fetched.text,
      complete: work.missingPages.length === 0,
    };
    if (loaded.complete) return loaded;
    partial ??= { ...loaded, wikisource: candidate };
  }

  if (!partial) return null;

  const titles = [...new Set([identity.title, partial.wikisource.edition.label, ...identity.editions.filter((e) => e.languages.includes("eng")).map((e) => e.title)].filter((t): t is string => Boolean(t)))];
  const sample = fingerprint(partial.text);
  for (const title of titles) {
    const found = await findInCatalog(title, identity.authorNames);
    if (!found.ok) {
      attempts.push({ source: "Gutenberg catalogue", outcome: found.error });
      break;
    }
    if (found.entries.length === 0) continue;
    for (const entry of found.entries.slice(0, 3)) {
      const file = await loadGutenberg(entry.ebookId);
      if (!file.ok) {
        attempts.push({ source: `Gutenberg #${entry.ebookId} (catalogue lead “${entry.title}”)`, outcome: file.error });
        continue;
      }
      const share = containment(sample, fingerprint(file.text));
      const translatorNote = entry.translators.length ? `catalogue translator ${entry.translators.join("; ")}` : "no translator in catalogue";
      attempts.push({
        source: `Gutenberg #${entry.ebookId} (catalogue lead “${entry.title}”, ${translatorNote})`,
        outcome: `${Math.round(share * 100)}% of the Wikisource text's 8-word fingerprints found — ${share >= SAME_TEXT ? "same edition text: used" : "different text: rejected"}`,
      });
      if (share < SAME_TEXT) continue;
      return {
        source: {
          kind: "gutenberg",
          locator: String(entry.ebookId),
          url: file.url,
          matchedBy: "identifier-chain + content fingerprint",
          chain: [
            ...partial.source.chain,
            `Wikisource transcription is partial (${partial.text.chapters.length} chapters)`,
            `Gutenberg catalogue: same title and author surname → #${entry.ebookId} (${translatorNote})`,
            `content fingerprint: ${round(share * 100, 1)}% of ${sample.size} Wikisource 8-word shingles present in #${entry.ebookId}`,
          ],
          licence: [...file.licence, ...partial.source.licence.map((template) => `Wikisource (same edition): ${template}`)],
          edition: partial.source.edition,
          excludedNames: partial.source.excludedNames,
        },
        text: file.text,
        complete: true,
      };
    }
    break;
  }
  return partial;
}

/**
 * Development-only: identify the work, find an open text, run the deterministic text
 * pipeline, run the existing structured enrichment, and merge both into a hypothetical
 * profile. Read-only; nothing is stored.
 */
export async function analyzeBook(workId: string, pinnedGutenbergId: number | null): Promise<BookIntelligenceReport> {
  const timings: Record<string, number> = {};
  const time = async <T,>(label: string, run: () => Promise<T>): Promise<T> => {
    const started = Date.now();
    const result = await run();
    timings[label] = Date.now() - started;
    return result;
  };

  const identity = await time("identity", () => identifyWork(workId));
  const attempts: SourceAttempt[] = [];
  const loaded = await time("text", () => resolveText(identity, pinnedGutenbergId, attempts));
  const corpus: ReferenceCorpus = await time("reference", () => loadReferenceCorpus(pinnedGutenbergId));
  const structured = await time("structured", () => enrichBook(workId));

  let names: NameExtraction | null = null;
  let themes: ThemeAnalysis | null = null;
  let motifs: MotifAnalysis | null = null;
  let coverage: Coverage | null = null;
  if (loaded) {
    const started = Date.now();
    const tokenized = tokenize(loaded.text);
    names = extractNames(tokenized, loaded.source.excludedNames);
    themes = analyzeThemes(tokenized, corpus);
    const nameWords = new Set(
      [...names.characters, ...names.places].flatMap((group) => group.forms.flatMap((form) => form.form.toLowerCase().split(" "))).concat(names.rejected.flatMap((item) => item.label.toLowerCase().split(" "))),
    );
    const italics = new Set(loaded.text.chapters.flatMap((chapter) => chapter.italics));
    motifs = analyzeMotifs(tokenized, corpus, nameWords, italics);
    timings.pipeline = Date.now() - started;
    coverage = {
      source: loaded.source.kind === "wikisource" ? `Wikisource “${loaded.source.locator}”` : `Project Gutenberg #${loaded.source.locator}`,
      chapters: loaded.text.chapters.length,
      paragraphs: tokenized.paragraphs.length,
      words: tokenized.wordCount,
      apparatusNotes: loaded.text.apparatus.length,
      skipped: loaded.text.skipped,
      completeness: loaded.complete
        ? "Full text of this edition as published by the source. Whether the edition itself is abridged cannot be told from the text."
        : "PARTIAL: only the transcribed chapters were analysed; results describe the opening of the book, not the whole.",
    };
  }

  return {
    workId,
    generatedAt: new Date().toISOString(),
    identity,
    source: loaded?.source ?? null,
    sourceError: loaded ? null : "No open full text could be tied to this work.",
    attempts,
    coverage,
    reference: { books: corpus.texts.map((text) => ({ title: text.title, note: text.note, words: text.size })), words: corpus.size, failures: corpus.failures },
    names,
    themes,
    motifs,
    structured,
    profile: mergeProfile(structured, names, themes, motifs),
    versions: { names: names?.method ?? "—", themes: themes?.method ?? "—", motifs: motifs?.method ?? "—", merge: PROFILE_MERGE_VERSION },
    timingsMs: timings,
  };
}
