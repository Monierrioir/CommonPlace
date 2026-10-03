import "server-only";
import { fetchJson, isRecord, stringList } from "./http";

const BASE_URL = "https://openlibrary.org";
const TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 5;
const MAX_AUTHORS = 4;

export const WORK_ID_PATTERN = /^OL\d{1,12}W$/;
const AUTHOR_KEY_PATTERN = /^\/authors\/OL\d{1,12}A$/;

export type ResolvedWork = {
  storedWorkId: string;
  resolvedWorkId: string;
  /** Every id visited, starting with the stored one. Length > 1 means the work was merged. */
  redirectChain: string[];
  title: string | null;
  authorKeys: string[];
  /** Raw `subject_people` entries: candidate data, not yet trusted. */
  subjectPeople: string[];
  /** Raw `subjects` entries: themes mixed with genres, formats, languages and catalogue tags. */
  subjects: string[];
  /** Raw `subject_places` entries. */
  subjectPlaces: string[];
};

export type WorkResolution = { ok: true; work: ResolvedWork } | { ok: false; error: string; redirectChain: string[] };

/** Follows Open Library's work redirects (left behind when duplicate works are merged). */
export async function resolveOpenLibraryWork(storedWorkId: string, baseUrl = BASE_URL): Promise<WorkResolution> {
  const chain = [storedWorkId];
  let workId = storedWorkId;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const result = await fetchJson(`${baseUrl}/works/${workId}.json`, { timeoutMs: TIMEOUT_MS });
    if (!result.ok) return { ok: false, error: result.error, redirectChain: chain };
    if (!isRecord(result.data)) return { ok: false, error: "unexpected work record", redirectChain: chain };

    const record = result.data;
    const type = isRecord(record.type) ? record.type.key : null;

    if (type === "/type/redirect") {
      const next = typeof record.location === "string" ? /^\/works\/(OL\d{1,12}W)$/.exec(record.location)?.[1] : null;
      if (!next || chain.includes(next)) return { ok: false, error: "broken or looping redirect", redirectChain: chain };
      chain.push(next);
      workId = next;
      continue;
    }
    if (type === "/type/delete") return { ok: false, error: "work was deleted", redirectChain: chain };
    if (type !== "/type/work") return { ok: false, error: `unexpected record type ${String(type)}`, redirectChain: chain };

    const authorKeys = Array.isArray(record.authors)
      ? record.authors
          .map((entry) => (isRecord(entry) && isRecord(entry.author) ? entry.author.key : null))
          .filter((key): key is string => typeof key === "string" && AUTHOR_KEY_PATTERN.test(key))
      : [];

    return {
      ok: true,
      work: {
        storedWorkId,
        resolvedWorkId: workId,
        redirectChain: chain,
        title: typeof record.title === "string" ? record.title.trim() || null : null,
        authorKeys: [...new Set(authorKeys)],
        subjectPeople: stringList(record.subject_people),
        subjects: stringList(record.subjects),
        subjectPlaces: stringList(record.subject_places),
      },
    };
  }

  return { ok: false, error: "too many redirects", redirectChain: chain };
}

export type OpenLibraryAuthors = {
  /** Names the authors go by, used to spot authors listed among the characters. */
  names: string[];
  /** Wikidata ids recorded on the author records, used to find the work on Wikidata. */
  wikidataIds: string[];
};

export async function fetchOpenLibraryAuthors(authorKeys: string[], baseUrl = BASE_URL): Promise<OpenLibraryAuthors> {
  const names: string[] = [];
  const wikidataIds: string[] = [];
  // Sequential on purpose: Open Library asks for a low request rate.
  for (const key of authorKeys.slice(0, MAX_AUTHORS)) {
    const result = await fetchJson(`${baseUrl}${key}.json`, { timeoutMs: TIMEOUT_MS });
    if (!result.ok || !isRecord(result.data)) continue;
    const author = result.data;
    for (const value of [author.name, author.personal_name, author.fuller_name]) {
      if (typeof value === "string") names.push(value);
    }
    names.push(...stringList(author.alternate_names));
    const wikidata = isRecord(author.remote_ids) ? author.remote_ids.wikidata : null;
    if (typeof wikidata === "string" && /^Q\d{1,12}$/.test(wikidata)) wikidataIds.push(wikidata);
  }
  return { names, wikidataIds: [...new Set(wikidataIds)] };
}

/** True when `workId` is, or redirects to, `targetWorkId`. */
export async function openLibraryWorkResolvesTo(workId: string, targetWorkId: string, baseUrl = BASE_URL): Promise<boolean> {
  if (!WORK_ID_PATTERN.test(workId)) return false;
  if (workId === targetWorkId) return true;
  const resolution = await resolveOpenLibraryWork(workId, baseUrl);
  return resolution.ok && resolution.work.resolvedWorkId === targetWorkId;
}
