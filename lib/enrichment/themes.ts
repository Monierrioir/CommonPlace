import "server-only";
import {
  GENRE_INDEX,
  THEME_INDEX,
  THEME_PREFIXES,
  genreLabels,
  themeLabels,
  type GenreKey,
  type ThemeKey,
} from "./theme-vocabulary";
import type { WikidataConcept } from "./wikidata";
import type { WikidataWorkMatch } from "./work";

/**
 * Themes from Open Library subjects and Wikidata main subjects (P921), mapped onto the
 * controlled vocabulary by exact heading lookup. Nothing unmapped is ever shown; genres
 * (Wikidata P136, genre headings) are classified separately and never become themes.
 */

export type ThemeSource = "openlibrary" | "wikidata";

/**
 * high   — both sources support the theme (Wikidata item matched by Open Library id).
 * medium — a Wikidata main subject alone; or two or more distinct Open Library headings;
 *          or both sources when the Wikidata item was matched only by author and title.
 * low    — a single Open Library heading; or Wikidata alone matched by author and title.
 */
export type ThemeConfidence = "high" | "medium" | "low";

export type SubjectOutcome =
  | { kind: "theme"; theme: ThemeKey }
  | { kind: "genre"; genre: GenreKey }
  | { kind: "discarded"; reason: string };

/** One raw source value and what became of it. */
export type ClassifiedSubject = {
  source: ThemeSource;
  raw: string;
  /** The normalized heading that was looked up; null when rejected before lookup. */
  heading: string | null;
  wikidataQid: string | null;
  outcome: SubjectOutcome;
};

export type EnrichedTheme = {
  key: ThemeKey;
  label: string;
  confidence: ThemeConfidence;
  rank: number;
  sources: ThemeSource[];
  evidence: {
    /** Raw Open Library subjects that mapped here. */
    openLibrary: string[];
    /** Distinct normalized headings among them: "Friendship" and "Friendship, fiction" count once. */
    openLibraryHeadings: number;
    wikidata: { qid: string; label: string }[];
  };
};

export type EnrichedGenre = { key: GenreKey; label: string; sources: ThemeSource[]; values: string[] };

export type ThemeSourceReport =
  | { status: "ok"; values: number; mapped: number }
  | { status: "no-item" }
  | { status: "failed"; error: string };

export type ThemeEnrichment = {
  status: "enriched" | "sparse" | "failed";
  /** Trust in the shortlist as a whole; null unless enriched. */
  confidence: "high" | "medium" | null;
  sources: { openLibrary: ThemeSourceReport; wikidata: ThemeSourceReport };
  /** Every raw input, in source order, with its outcome. */
  inputs: ClassifiedSubject[];
  /** Recommended high- or medium-confidence themes, best first. */
  themes: EnrichedTheme[];
  /** Every mapped theme, including low-confidence ones. */
  candidates: EnrichedTheme[];
  genres: EnrichedGenre[];
};

export const THEME_SHORTLIST_SIZE = 6;
export const MIN_THEMES = 3;

// ---------------------------------------------------------------------------
// Normalization and classification
// ---------------------------------------------------------------------------

/** Lowercase, accents and punctuation removed, "&" → "and". The form vocabulary headings are written in. */
export function subjectKey(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’‘`´]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const CATALOGUE_TAG = /[:=_]/;
const CHARACTER_HEADING = /\((?:fictitious|fictional|legendary|mythical|imaginary) (?:character|characters)\)/i;
const PLACE_OR_BODY_HEADING = /\((?:imaginary|fictitious|fictional|mythical) (?:place|places|location|organization|organisation)\)/i;
// Only a discard reason for inspection; it never decides whether something maps.
const FORMAT_WORDS =
  /\b(juvenile|children|childrens|teen|reading level|large type|translations?|translating|language|languages|readers|specimens|texts|adaptations|drama|theater|criticism|interpretation|study and teaching|study guides|bestseller|staff picks|long now|literature|fiction|ficcion|stories|novels?|novela|romans?|audience|works|history|general|classic)\b/;

/** Strips catalogue decoration so the topical heading remains: "Crime, fiction" → "Crime". */
function openLibraryHeading(raw: string): string {
  let text = raw.split(/\s+--\s+/)[0];
  text = text.replace(/\([^()]*\)/g, " ").replace(/\s+/g, " ").trim();
  text = text.replace(/,\s*general$/i, "");
  text = text.replace(/,\s*(?:juvenile\s+)?(?:fiction|literature)$/i, "");
  text = text.replace(/\s+in\s+(?:fiction|literature)$/i, "");
  text = text.replace(/^fiction,\s*/i, "");
  return subjectKey(text);
}

function lookupTheme(heading: string): ThemeKey | null {
  const direct = THEME_INDEX.get(heading);
  if (direct) return direct;
  return THEME_PREFIXES.find((rule) => heading.startsWith(rule.prefix))?.key ?? null;
}

function lookupGenre(heading: string): GenreKey | null {
  return GENRE_INDEX.get(heading) ?? GENRE_INDEX.get(`${heading} fiction`) ?? null;
}

export function classifyOpenLibrarySubject(raw: string, placeHeadings: ReadonlySet<string>): ClassifiedSubject {
  const base = { source: "openlibrary" as const, raw, wikidataQid: null };
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return { ...base, heading: null, outcome: { kind: "discarded", reason: "empty entry" } };
  if (CATALOGUE_TAG.test(text)) return { ...base, heading: null, outcome: { kind: "discarded", reason: "catalogue tag" } };
  if (CHARACTER_HEADING.test(text)) return { ...base, heading: null, outcome: { kind: "discarded", reason: "a character heading (used for characters)" } };
  if (PLACE_OR_BODY_HEADING.test(text)) return { ...base, heading: null, outcome: { kind: "discarded", reason: "an imaginary place or organization heading" } };

  const heading = openLibraryHeading(text);
  if (!heading) return { ...base, heading: null, outcome: { kind: "discarded", reason: "nothing left after removing catalogue decoration" } };

  const theme = lookupTheme(heading);
  if (theme) return { ...base, heading, outcome: { kind: "theme", theme } };
  const genre = lookupGenre(heading);
  if (genre) return { ...base, heading, outcome: { kind: "genre", genre } };
  if (placeHeadings.has(heading)) return { ...base, heading, outcome: { kind: "discarded", reason: "a place (the work lists it among its places)" } };
  if (FORMAT_WORDS.test(heading)) {
    return { ...base, heading, outcome: { kind: "discarded", reason: "format, audience, language or catalogue information" } };
  }
  return { ...base, heading, outcome: { kind: "discarded", reason: "not in the Commonplace vocabulary" } };
}

function classifyWikidata(concept: WikidataConcept, kind: "subject" | "genre"): ClassifiedSubject {
  const base = { source: "wikidata" as const, raw: concept.label ?? concept.qid, wikidataQid: concept.qid };
  if (!concept.label) return { ...base, heading: null, outcome: { kind: "discarded", reason: "no English label on Wikidata" } };
  const heading = subjectKey(concept.label);
  if (kind === "genre") {
    const genre = lookupGenre(heading);
    return { ...base, heading, outcome: genre ? { kind: "genre", genre } : { kind: "discarded", reason: "genre not in the Commonplace genre list" } };
  }
  const theme = lookupTheme(heading);
  if (theme) return { ...base, heading, outcome: { kind: "theme", theme } };
  const genre = lookupGenre(heading);
  if (genre) return { ...base, heading, outcome: { kind: "genre", genre } };
  return { ...base, heading, outcome: { kind: "discarded", reason: "not in the Commonplace vocabulary" } };
}

// ---------------------------------------------------------------------------
// Confidence and ranking
// ---------------------------------------------------------------------------

type Evidence = { key: ThemeKey; openLibrary: string[]; headings: Set<string>; wikidata: { qid: string; label: string }[]; firstSeen: number };

function confidenceOf(evidence: Evidence, workMatch: WikidataWorkMatch | null): ThemeConfidence {
  const openLibrary = evidence.headings.size;
  const wikidata = evidence.wikidata.length > 0;
  const strongWikidata = wikidata && workMatch !== "author-title";
  if (strongWikidata && openLibrary >= 1) return "high";
  if (strongWikidata || openLibrary >= 2 || (wikidata && openLibrary >= 1)) return "medium";
  return "low";
}

const TIER: Record<ThemeConfidence, number> = { high: 3, medium: 2, low: 1 };

export type ThemeInput = {
  openLibrary: { ok: true; subjects: string[]; placeNames: string[] } | { ok: false; error: string };
  wikidata:
    | { ok: true; hasItem: boolean; mainSubjects: WikidataConcept[]; genres: WikidataConcept[] }
    | { ok: false; error: string };
  wikidataMatch: WikidataWorkMatch | null;
};

/** Pure: classifies every raw value, then ranks themes by confidence, evidence and first appearance. */
export function deriveThemes(input: ThemeInput): ThemeEnrichment {
  const inputs: ClassifiedSubject[] = [];
  if (input.wikidata.ok) {
    inputs.push(...input.wikidata.mainSubjects.map((concept) => classifyWikidata(concept, "subject")));
    inputs.push(...input.wikidata.genres.map((concept) => classifyWikidata(concept, "genre")));
  }
  if (input.openLibrary.ok) {
    const placeHeadings = new Set(input.openLibrary.placeNames.map(openLibraryHeading).filter(Boolean));
    inputs.push(...input.openLibrary.subjects.map((raw) => classifyOpenLibrarySubject(raw, placeHeadings)));
  }

  const evidence = new Map<ThemeKey, Evidence>();
  const genres = new Map<GenreKey, EnrichedGenre>();
  inputs.forEach((item, position) => {
    if (item.outcome.kind === "theme") {
      const key = item.outcome.theme;
      const entry = evidence.get(key) ?? { key, openLibrary: [], headings: new Set<string>(), wikidata: [], firstSeen: position };
      if (item.source === "wikidata" && item.wikidataQid) {
        if (!entry.wikidata.some((concept) => concept.qid === item.wikidataQid)) entry.wikidata.push({ qid: item.wikidataQid, label: item.raw });
      } else {
        entry.openLibrary.push(item.raw);
        if (item.heading) entry.headings.add(item.heading);
      }
      evidence.set(key, entry);
    } else if (item.outcome.kind === "genre") {
      const key = item.outcome.genre;
      const entry = genres.get(key) ?? { key, label: genreLabels[key], sources: [], values: [] };
      if (!entry.sources.includes(item.source)) entry.sources.push(item.source);
      entry.values.push(item.raw);
      genres.set(key, entry);
    }
  });

  const candidates = [...evidence.values()]
    .map((entry) => ({ entry, confidence: confidenceOf(entry, input.wikidataMatch) }))
    .sort(
      (a, b) =>
        TIER[b.confidence] - TIER[a.confidence] ||
        2 * b.entry.wikidata.length + b.entry.headings.size - (2 * a.entry.wikidata.length + a.entry.headings.size) ||
        a.entry.firstSeen - b.entry.firstSeen ||
        themeLabels[a.entry.key].localeCompare(themeLabels[b.entry.key]),
    )
    .map(({ entry, confidence }, index): EnrichedTheme => {
      const sources: ThemeSource[] = [];
      if (entry.openLibrary.length > 0) sources.push("openlibrary");
      if (entry.wikidata.length > 0) sources.push("wikidata");
      return {
        key: entry.key,
        label: themeLabels[entry.key],
        confidence,
        rank: index + 1,
        sources,
        evidence: { openLibrary: entry.openLibrary, openLibraryHeadings: entry.headings.size, wikidata: entry.wikidata },
      };
    });

  const themes = candidates.filter((theme) => theme.confidence !== "low").slice(0, THEME_SHORTLIST_SIZE);
  const anySourceFailed = !input.openLibrary.ok || !input.wikidata.ok;
  const status = themes.length >= MIN_THEMES ? "enriched" : candidates.length === 0 && anySourceFailed ? "failed" : "sparse";
  const high = themes.filter((theme) => theme.confidence === "high").length;

  const mapped = (source: ThemeSource) => inputs.filter((item) => item.source === source && item.outcome.kind === "theme").length;
  return {
    status,
    confidence: status !== "enriched" ? null : high >= 2 ? "high" : "medium",
    sources: {
      openLibrary: input.openLibrary.ok
        ? { status: "ok", values: input.openLibrary.subjects.length, mapped: mapped("openlibrary") }
        : { status: "failed", error: input.openLibrary.error },
      wikidata: !input.wikidata.ok
        ? { status: "failed", error: input.wikidata.error }
        : input.wikidata.hasItem
          ? { status: "ok", values: input.wikidata.mainSubjects.length, mapped: mapped("wikidata") }
          : { status: "no-item" },
    },
    inputs,
    themes,
    candidates,
    genres: [...genres.values()],
  };
}
