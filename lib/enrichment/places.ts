import "server-only";
import { nameKey } from "./characters";
import type { WikidataPlace } from "./wikidata";
import type { WikidataWorkMatch } from "./work";

/**
 * Settings from Open Library `subject_places` (plus its "(Imaginary place)" subject
 * headings) and Wikidata narrative locations (P840), cleaned and merged by deterministic
 * rules. Countries, continents and similar containers are set aside: a place question
 * is only worth asking about specific settings.
 */

export type PlaceSource = "openlibrary" | "wikidata";

/**
 * high   — both sources name the place (Wikidata item matched by Open Library id).
 * medium — Wikidata alone, when at least one Wikipedia has an article on the place; or
 *          both sources when the Wikidata item was matched only by author and title.
 * low    — Open Library alone; Wikidata alone with no article anywhere (too thinly
 *          described to stand on its own); or Wikidata alone matched by author and title.
 */
export type PlaceConfidence = "high" | "medium" | "low";

export type PlaceMatch = "same-label" | "wikidata-alias" | "wikidata-variant";

export type EnrichedPlace = {
  label: string;
  aliases: string[];
  wikidataQid: string | null;
  sources: PlaceSource[];
  confidence: PlaceConfidence;
  isFictional: boolean;
  rank: number;
  provenance: {
    openLibrary: { names: string[]; position: number } | null;
    wikidata: { qid: string; label: string; sitelinks: number; types: string[] } | null;
    match: PlaceMatch | null;
    /** Why the place counts as fictional, when it does. */
    fictionalBy: "wikidata" | "openlibrary" | null;
  };
};

export type DiscardedPlace = { name: string; source: PlaceSource; reason: string };

export type PlaceIneligibility =
  | "sources-unavailable"
  | "no-places"
  | "only-broad-places"
  | "insufficient-specific-places"
  | "catalogue-noise";

export type PlaceSourceReport =
  | { status: "ok"; values: number; kept: number }
  | { status: "no-item" }
  | { status: "failed"; error: string };

export type PlaceEnrichment = {
  status: "enriched" | "sparse" | "failed";
  confidence: "high" | "medium" | null;
  eligibility: { eligible: true } | { eligible: false; reason: PlaceIneligibility };
  sources: { openLibrary: PlaceSourceReport; wikidata: PlaceSourceReport };
  raw: { openLibrary: string[]; wikidata: { qid: string; label: string | null; isFictional: boolean; isBroad: boolean; types: string[] }[] };
  notes: string[];
  /** Recommended specific places, best first. */
  places: EnrichedPlace[];
  /** Every specific place after cleaning and merging, in rank order. */
  candidates: EnrichedPlace[];
  discarded: DiscardedPlace[];
};

export const PLACE_SHORTLIST_SIZE = 5;
export const MIN_PLACES = 3;
const MAX_PLACE_LENGTH = 60;
const MAX_PLACE_WORDS = 8;
// With this many raw entries, over half discarded as malformed means the list is not trustworthy.
const NOISE_MIN_ENTRIES = 4;

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

const ABBREVIATIONS: Record<string, string> = { st: "saint", ste: "sainte", mt: "mount", ft: "fort" };

/** Comparison key: the character name key, plus "St." = "Saint", no leading "the", no house number. */
export function placeKey(name: string): string {
  const words = nameKey(name)
    .split(" ")
    .filter(Boolean)
    .map((word) => ABBREVIATIONS[word] ?? word);
  if (words[0] === "the") words.shift();
  if (words.length > 1 && /^\d+[a-z]?$/.test(words[0])) words.shift();
  return words.join(" ");
}

const IMAGINARY_PLACE = /\s*\((?:imaginary|fictitious|fictional|mythical) (?:place|places|location)\)/i;

function isBalanced(text: string): boolean {
  let depth = 0;
  for (const char of text) {
    if (char === "(") depth++;
    else if (char === ")" && --depth < 0) return false;
  }
  return depth === 0 && (text.match(/"/g) ?? []).length % 2 === 0;
}

type OpenLibraryPlace = {
  name: string;
  key: string;
  /** Keys tried when matching Wikidata: the key itself, and the key without a trailing container. */
  matchKeys: string[];
  aliases: string[];
  /** Container names the catalogue attached: "Saint Petersburg (Russia)" → Russia. */
  qualifiers: string[];
  fictional: boolean;
  position: number;
  raw: string[];
};

type CleanedPlace = { ok: true; name: string; qualifiers: string[] } | { ok: false; reason: string; malformed: boolean };

function cleanOpenLibraryPlace(raw: string): CleanedPlace {
  let name = raw.replace(/\s+/g, " ").trim();
  if (!name) return { ok: false, reason: "empty entry", malformed: true };
  if (name.includes("--")) return { ok: false, reason: "catalogue heading subdivision, not a place name", malformed: true };
  if (!isBalanced(name)) return { ok: false, reason: "malformed fragment (unbalanced brackets or quotes)", malformed: true };

  const qualifiers: string[] = [];
  name = name.replace(/\s*\(([^()]*)\)/g, (_, inner: string) => {
    if (inner.trim()) qualifiers.push(inner.trim());
    return "";
  });
  if (name.includes(",")) {
    const [head, ...rest] = name.split(",").map((part) => part.trim());
    qualifiers.push(...rest.filter(Boolean));
    name = head;
  }
  name = name.replace(/\s+/g, " ").trim();

  if (!name) return { ok: false, reason: "only a bracketed note, no place name", malformed: true };
  if (!/^[\p{L}\d]/u.test(name)) return { ok: false, reason: "fragment: does not start with a letter or number", malformed: true };
  if (/\d/.test(name.replace(/^\d+[a-z]?\s+(?=\p{L})/iu, ""))) {
    return { ok: false, reason: "contains dates or catalogue numbers", malformed: true };
  }
  if (name.length > MAX_PLACE_LENGTH || placeKey(name).split(" ").length > MAX_PLACE_WORDS) {
    return { ok: false, reason: "implausibly long for a place name", malformed: true };
  }
  return { ok: true, name, qualifiers };
}

function parseOpenLibraryPlaces(
  subjectPlaces: string[],
  subjects: string[],
  discarded: DiscardedPlace[],
): { entries: OpenLibraryPlace[]; malformed: number } {
  const entries: OpenLibraryPlace[] = [];
  const byKey = new Map<string, OpenLibraryPlace>();
  let malformed = 0;

  const add = (raw: string, text: string, fictional: boolean) => {
    const cleaned = cleanOpenLibraryPlace(text);
    if (!cleaned.ok) {
      if (cleaned.malformed) malformed++;
      discarded.push({ name: raw, source: "openlibrary", reason: cleaned.reason });
      return;
    }
    const key = placeKey(cleaned.name);
    const existing = byKey.get(key);
    if (existing) {
      existing.raw.push(raw);
      existing.qualifiers.push(...cleaned.qualifiers);
      existing.fictional ||= fictional;
      discarded.push({ name: raw, source: "openlibrary", reason: `same place as “${existing.name}”` });
      return;
    }
    const entry = {
      name: cleaned.name,
      key,
      matchKeys: [key],
      aliases: [],
      qualifiers: cleaned.qualifiers,
      fictional,
      position: entries.length,
      raw: [raw],
    };
    byKey.set(key, entry);
    entries.push(entry);
  };

  for (const raw of subjectPlaces) add(raw, raw, false);
  for (const raw of subjects) {
    if (IMAGINARY_PLACE.test(raw)) add(raw, raw.replace(IMAGINARY_PLACE, "").replace(/,\s*fiction$/i, ""), true);
  }
  return { entries, malformed };
}

/** "St. Petersburg Russia" → "saint petersburg" when "Russia" is a known container. */
function withoutTrailingContainer(key: string, containers: ReadonlySet<string>): string {
  for (const container of containers) {
    if (container && key !== container && key.endsWith(` ${container}`)) return key.slice(0, -container.length - 1);
  }
  return key;
}

// ---------------------------------------------------------------------------
// Merge, confidence, ranking and eligibility
// ---------------------------------------------------------------------------

type Candidate = {
  label: string;
  names: string[];
  wikidata: WikidataPlace | null;
  openLibrary: OpenLibraryPlace | null;
  match: PlaceMatch | null;
};

const MATCH_STRENGTH: Record<PlaceMatch, number> = { "same-label": 3, "wikidata-alias": 2, "wikidata-variant": 1 };

function confidenceOf(candidate: Candidate, workMatch: WikidataWorkMatch | null): PlaceConfidence {
  const strong = workMatch !== "author-title";
  if (candidate.wikidata && candidate.openLibrary) return strong ? "high" : "medium";
  if (candidate.wikidata) return strong && candidate.wikidata.sitelinks > 0 ? "medium" : "low";
  return "low";
}

/** Cross-source agreement first, then fictional settings, then Wikidata prominence and Open Library order. */
function scoreOf(candidate: Candidate): number {
  let score = 0;
  if (candidate.wikidata && candidate.openLibrary) score += 100;
  if (candidate.wikidata?.isFictional || candidate.openLibrary?.fictional) score += 30;
  if (candidate.wikidata) score += 5 * Math.log2(1 + candidate.wikidata.sitelinks);
  if (candidate.openLibrary) score += Math.max(0, 20 - 2 * candidate.openLibrary.position);
  return score;
}

function aliasesOf(candidate: Candidate): string[] {
  const seen = new Set([placeKey(candidate.label)]);
  const aliases: string[] = [];
  for (const name of candidate.names) {
    const key = placeKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    aliases.push(name);
  }
  return aliases.slice(0, 8);
}

export type PlaceInput = {
  openLibrary: { ok: true; subjectPlaces: string[]; subjects: string[] } | { ok: false; error: string };
  wikidata: { ok: true; hasItem: boolean; locations: WikidataPlace[] } | { ok: false; error: string };
  wikidataMatch: WikidataWorkMatch | null;
  /** Open Library names found to be broad containers through their English Wikipedia article. */
  broadNames: { ok: true; names: ReadonlySet<string> } | { ok: false; error: string } | null;
};

/** Open Library names that no Wikidata location accounts for; only these need a broadness lookup. */
export function placeNamesToClassify(input: Omit<PlaceInput, "broadNames">): string[] {
  if (!input.openLibrary.ok) return [];
  const { entries } = parseOpenLibraryPlaces(input.openLibrary.subjectPlaces, input.openLibrary.subjects, []);
  const known = new Set<string>();
  if (input.wikidata.ok) {
    for (const place of input.wikidata.locations) {
      for (const name of [place.label ?? "", ...place.aliases, ...place.otherNames]) known.add(placeKey(name));
    }
  }
  return entries.filter((entry) => !known.has(entry.key)).map((entry) => entry.name);
}

/** Pure: cleaning, merging, broad-container filtering, ranking and the eligibility decision. */
export function derivePlaces(input: PlaceInput): PlaceEnrichment {
  const discarded: DiscardedPlace[] = [];
  const notes: string[] = [];
  const locations = input.wikidata.ok ? input.wikidata.locations : [];
  const parsed = input.openLibrary.ok
    ? parseOpenLibraryPlaces(input.openLibrary.subjectPlaces, input.openLibrary.subjects, discarded)
    : { entries: [], malformed: 0 };
  const rawOpenLibrary = input.openLibrary.ok
    ? [...input.openLibrary.subjectPlaces, ...input.openLibrary.subjects.filter((subject) => IMAGINARY_PLACE.test(subject))]
    : [];

  // Containers: every qualifier the catalogue used, and every broad Wikidata location's names.
  const containers = new Set<string>();
  for (const entry of parsed.entries) for (const qualifier of entry.qualifiers) containers.add(placeKey(qualifier));
  for (const place of locations) {
    if (!place.isBroad) continue;
    for (const name of [place.label ?? "", ...place.aliases]) containers.add(placeKey(name));
  }
  if (input.broadNames?.ok) for (const name of input.broadNames.names) containers.add(placeKey(name));
  containers.delete("");
  if (input.broadNames && !input.broadNames.ok) notes.push(`Broad-place lookup failed (${input.broadNames.error}); Open Library-only places were not checked.`);

  // Open Library entries that differ only by a trailing container join the entry they repeat.
  const openLibrary: OpenLibraryPlace[] = [];
  for (const entry of parsed.entries) {
    const stripped = withoutTrailingContainer(entry.key, containers);
    if (stripped === entry.key) continue;
    const target = parsed.entries.find((other) => other.key === stripped);
    if (target) {
      target.raw.push(...entry.raw);
      target.aliases.push(entry.name);
      target.fictional ||= entry.fictional;
      discarded.push({ name: entry.name, source: "openlibrary", reason: `same place as “${target.name}” with its country appended` });
      entry.key = "";
    } else {
      entry.matchKeys.push(stripped);
    }
  }
  for (const entry of parsed.entries) if (entry.key) openLibrary.push(entry);

  // Wikidata candidates, indexed by label, English alias and other-language label.
  const byQid = new Map<string, Candidate>();
  const labelIndex = new Map<string, Set<string>>();
  const aliasIndex = new Map<string, Set<string>>();
  const variantIndex = new Map<string, Set<string>>();
  const index = (map: Map<string, Set<string>>, name: string, qid: string) => {
    const key = placeKey(name);
    if (!key) return;
    map.set(key, (map.get(key) ?? new Set()).add(qid));
  };
  for (const place of locations) {
    byQid.set(place.qid, { label: place.label ?? "", names: place.label ? [place.label, ...place.aliases] : [...place.aliases], wikidata: place, openLibrary: null, match: null });
    if (place.label) index(labelIndex, place.label, place.qid);
    for (const alias of place.aliases) index(aliasIndex, alias, place.qid);
    for (const name of place.otherNames) index(variantIndex, name, place.qid);
  }
  const unique = (qids: Set<string> | undefined) => (qids && qids.size === 1 ? [...qids][0] : null);

  const openLibraryOnly: Candidate[] = [];
  for (const entry of openLibrary) {
    const keys = [...entry.matchKeys, ...entry.aliases.map(placeKey)];
    let found: { qid: string; match: PlaceMatch } | null = null;
    for (const [map, match] of [[labelIndex, "same-label"], [aliasIndex, "wikidata-alias"], [variantIndex, "wikidata-variant"]] as const) {
      const qid = keys.map((key) => unique(map.get(key))).find(Boolean);
      if (qid) {
        found = { qid, match };
        break;
      }
    }
    if (found) {
      const candidate = byQid.get(found.qid)!;
      if (!candidate.label) candidate.label = entry.name;
      candidate.names.push(entry.name, ...entry.aliases);
      if (!candidate.openLibrary || entry.position < candidate.openLibrary.position) candidate.openLibrary = entry;
      if (!candidate.match || MATCH_STRENGTH[found.match] > MATCH_STRENGTH[candidate.match]) candidate.match = found.match;
      continue;
    }
    openLibraryOnly.push({ label: entry.name, names: [entry.name, ...entry.aliases], wikidata: null, openLibrary: entry, match: null });
  }

  // Broad containers are set aside with the evidence that marked them.
  const specific: Candidate[] = [];
  for (const candidate of [...byQid.values(), ...openLibraryOnly]) {
    const name = candidate.label || candidate.wikidata?.qid || "";
    const source: PlaceSource = candidate.wikidata ? "wikidata" : "openlibrary";
    if (!candidate.label) {
      discarded.push({ name, source, reason: "no English label on Wikidata, and no Open Library name to show" });
    } else if (candidate.wikidata?.isBroad) {
      discarded.push({ name, source, reason: `broad geographic container on Wikidata (${candidate.wikidata.types.join(", ") || "country-level"})` });
    } else if (!candidate.wikidata && containers.has(candidate.openLibrary!.key)) {
      const byCatalogue = parsed.entries.some((entry) => entry.qualifiers.some((qualifier) => placeKey(qualifier) === candidate.openLibrary!.key));
      discarded.push({
        name,
        source,
        reason: byCatalogue
          ? "broad geographic container (the catalogue uses it to qualify another place)"
          : "broad geographic container (its English Wikipedia article is about a country, continent, empire or state)",
      });
    } else {
      specific.push(candidate);
    }
  }

  const candidates = specific
    .map((candidate) => ({ candidate, score: scoreOf(candidate) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.candidate.wikidata?.sitelinks ?? 0) - (a.candidate.wikidata?.sitelinks ?? 0) ||
        (a.candidate.openLibrary?.position ?? Infinity) - (b.candidate.openLibrary?.position ?? Infinity) ||
        a.candidate.label.localeCompare(b.candidate.label),
    )
    .map(({ candidate }, rank): EnrichedPlace => {
      const sources: PlaceSource[] = [];
      if (candidate.openLibrary) sources.push("openlibrary");
      if (candidate.wikidata) sources.push("wikidata");
      return {
        label: candidate.label,
        aliases: aliasesOf(candidate),
        wikidataQid: candidate.wikidata?.qid ?? null,
        sources,
        confidence: confidenceOf(candidate, input.wikidataMatch),
        isFictional: !!(candidate.wikidata?.isFictional || candidate.openLibrary?.fictional),
        rank: rank + 1,
        provenance: {
          openLibrary: candidate.openLibrary ? { names: candidate.openLibrary.raw, position: candidate.openLibrary.position } : null,
          wikidata: candidate.wikidata
            ? { qid: candidate.wikidata.qid, label: candidate.wikidata.label ?? candidate.wikidata.qid, sitelinks: candidate.wikidata.sitelinks, types: candidate.wikidata.types }
            : null,
          match: candidate.match,
          fictionalBy: candidate.wikidata?.isFictional ? "wikidata" : candidate.openLibrary?.fictional ? "openlibrary" : null,
        },
      };
    });

  // Low-confidence places fill the list only for inspection; they never make a book eligible.
  const trusted = candidates.filter((place) => place.confidence !== "low");
  const places = (trusted.length >= MIN_PLACES ? trusted : candidates).slice(0, PLACE_SHORTLIST_SIZE);

  const bothFailed = !input.openLibrary.ok && (!input.wikidata.ok || !input.wikidata.hasItem);
  const totalFound = candidates.length + discarded.filter((item) => item.reason.startsWith("broad")).length;
  const noisy = rawOpenLibrary.length >= NOISE_MIN_ENTRIES && parsed.malformed / rawOpenLibrary.length > 0.5;
  const reason: PlaceIneligibility | null = bothFailed
    ? "sources-unavailable"
    : totalFound === 0
      ? "no-places"
      : candidates.length === 0
        ? "only-broad-places"
        : trusted.length < MIN_PLACES
          ? "insufficient-specific-places"
          : noisy
            ? "catalogue-noise"
            : null;
  const high = trusted.filter((place) => place.confidence === "high").length;
  const anySourceFailed = !input.openLibrary.ok || !input.wikidata.ok;

  return {
    status: reason === null ? "enriched" : reason === "sources-unavailable" || (totalFound === 0 && anySourceFailed) ? "failed" : "sparse",
    confidence: reason !== null ? null : high >= MIN_PLACES ? "high" : "medium",
    eligibility: reason === null ? { eligible: true } : { eligible: false, reason },
    sources: {
      openLibrary: input.openLibrary.ok
        ? { status: "ok", values: rawOpenLibrary.length, kept: openLibrary.length }
        : { status: "failed", error: input.openLibrary.error },
      wikidata: !input.wikidata.ok
        ? { status: "failed", error: input.wikidata.error }
        : input.wikidata.hasItem
          ? { status: "ok", values: locations.length, kept: candidates.filter((place) => place.wikidataQid).length }
          : { status: "no-item" },
    },
    raw: {
      openLibrary: rawOpenLibrary,
      wikidata: locations.map(({ qid, label, isFictional, isBroad, types }) => ({ qid, label, isFictional, isBroad, types })),
    },
    notes,
    places,
    candidates,
    discarded,
  };
}
