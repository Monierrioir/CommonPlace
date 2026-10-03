// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import "server-only";
import { fetchOpenLibraryAuthors, resolveOpenLibraryWork, WORK_ID_PATTERN } from "@/lib/enrichment/open-library";
import { fetchJson, isRecord, sparql } from "./http";

/**
 * Finds openly licensed full texts for an Open Library work by following identifiers
 * only — never by title search:
 *   Open Library work → its editions → Wikidata items that carry those edition ids
 *   (P648), or editions (P629) of the Wikidata item that carries the work id →
 *   an English Wikisource sitelink or a Project Gutenberg id (P2034) on that edition.
 * Open Library's own edition identifiers (project_gutenberg) are read too.
 */

export type OpenLibraryEdition = {
  id: string;
  title: string | null;
  publishDate: string | null;
  publishers: string[];
  languages: string[];
  gutenbergIds: string[];
  internetArchiveId: string | null;
};

export type TextSourceCandidate = {
  kind: "wikisource" | "gutenberg";
  /** Wikisource page title, or Gutenberg ebook number. */
  locator: string;
  edition: { wikidataQid: string | null; openLibraryEditionId: string | null; label: string | null; language: string | null; translator: string | null; year: string | null };
  /** Each step that links the source to the stored work. */
  chain: string[];
};

export type WorkIdentity = {
  storedWorkId: string;
  resolvedWorkId: string | null;
  redirectChain: string[];
  title: string | null;
  authorNames: string[];
  editionCount: number;
  editions: OpenLibraryEdition[];
  wikidataWorks: string[];
  candidates: TextSourceCandidate[];
  notes: string[];
};

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function fetchEditions(workId: string): Promise<{ ok: true; total: number; editions: OpenLibraryEdition[] } | { ok: false; error: string }> {
  const result = await fetchJson(`https://openlibrary.org/works/${workId}/editions.json?limit=500`, { timeoutMs: 15000 });
  if (!result.ok) return result;
  if (!isRecord(result.data) || !Array.isArray(result.data.entries)) return { ok: false, error: "unexpected editions response" };
  const editions = result.data.entries.filter(isRecord).flatMap((entry): OpenLibraryEdition[] => {
    const id = typeof entry.key === "string" ? entry.key.split("/").pop() : undefined;
    if (!id || !/^OL\d+M$/.test(id)) return [];
    const identifiers = isRecord(entry.identifiers) ? entry.identifiers : {};
    return [
      {
        id,
        title: typeof entry.title === "string" ? entry.title : null,
        publishDate: typeof entry.publish_date === "string" ? entry.publish_date : null,
        publishers: strings(entry.publishers),
        languages: Array.isArray(entry.languages)
          ? entry.languages.filter(isRecord).map((language) => String(language.key ?? "").split("/").pop() ?? "").filter(Boolean)
          : [],
        gutenbergIds: strings(identifiers.project_gutenberg),
        internetArchiveId: typeof entry.ocaid === "string" ? entry.ocaid : null,
      },
    ];
  });
  const total = typeof result.data.size === "number" ? result.data.size : editions.length;
  return { ok: true, total, editions };
}

function literal(text: string): string {
  return `"${text.replace(/["\\]/g, "")}"`;
}

function editionQuery(editionIds: string[], workIds: string[]): string {
  const branches: string[] = [];
  if (editionIds.length > 0) {
    branches.push(`{ VALUES ?olid { ${editionIds.map(literal).join(" ")} } ?edition wdt:P648 ?olid . BIND("edition" AS ?via) }`);
  }
  if (workIds.length > 0) {
    branches.push(`{ VALUES ?wolid { ${workIds.map(literal).join(" ")} } ?work wdt:P648 ?wolid . ?edition wdt:P629 ?work . BIND("work" AS ?via) }`);
  }
  return `SELECT ?edition ?editionLabel ?via ?olid ?wolid ?work ?pg ?ws ?languageLabel ?translatorLabel ?date WHERE {
  ${branches.join(" UNION ")}
  OPTIONAL { ?edition wdt:P629 ?work }
  OPTIONAL { ?edition wdt:P2034 ?pg }
  OPTIONAL { ?ws schema:about ?edition ; schema:isPartOf <https://en.wikisource.org/> }
  OPTIONAL { ?edition wdt:P407 ?language }
  OPTIONAL { ?edition wdt:P655 ?translator }
  OPTIONAL { ?edition wdt:P577 ?date }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
}

const qid = (uri: string | undefined) => uri?.split("/").pop() ?? null;

export async function identifyWork(storedWorkId: string): Promise<WorkIdentity> {
  const notes: string[] = [];
  const empty = { resolvedWorkId: null, redirectChain: [storedWorkId], title: null, authorNames: [], editionCount: 0, editions: [], wikidataWorks: [], candidates: [] };
  if (!WORK_ID_PATTERN.test(storedWorkId)) return { storedWorkId, ...empty, notes: ["Not an Open Library work id."] };

  const resolution = await resolveOpenLibraryWork(storedWorkId);
  if (!resolution.ok) return { storedWorkId, ...empty, redirectChain: resolution.redirectChain, notes: [`Open Library: ${resolution.error}`] };
  const work = resolution.work;
  if (work.redirectChain.length > 1) notes.push(`Open Library redirects ${work.redirectChain.join(" → ")}.`);

  const authors = await fetchOpenLibraryAuthors(work.authorKeys);
  const editions = await fetchEditions(work.resolvedWorkId);
  if (!editions.ok) notes.push(`Editions: ${editions.error}.`);
  const editionList = editions.ok ? editions.editions : [];
  const candidates: TextSourceCandidate[] = [];

  for (const edition of editionList) {
    for (const id of edition.gutenbergIds) {
      candidates.push({
        kind: "gutenberg",
        locator: id,
        edition: { wikidataQid: null, openLibraryEditionId: edition.id, label: edition.title, language: edition.languages.join(", ") || null, translator: null, year: edition.publishDate },
        chain: [`Open Library work ${work.resolvedWorkId}`, `edition ${edition.id}`, `Open Library identifier project_gutenberg = ${id}`],
      });
    }
  }

  const wikidataWorks = new Set<string>();
  const found = await sparql(editionQuery(editionList.map((edition) => edition.id), work.redirectChain));
  if (!found.ok) notes.push(`Wikidata edition lookup failed: ${found.error}.`);
  for (const row of found.ok ? found.data : []) {
    const editionQid = qid(row.edition?.value);
    const workQid = qid(row.work?.value);
    if (workQid) wikidataWorks.add(workQid);
    const via =
      row.via?.value === "edition"
        ? [`Open Library work ${work.resolvedWorkId}`, `edition ${row.olid?.value}`, `Wikidata ${editionQid} lists that edition id (P648)`]
        : [`Open Library work ${work.resolvedWorkId}`, `Wikidata ${workQid} lists work id ${row.wolid?.value} (P648)`, `${editionQid} is an edition of it (P629)`];
    const edition = {
      wikidataQid: editionQid,
      openLibraryEditionId: row.olid?.value ?? null,
      label: row.editionLabel?.value ?? null,
      language: row.languageLabel?.value ?? null,
      translator: row.translatorLabel?.value ?? null,
      year: row.date?.value?.slice(0, 4) ?? null,
    };
    const wsTitle = row.ws?.value ? decodeURIComponent(row.ws.value.split("/wiki/").pop() ?? "").replace(/_/g, " ") : null;
    if (wsTitle && !candidates.some((c) => c.kind === "wikisource" && c.locator === wsTitle)) {
      candidates.push({ kind: "wikisource", locator: wsTitle, edition, chain: [...via, `English Wikisource sitelink “${wsTitle}”`] });
    }
    if (row.pg?.value && !candidates.some((c) => c.kind === "gutenberg" && c.locator === row.pg?.value)) {
      candidates.push({ kind: "gutenberg", locator: row.pg.value, edition, chain: [...via, `Project Gutenberg ebook id (P2034) ${row.pg.value}`] });
    }
  }
  if (candidates.length === 0) notes.push("No edition of this work links to an open full text through identifiers.");

  return {
    storedWorkId,
    resolvedWorkId: work.resolvedWorkId,
    redirectChain: work.redirectChain,
    title: work.title,
    authorNames: authors.names,
    editionCount: editions.ok ? editions.total : 0,
    editions: editionList,
    wikidataWorks: [...wikidataWorks],
    candidates,
    notes,
  };
}
