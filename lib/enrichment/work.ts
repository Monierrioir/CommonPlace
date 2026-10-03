import "server-only";
import {
  fetchOpenLibraryAuthors,
  openLibraryWorkResolvesTo,
  resolveOpenLibraryWork,
  type OpenLibraryAuthors,
  type ResolvedWork,
  type WorkResolution,
} from "./open-library";
import { fetchWikidataCharacters, findWikidataWorksByAuthorAndTitle, type WikidataOutcome } from "./wikidata";

/**
 * Finds one Open Library work and its Wikidata item(s) once, so every kind of
 * enrichment (characters, themes, places) reads the same identity and records.
 */

/**
 * How the Wikidata work item was found:
 * open-library-id        — it lists the current Open Library work id.
 * merged-open-library-id — it lists an older id that Open Library now redirects to this work.
 * author-title           — same author and title, and it lists no Open Library id at all.
 */
export type WikidataWorkMatch = "open-library-id" | "merged-open-library-id" | "author-title";

export type EnrichmentOptions = {
  /** Development-only: point one source at an unreachable host to exercise failure handling. */
  simulateFailure?: "openlibrary" | "wikidata";
};

const UNREACHABLE_OPEN_LIBRARY = "https://openlibrary.simulated-outage.invalid";
const UNREACHABLE_WIKIDATA = "https://query.simulated-outage.invalid/sparql";

export type Endpoints = { openLibrary: string | undefined; wikidata: string | undefined };

export type WorkSources = {
  storedWorkId: string;
  endpoints: Endpoints;
  resolution: WorkResolution;
  redirectChain: string[];
  openLibraryAuthors: OpenLibraryAuthors;
  /** The character query doubles as the lookup of the work's Wikidata item(s). */
  wikidata: WikidataOutcome;
  wikidataMatch: WikidataWorkMatch | null;
  /** Plain-language notes on how the work was identified, for diagnostics. */
  notes: string[];
};

/**
 * Open Library does not list the ids merged into a work, so a Wikidata item that only
 * knows an older id is found through the author instead. It is accepted when one of
 * its Open Library ids redirects to this work, or — marked as weaker — when it lists
 * no Open Library id at all and is the only same-titled work by that author.
 */
async function findWikidataItemByAuthor(
  work: ResolvedWork,
  authorQids: string[],
  endpoints: Endpoints,
  notes: string[],
): Promise<{ qid: string; match: WikidataWorkMatch; viaOpenLibraryId: string | null } | null> {
  if (!work.title || authorQids.length === 0) return null;
  const found = await findWikidataWorksByAuthorAndTitle(authorQids, work.title, endpoints.wikidata);
  if (!found.ok) {
    notes.push(`Author-and-title lookup on Wikidata failed: ${found.error}.`);
    return null;
  }

  const verified: { qid: string; viaOpenLibraryId: string }[] = [];
  const withoutIds: string[] = [];
  for (const match of found.matches) {
    if (match.openLibraryIds.length === 0) {
      withoutIds.push(match.qid);
      continue;
    }
    for (const id of match.openLibraryIds.slice(0, 3)) {
      if (await openLibraryWorkResolvesTo(id, work.resolvedWorkId, endpoints.openLibrary)) {
        verified.push({ qid: match.qid, viaOpenLibraryId: id });
        break;
      }
    }
  }

  if (verified.length === 1) {
    notes.push(
      `Wikidata item ${verified[0].qid} lists ${verified[0].viaOpenLibraryId}, which Open Library redirects to ${work.resolvedWorkId}.`,
    );
    return { qid: verified[0].qid, match: "merged-open-library-id", viaOpenLibraryId: verified[0].viaOpenLibraryId };
  }
  if (verified.length === 0 && withoutIds.length === 1) {
    notes.push(`Wikidata item ${withoutIds[0]} matched by author and title only; its data is treated as low confidence.`);
    return { qid: withoutIds[0], match: "author-title", viaOpenLibraryId: null };
  }
  if (found.matches.length > 0) {
    notes.push(`Author-and-title lookup found ${found.matches.length} Wikidata item(s) but none could be confirmed; none used.`);
  }
  return null;
}

/** Expects a valid Open Library work id; callers check it first. */
export async function gatherWorkSources(storedWorkId: string, options: EnrichmentOptions = {}): Promise<WorkSources> {
  const endpoints: Endpoints = {
    openLibrary: options.simulateFailure === "openlibrary" ? UNREACHABLE_OPEN_LIBRARY : undefined,
    wikidata: options.simulateFailure === "wikidata" ? UNREACHABLE_WIKIDATA : undefined,
  };
  const notes: string[] = [];

  const resolution = await resolveOpenLibraryWork(storedWorkId, endpoints.openLibrary);
  const redirectChain = resolution.ok ? resolution.work.redirectChain : resolution.redirectChain;
  const openLibraryAuthors = resolution.ok
    ? await fetchOpenLibraryAuthors(resolution.work.authorKeys, endpoints.openLibrary)
    : { names: [], wikidataIds: [] };
  if (resolution.ok && redirectChain.length > 1) {
    notes.push(`Open Library merged ${storedWorkId} into ${resolution.work.resolvedWorkId}.`);
  }

  // Wikidata may still reference an id that Open Library has since merged away, so ask for all of them.
  let wikidataMatch: WikidataWorkMatch | null = null;
  let wikidata: WikidataOutcome = await fetchWikidataCharacters({ openLibraryIds: redirectChain }, endpoints.wikidata);
  if (wikidata.ok && wikidata.data.works.length > 0) {
    const currentId = resolution.ok ? resolution.work.resolvedWorkId : storedWorkId;
    wikidataMatch = wikidata.data.works.some((work) => work.matchedOpenLibraryId === currentId)
      ? "open-library-id"
      : "merged-open-library-id";
  } else if (wikidata.ok && resolution.ok) {
    const fallback = await findWikidataItemByAuthor(resolution.work, openLibraryAuthors.wikidataIds, endpoints, notes);
    if (fallback) {
      const byQid = await fetchWikidataCharacters({ qids: [fallback.qid] }, endpoints.wikidata);
      if (byQid.ok) {
        wikidataMatch = fallback.match;
        wikidata = {
          ok: true,
          data: {
            ...byQid.data,
            works: byQid.data.works.map((work) => ({ ...work, matchedOpenLibraryId: fallback.viaOpenLibraryId })),
          },
        };
      } else {
        wikidata = byQid;
      }
    } else if (openLibraryAuthors.wikidataIds.length === 0) {
      notes.push("No Wikidata item lists this work, and its Open Library author record has no Wikidata id to search by.");
    }
  }

  return { storedWorkId, endpoints, resolution, redirectChain, openLibraryAuthors, wikidata, wikidataMatch, notes };
}
