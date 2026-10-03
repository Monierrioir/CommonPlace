import "server-only";
import { cache } from "react";
import { WORK_ID_PATTERN } from "./open-library";
import type { WikidataCharacter, WikidataWork } from "./wikidata";
import { gatherWorkSources, type EnrichmentOptions, type WikidataWorkMatch, type WorkSources } from "./work";

export type { EnrichmentOptions, WikidataWorkMatch } from "./work";

/**
 * Read-only character enrichment for one Open Library work: candidate names from
 * Open Library and Wikidata, cleaned and merged by deterministic rules only.
 * Nothing is inferred; anything doubtful is discarded with a stated reason.
 */

export type CharacterSource = "openlibrary" | "wikidata";

/**
 * high   — both sources name the character (same label, a Wikidata alias, or one of
 *          Wikidata's own labels for it in another Latin-script language).
 * medium — Wikidata alone, typed as a character; or both sources joined by a fuller-name match.
 * low    — Open Library alone; or Wikidata alone when the work was matched only by author and title.
 */
export type CharacterConfidence = "high" | "medium" | "low";

/** How an Open Library name was joined to a Wikidata character. */
export type CharacterMatch = "same-label" | "wikidata-alias" | "wikidata-variant" | "fuller-name";

export type EnrichedCharacter = {
  label: string;
  aliases: string[];
  wikidataQid: string | null;
  sources: CharacterSource[];
  confidence: CharacterConfidence;
  rank: number;
  provenance: {
    openLibrary: { names: string[]; position: number } | null;
    wikidata: { qid: string; label: string; sitelinks: number; statements: number; types: string[] } | null;
    match: CharacterMatch | null;
  };
};

export type DiscardedCandidate = { name: string; source: CharacterSource; reason: string };

export type SourceReport =
  | { status: "ok"; candidates: number; kept: number }
  | { status: "failed"; error: string };

export type CharacterEnrichment = {
  status: "enriched" | "sparse" | "failed";
  /** Trust in the shortlist as a whole; null unless enriched. */
  confidence: CharacterConfidence | null;
  work: {
    storedWorkId: string;
    resolvedWorkId: string | null;
    redirectChain: string[];
    title: string | null;
    wikidataItems: WikidataWork[];
    wikidataMatch: WikidataWorkMatch | null;
  };
  sources: { openLibrary: SourceReport; wikidata: SourceReport };
  /** Plain-language notes on how the result was reached, for diagnostics. */
  notes: string[];
  /** Recommended options for a future question, best first. "Someone else" is added by the UI. */
  characters: EnrichedCharacter[];
  /** Every merged candidate in rank order, including those left off the shortlist. */
  candidates: EnrichedCharacter[];
  discarded: DiscardedCandidate[];
};

export const SHORTLIST_SIZE = 8;
const MIN_CHARACTERS = 3;
const MAX_ALIASES = 8;
const MAX_NAME_LENGTH = 60;
const MAX_NAME_WORDS = 6;

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/** Comparison key: accents, case, apostrophes and punctuation removed. Never shown to readers. */
export function nameKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’‘`´]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function words(key: string): string[] {
  return key.split(" ").filter(Boolean);
}

/**
 * True when `longer` is `shorter` with extra middle names, e.g. "Rodion Raskolnikov" →
 * "Rodion Romanovich Raskolnikov". Needs two or more words and the same first and last word.
 */
function isFullerName(shorterKey: string, longerKey: string): boolean {
  const short = words(shorterKey);
  const long = words(longerKey);
  return (
    short.length >= 2 &&
    long.length > short.length &&
    short[0] === long[0] &&
    short.at(-1) === long.at(-1) &&
    short.every((word) => long.includes(word))
  );
}

function sameOrFuller(a: string, b: string): boolean {
  return isFullerName(a, b) || isFullerName(b, a);
}

const CLOSERS: Record<string, string> = { ")": "(", "”": "“", "»": "«" };

/** Brackets and curly quotes must open before they close and pair up; straight quotes must pair. */
function isBalanced(text: string): boolean {
  const stack: string[] = [];
  for (const char of text) {
    if (char === "(" || char === "“" || char === "«") stack.push(char);
    else if (char in CLOSERS && stack.pop() !== CLOSERS[char]) return false;
  }
  return stack.length === 0 && (text.match(/"/g) ?? []).length % 2 === 0;
}

/** "Holmes, Sherlock" → "Sherlock Holmes", only for the plain one-comma catalogue form. */
function uninvert(name: string): string | null {
  const parts = name.split(",").map((part) => part.trim());
  if (parts.length !== 2) return null;
  const [surname, forename] = parts;
  const plain = (part: string) => /^[\p{L}'’.\- ]+$/u.test(part) && words(nameKey(part)).length <= 3;
  return surname && forename && plain(surname) && plain(forename) ? `${forename} ${surname}` : null;
}

function authorKeys(names: string[]): Set<string> {
  const keys = new Set<string>();
  for (const name of names) {
    const withoutDates = name.replace(/\([^)]*\)/g, "").replace(/,?\s*\d{3,4}\s*-\s*(\d{3,4})?\s*$/, "").trim();
    keys.add(nameKey(withoutDates));
    const direct = uninvert(withoutDates);
    if (direct) keys.add(nameKey(direct));
  }
  keys.delete("");
  return keys;
}

type CleanedName = { ok: true; name: string; aliases: string[] } | { ok: false; reason: string };

/** Applies the deterministic cleaning rules to one Open Library `subject_people` entry. */
function cleanOpenLibraryName(raw: string, authors: Set<string>): CleanedName {
  let name = raw.replace(/\s+/g, " ").trim();
  if (!name) return { ok: false, reason: "empty entry" };

  const qualifier = /\s*\((?:fictitious|fictional|legendary|mythical|imaginary) (character|characters)\)\s*$/i.exec(name);
  if (qualifier) {
    if (qualifier[1].toLowerCase() === "characters") return { ok: false, reason: "a group of characters, not one person" };
    name = name.slice(0, qualifier.index).trim();
  }

  if (!isBalanced(name)) return { ok: false, reason: "malformed fragment (unbalanced quotes or brackets)" };
  if (!/^\p{L}/u.test(name)) return { ok: false, reason: "fragment: does not start with a letter" };
  if (/\d/.test(name)) return { ok: false, reason: "contains digits (life dates or catalogue numbers)" };
  if (name.includes("--")) return { ok: false, reason: "catalogue heading subdivision, not a name" };
  if (/\bfamily\b/i.test(name)) return { ok: false, reason: "a family or group, not one person" };

  // Quoted nicknames in brackets become aliases: Ilya Petrovich (“Gunpowder”).
  const aliases: string[] = [];
  let droppedNote = false;
  name = name
    .replace(/\s*\(([^()]*)\)/g, (_, inner: string) => {
      const quoted = [...inner.matchAll(/[“"«]([^”"»]+)[”"»]/g)].map((match) => match[1].replace(/[,;.\s]+$/, "").trim());
      if (quoted.length > 0) aliases.push(...quoted.filter(Boolean));
      else droppedNote = true;
      return "";
    })
    .replace(/\s+/g, " ")
    .trim();
  if (droppedNote && !name) return { ok: false, reason: "only a bracketed note, no name" };

  if (name.includes(",")) {
    const direct = uninvert(name);
    if (!direct) return { ok: false, reason: "list or catalogue form, not a single name" };
    aliases.push(name);
    name = direct;
  }

  if (!/\p{L}/u.test(name)) return { ok: false, reason: "no letters" };
  if (name.length > MAX_NAME_LENGTH || words(nameKey(name)).length > MAX_NAME_WORDS) {
    return { ok: false, reason: "implausibly long for a character name" };
  }
  if (authors.has(nameKey(name))) return { ok: false, reason: "matches the book's author" };

  return { ok: true, name, aliases };
}

// ---------------------------------------------------------------------------
// Merge, confidence and ranking
// ---------------------------------------------------------------------------

type Candidate = {
  label: string;
  names: string[];
  wikidata: WikidataCharacter | null;
  openLibrary: { names: string[]; position: number } | null;
  match: CharacterMatch | null;
};

const MATCH_STRENGTH: Record<CharacterMatch, number> = {
  "same-label": 4,
  "wikidata-alias": 3,
  "wikidata-variant": 2,
  "fuller-name": 1,
};

function confidenceOf(candidate: Candidate, workMatch: WikidataWorkMatch | null): CharacterConfidence {
  if (candidate.wikidata && candidate.openLibrary) return candidate.match === "fuller-name" ? "medium" : "high";
  if (candidate.wikidata) return workMatch === "author-title" ? "low" : "medium";
  return "low";
}

/**
 * Cross-source agreement first, then Wikidata's importance signal (sitelinks), then
 * Open Library's order. Ties fall back to how richly Wikidata describes the character.
 */
function scoreOf(candidate: Candidate): number {
  let score = 0;
  if (candidate.wikidata && candidate.openLibrary) score += 100;
  if (candidate.wikidata) score += 10 * Math.log2(1 + candidate.wikidata.sitelinks);
  if (candidate.openLibrary) score += Math.max(0, 40 - 2 * candidate.openLibrary.position);
  return score;
}

function aliasesOf(candidate: Candidate): string[] {
  const labelKey = nameKey(candidate.label);
  const seen = new Set([labelKey]);
  const aliases: string[] = [];
  for (const name of candidate.names) {
    const key = nameKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    aliases.push(name);
  }
  return aliases.slice(0, MAX_ALIASES);
}

function toEnriched(candidate: Candidate, rank: number, workMatch: WikidataWorkMatch | null): EnrichedCharacter {
  const sources: CharacterSource[] = [];
  if (candidate.openLibrary) sources.push("openlibrary");
  if (candidate.wikidata) sources.push("wikidata");
  return {
    label: candidate.label,
    aliases: aliasesOf(candidate),
    wikidataQid: candidate.wikidata?.qid ?? null,
    sources,
    confidence: confidenceOf(candidate, workMatch),
    rank,
    provenance: {
      openLibrary: candidate.openLibrary,
      wikidata: candidate.wikidata
        ? {
            qid: candidate.wikidata.qid,
            label: candidate.wikidata.label ?? candidate.wikidata.qid,
            sitelinks: candidate.wikidata.sitelinks,
            statements: candidate.wikidata.statements,
            types: candidate.wikidata.types,
          }
        : null,
      match: candidate.match,
    },
  };
}

type OpenLibraryName = { name: string; aliases: string[]; position: number };

function mergeCandidates(
  openLibraryNames: OpenLibraryName[],
  wikidataCharacters: WikidataCharacter[],
  discarded: DiscardedCandidate[],
): Candidate[] {
  const byQid = new Map<string, Candidate>();
  const labelIndex = new Map<string, Set<string>>();
  const aliasIndex = new Map<string, Set<string>>();
  const variantIndex = new Map<string, Set<string>>();
  const index = (map: Map<string, Set<string>>, key: string, qid: string) => {
    if (!key) return;
    const qids = map.get(key) ?? new Set<string>();
    qids.add(qid);
    map.set(key, qids);
  };

  for (const character of wikidataCharacters) {
    const label = character.label;
    byQid.set(character.qid, {
      label: label ?? "",
      names: label ? [label, ...character.aliases] : [...character.aliases],
      wikidata: character,
      openLibrary: null,
      match: null,
    });
    if (label) index(labelIndex, nameKey(label), character.qid);
    for (const alias of character.aliases) index(aliasIndex, nameKey(alias), character.qid);
    for (const variant of character.otherNames) index(variantIndex, nameKey(variant), character.qid);
  }

  // A key that points at two different Wikidata characters is ambiguous and never used.
  const unique = (qids: Set<string> | undefined) => (qids && qids.size === 1 ? [...qids][0] : null);

  function findWikidataMatch(entry: OpenLibraryName): { qid: string; match: CharacterMatch } | null {
    const key = nameKey(entry.name);
    const sameLabel = unique(labelIndex.get(key));
    if (sameLabel) return { qid: sameLabel, match: "same-label" };

    const keys = [key, ...entry.aliases.map(nameKey)];
    for (const candidateKey of keys) {
      const qid = unique(aliasIndex.get(candidateKey)) ?? unique(labelIndex.get(candidateKey));
      if (qid) return { qid, match: "wikidata-alias" };
    }
    for (const candidateKey of keys) {
      const qid = unique(variantIndex.get(candidateKey));
      if (qid) return { qid, match: "wikidata-variant" };
    }

    const fuller = new Set<string>();
    for (const [labelKey, qids] of labelIndex) {
      if (sameOrFuller(key, labelKey)) qids.forEach((qid) => fuller.add(qid));
    }
    return fuller.size === 1 ? { qid: [...fuller][0], match: "fuller-name" } : null;
  }

  const openLibraryOnly: Candidate[] = [];
  for (const entry of openLibraryNames) {
    const found = findWikidataMatch(entry);
    if (found) {
      const candidate = byQid.get(found.qid)!;
      if (!candidate.label) candidate.label = entry.name;
      candidate.names.push(entry.name, ...entry.aliases);
      if (candidate.openLibrary) {
        candidate.openLibrary.names.push(entry.name);
        candidate.openLibrary.position = Math.min(candidate.openLibrary.position, entry.position);
      } else {
        candidate.openLibrary = { names: [entry.name], position: entry.position };
      }
      if (!candidate.match || MATCH_STRENGTH[found.match] > MATCH_STRENGTH[candidate.match]) candidate.match = found.match;
      continue;
    }
    openLibraryOnly.push({
      label: entry.name,
      names: [entry.name, ...entry.aliases],
      wikidata: null,
      openLibrary: { names: [entry.name], position: entry.position },
      match: null,
    });
  }

  // Open Library sometimes lists one person twice ("X Y" and "X Middle Y"). Join only
  // unambiguous pairs; the earlier-listed name stays the label.
  const merged: Candidate[] = [];
  for (const candidate of openLibraryOnly) {
    const key = nameKey(candidate.label);
    const partners = openLibraryOnly.filter((other) => other !== candidate && sameOrFuller(key, nameKey(other.label)));
    const partner = partners.length === 1 ? partners[0] : null;
    const partnerHasOthers =
      partner &&
      openLibraryOnly.filter((other) => other !== partner && sameOrFuller(nameKey(partner.label), nameKey(other.label))).length > 1;
    const target = partner && !partnerHasOthers ? merged.find((kept) => kept === partner) : undefined;
    if (target) {
      target.names.push(...candidate.names);
      target.openLibrary!.names.push(candidate.label);
      discarded.push({
        name: candidate.label,
        source: "openlibrary",
        reason: `same person as “${target.label}” (fuller form of the name); kept as an alias`,
      });
      continue;
    }
    merged.push(candidate);
  }

  // Without an English (or Latin-script) label there is nothing readable to show unless Open Library supplied the name.
  const wikidataKept: Candidate[] = [];
  for (const candidate of byQid.values()) {
    if (candidate.label) wikidataKept.push(candidate);
    else discarded.push({ name: candidate.wikidata!.qid, source: "wikidata", reason: "no English label on Wikidata, and no Open Library name to show" });
  }

  return [...wikidataKept, ...merged];
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function failure(storedWorkId: string, error: string): CharacterEnrichment {
  return {
    status: "failed",
    confidence: null,
    work: { storedWorkId, resolvedWorkId: null, redirectChain: [storedWorkId], title: null, wikidataItems: [], wikidataMatch: null },
    sources: { openLibrary: { status: "failed", error }, wikidata: { status: "failed", error } },
    notes: [],
    characters: [],
    candidates: [],
    discarded: [],
  };
}

export async function enrichCharacters(
  storedWorkId: string,
  options: EnrichmentOptions = {},
): Promise<CharacterEnrichment> {
  if (!WORK_ID_PATTERN.test(storedWorkId)) return failure(storedWorkId, "invalid work id");
  return charactersFromSources(await gatherWorkSources(storedWorkId, options));
}

/** Character enrichment from already-gathered sources; makes no requests of its own. */
export function charactersFromSources(sources: WorkSources): CharacterEnrichment {
  const { storedWorkId, resolution, redirectChain, openLibraryAuthors, wikidata, wikidataMatch } = sources;
  const notes = [...sources.notes];

  const authors = authorKeys([...openLibraryAuthors.names, ...(wikidata.ok ? wikidata.data.authorNames : [])]);
  const discarded: DiscardedCandidate[] = [];

  // Open Library candidates, cleaned and de-duplicated by comparison key.
  const openLibraryNames: OpenLibraryName[] = [];
  if (resolution.ok) {
    const seen = new Map<string, OpenLibraryName>();
    for (const raw of resolution.work.subjectPeople) {
      const cleaned = cleanOpenLibraryName(raw, authors);
      if (!cleaned.ok) {
        discarded.push({ name: raw, source: "openlibrary", reason: cleaned.reason });
        continue;
      }
      const key = nameKey(cleaned.name);
      const existing = seen.get(key);
      if (existing) {
        existing.aliases.push(...cleaned.aliases);
        discarded.push({ name: raw, source: "openlibrary", reason: `duplicate of “${existing.name}”` });
        continue;
      }
      const entry = { name: cleaned.name, aliases: cleaned.aliases, position: openLibraryNames.length };
      seen.set(key, entry);
      openLibraryNames.push(entry);
    }
  }

  // Wikidata candidates must be typed as a character; unlabelled ones are settled during the merge.
  const wikidataCharacters: WikidataCharacter[] = [];
  if (wikidata.ok) {
    for (const character of wikidata.data.characters) {
      const name = character.label ?? character.qid;
      if (!character.isCharacter) {
        discarded.push({
          name,
          source: "wikidata",
          reason: `not typed as a character on Wikidata (${character.types.join(", ") || "no type"})`,
        });
      } else if (character.label && authors.has(nameKey(character.label))) {
        discarded.push({ name, source: "wikidata", reason: "is the book's author" });
      } else {
        wikidataCharacters.push(character);
      }
    }
  }

  const candidates = mergeCandidates(openLibraryNames, wikidataCharacters, discarded)
    .map((candidate) => ({ candidate, score: scoreOf(candidate) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.candidate.wikidata?.sitelinks ?? 0) - (a.candidate.wikidata?.sitelinks ?? 0) ||
        (b.candidate.wikidata?.statements ?? 0) - (a.candidate.wikidata?.statements ?? 0) ||
        (a.candidate.openLibrary?.position ?? Infinity) - (b.candidate.openLibrary?.position ?? Infinity) ||
        a.candidate.label.localeCompare(b.candidate.label),
    )
    .map(({ candidate }, index) => toEnriched(candidate, index + 1, wikidataMatch));

  // Quality over coverage: Open Library-only names fill the list only when too few corroborated ones exist.
  const trusted = candidates.filter((character) => character.confidence !== "low");
  const characters = (trusted.length >= MIN_CHARACTERS ? trusted : candidates).slice(0, SHORTLIST_SIZE);

  const high = characters.filter((character) => character.confidence === "high").length;
  const highOrMedium = characters.filter((character) => character.confidence !== "low").length;
  const anySourceFailed = !resolution.ok || !wikidata.ok;
  const status =
    characters.length >= MIN_CHARACTERS ? "enriched" : characters.length === 0 && anySourceFailed ? "failed" : "sparse";

  return {
    status,
    confidence:
      status !== "enriched" ? null : high >= MIN_CHARACTERS ? "high" : highOrMedium >= MIN_CHARACTERS ? "medium" : "low",
    work: {
      storedWorkId,
      resolvedWorkId: resolution.ok ? resolution.work.resolvedWorkId : null,
      redirectChain,
      title: resolution.ok ? resolution.work.title : (wikidata.ok ? wikidata.data.works[0]?.label ?? null : null),
      wikidataItems: wikidata.ok ? wikidata.data.works : [],
      wikidataMatch,
    },
    notes,
    sources: {
      openLibrary: resolution.ok
        ? { status: "ok", candidates: resolution.work.subjectPeople.length, kept: openLibraryNames.length }
        : { status: "failed", error: resolution.error },
      wikidata: wikidata.ok
        ? {
            status: "ok",
            candidates: wikidata.data.characters.length,
            kept: candidates.filter((character) => character.wikidataQid).length,
          }
        : { status: "failed", error: wikidata.error },
    },
    characters,
    candidates,
    discarded,
  };
}

/** Per-request memoized lookup for server code; cross-request caching happens in the fetch layer. */
export const getCharacterEnrichment = cache((storedWorkId: string) => enrichCharacters(storedWorkId));
