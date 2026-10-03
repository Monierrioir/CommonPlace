import "server-only";
import { fetchJson, isRecord } from "./http";
import { WORK_ID_PATTERN } from "./open-library";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const TIMEOUT_MS = 10000;
const QID_PATTERN = /^Q\d{1,12}$/;
const MAX_TITLE_MATCHES = 5;

/**
 * Latin-script languages whose labels are used only to recognise transliteration
 * variants of the same Wikidata character (Sofya / Sofia). Never shown to readers.
 */
const MATCHING_LANGUAGES = ["de", "fr", "es", "it", "pt", "nl", "sv", "da", "nb", "pl", "cs", "fi"];
const LATIN_SCRIPT = /^[\p{Script=Latin}\p{M}\s'’‘.\-]+$/u;

export type WikidataWork = { qid: string; label: string | null; matchedOpenLibraryId: string | null };

export type WikidataCharacter = {
  qid: string;
  /** English label, else the language-neutral "mul" label when it is in Latin script; otherwise null. */
  label: string | null;
  /** English aliases. */
  aliases: string[];
  /** Labels in other Latin-script languages, for matching only. */
  otherNames: string[];
  /** Number of Wikimedia sites with an article: a rough, cross-language importance signal. */
  sitelinks: number;
  /** Number of statements on the item: how richly Wikidata describes the character. */
  statements: number;
  /** Instance of a fictional-character class, or of human (characters in historical fiction). */
  isCharacter: boolean;
  types: string[];
};

export type WikidataCharacterData = {
  works: WikidataWork[];
  authorNames: string[];
  characters: WikidataCharacter[];
};

export type WikidataOutcome = { ok: true; data: WikidataCharacterData } | { ok: false; error: string };

type Binding = Record<string, { value: string } | undefined>;
type SparqlOutcome = { ok: true; bindings: Binding[] } | { ok: false; error: string };

function qidOf(uri: string | undefined): string | null {
  const qid = uri?.split("/").pop();
  return qid && QID_PATTERN.test(qid) ? qid : null;
}

function literal(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ")}"`;
}

async function runQuery(query: string, endpoint: string): Promise<SparqlOutcome> {
  const params = new URLSearchParams({ query, format: "json" });
  const result = await fetchJson(`${endpoint}?${params}`, {
    timeoutMs: TIMEOUT_MS,
    accept: "application/sparql-results+json",
  });
  if (!result.ok) return result;
  const bindings =
    isRecord(result.data) && isRecord(result.data.results) && Array.isArray(result.data.results.bindings)
      ? (result.data.results.bindings as Binding[])
      : null;
  return bindings ? { ok: true, bindings } : { ok: false, error: "unexpected SPARQL response" };
}

export type WorkSelector = { openLibraryIds: string[] } | { qids: string[] };

/**
 * P648 = Open Library ID, P674 = characters, P50 = author, P31 = instance of,
 * Q95074 = fictional character, Q5 = human. Each UNION branch adds one kind of
 * fact, so rows never multiply across aliases, types and labels.
 */
function charactersQuery(selector: WorkSelector): string {
  const head =
    "openLibraryIds" in selector
      ? `VALUES ?olid { ${selector.openLibraryIds.map(literal).join(" ")} }\n  ?work wdt:P648 ?olid .`
      : `VALUES ?work { ${selector.qids.map((qid) => `wd:${qid}`).join(" ")} }`;
  const languages = MATCHING_LANGUAGES.map(literal).join(", ");
  return `SELECT ?work ?workLabel ?olid ?authorLabel ?char ?charLabel ?charMul ?sitelinks ?statements ?isCharacter ?alias ?otherName ?typeLabel WHERE {
  ${head}
  OPTIONAL { ?work rdfs:label ?workLabel . FILTER(LANG(?workLabel) = "en") }
  {
  } UNION {
    ?work wdt:P50 ?author .
    ?author rdfs:label ?authorLabel . FILTER(LANG(?authorLabel) = "en")
  } UNION {
    ?work wdt:P674 ?char .
    OPTIONAL { ?char rdfs:label ?charLabel . FILTER(LANG(?charLabel) = "en") }
    OPTIONAL { ?char rdfs:label ?charMul . FILTER(LANG(?charMul) = "mul") }
    OPTIONAL { ?char wikibase:sitelinks ?sitelinks }
    OPTIONAL { ?char wikibase:statements ?statements }
    BIND(EXISTS { ?char wdt:P31/wdt:P279* wd:Q95074 } || EXISTS { ?char wdt:P31 wd:Q5 } AS ?isCharacter)
  } UNION {
    ?work wdt:P674 ?char .
    ?char skos:altLabel ?alias . FILTER(LANG(?alias) = "en")
  } UNION {
    ?work wdt:P674 ?char .
    ?char rdfs:label ?otherName . FILTER(LANG(?otherName) IN (${languages}))
  } UNION {
    ?work wdt:P674 ?char .
    ?char wdt:P31 ?type . ?type rdfs:label ?typeLabel . FILTER(LANG(?typeLabel) = "en")
  }
}`;
}

type Accumulator = WikidataCharacter & { aliasSet: Set<string>; otherSet: Set<string>; typeSet: Set<string> };

/** Reads the characters of the Wikidata work item(s) chosen by Open Library id or by QID. */
export async function fetchWikidataCharacters(
  selector: WorkSelector,
  endpoint = SPARQL_ENDPOINT,
): Promise<WikidataOutcome> {
  const clean: WorkSelector =
    "openLibraryIds" in selector
      ? { openLibraryIds: [...new Set(selector.openLibraryIds)].filter((id) => WORK_ID_PATTERN.test(id)) }
      : { qids: [...new Set(selector.qids)].filter((qid) => QID_PATTERN.test(qid)) };
  if (("openLibraryIds" in clean ? clean.openLibraryIds : clean.qids).length === 0) {
    return { ok: false, error: "no valid identifiers" };
  }

  const result = await runQuery(charactersQuery(clean), endpoint);
  if (!result.ok) return result;

  const works = new Map<string, WikidataWork>();
  const authorNames = new Set<string>();
  const characters = new Map<string, Accumulator>();

  for (const row of result.bindings) {
    const workQid = qidOf(row.work?.value);
    if (workQid && !works.has(workQid)) {
      works.set(workQid, { qid: workQid, label: row.workLabel?.value ?? null, matchedOpenLibraryId: row.olid?.value ?? null });
    }
    if (row.authorLabel?.value) authorNames.add(row.authorLabel.value);

    const charQid = qidOf(row.char?.value);
    if (!charQid) continue;
    let character = characters.get(charQid);
    if (!character) {
      character = {
        qid: charQid,
        label: null,
        aliases: [],
        otherNames: [],
        sitelinks: 0,
        statements: 0,
        isCharacter: false,
        types: [],
        aliasSet: new Set(),
        otherSet: new Set(),
        typeSet: new Set(),
      };
      characters.set(charQid, character);
    }
    const mul = row.charMul?.value;
    const label = row.charLabel?.value ?? (mul && LATIN_SCRIPT.test(mul) ? mul : undefined);
    if (label && !character.label) character.label = label;
    if (row.sitelinks?.value) character.sitelinks = Math.max(character.sitelinks, Number(row.sitelinks.value) || 0);
    if (row.statements?.value) character.statements = Math.max(character.statements, Number(row.statements.value) || 0);
    if (row.isCharacter?.value === "true") character.isCharacter = true;
    if (row.alias?.value) character.aliasSet.add(row.alias.value);
    if (row.otherName?.value) character.otherSet.add(row.otherName.value);
    if (row.typeLabel?.value) character.typeSet.add(row.typeLabel.value);
  }

  return {
    ok: true,
    data: {
      works: [...works.values()],
      authorNames: [...authorNames],
      characters: [...characters.values()].map(({ aliasSet, otherSet, typeSet, ...character }) => ({
        ...character,
        aliases: [...aliasSet],
        otherNames: [...otherSet],
        types: [...typeSet],
      })),
    },
  };
}

/** A main subject (P921) or genre (P136) of a work, exactly as Wikidata labels it in English. */
export type WikidataConcept = { qid: string; label: string | null };

export type WikidataPlace = {
  qid: string;
  /** English label, else the "mul" label when it is in Latin script; otherwise null. */
  label: string | null;
  aliases: string[];
  /** Labels in other Latin-script languages, for matching only. */
  otherNames: string[];
  sitelinks: number;
  /** Instance of fictional location (Q3895768), directly or through a subclass. */
  isFictional: boolean;
  /** Instance of a country, continent, empire or federated state: a container rather than a setting. */
  isBroad: boolean;
  types: string[];
};

export type WikidataFacets = {
  mainSubjects: WikidataConcept[];
  genres: WikidataConcept[];
  locations: WikidataPlace[];
};

export type WikidataFacetsOutcome = { ok: true; data: WikidataFacets } | { ok: false; error: string };

/**
 * Country (Q6256), continent (Q5107), sovereign state (Q3624078), historical country
 * (Q3024240), constituent country (Q3336843), empire (Q48349), federated state (Q107390).
 * Broader classes such as "geographic region" are left out: cities are regions too.
 */
const BROAD_PLACE_CLASSES = ["Q6256", "Q5107", "Q3624078", "Q3024240", "Q3336843", "Q48349", "Q107390"];
const FICTIONAL_LOCATION = "Q3895768";

function isBroadPattern(variable: string): string {
  return `EXISTS { VALUES ?broadClass { ${BROAD_PLACE_CLASSES.map((qid) => `wd:${qid}`).join(" ")} } ${variable} wdt:P31/wdt:P279* ?broadClass }`;
}

/** P921 = main subject, P136 = genre, P840 = narrative location. One UNION branch per kind of fact. */
function facetsQuery(qids: string[]): string {
  const languages = MATCHING_LANGUAGES.map(literal).join(", ");
  return `SELECT ?kind ?item ?itemLabel ?itemMul ?sitelinks ?fictional ?broad ?alias ?otherName ?typeLabel WHERE {
  VALUES ?work { ${qids.map((qid) => `wd:${qid}`).join(" ")} }
  {
    ?work wdt:P921 ?item . BIND("subject" AS ?kind)
    OPTIONAL { ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = "en") }
  } UNION {
    ?work wdt:P136 ?item . BIND("genre" AS ?kind)
    OPTIONAL { ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = "en") }
  } UNION {
    ?work wdt:P840 ?item . BIND("place" AS ?kind)
    OPTIONAL { ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = "en") }
    OPTIONAL { ?item rdfs:label ?itemMul . FILTER(LANG(?itemMul) = "mul") }
    OPTIONAL { ?item wikibase:sitelinks ?sitelinks }
    BIND(EXISTS { ?item wdt:P31/wdt:P279* wd:${FICTIONAL_LOCATION} } AS ?fictional)
    BIND(${isBroadPattern("?item")} AS ?broad)
  } UNION {
    ?work wdt:P840 ?item . BIND("place" AS ?kind)
    ?item skos:altLabel ?alias . FILTER(LANG(?alias) = "en")
  } UNION {
    ?work wdt:P840 ?item . BIND("place" AS ?kind)
    ?item rdfs:label ?otherName . FILTER(LANG(?otherName) IN (${languages}))
  } UNION {
    ?work wdt:P840 ?item . BIND("place" AS ?kind)
    ?item wdt:P31 ?type . ?type rdfs:label ?typeLabel . FILTER(LANG(?typeLabel) = "en")
  }
}`;
}

type PlaceAccumulator = WikidataPlace & { aliasSet: Set<string>; otherSet: Set<string>; typeSet: Set<string> };

/** Main subjects, genres and narrative locations of the given work item(s). */
export async function fetchWikidataFacets(qids: string[], endpoint = SPARQL_ENDPOINT): Promise<WikidataFacetsOutcome> {
  const clean = [...new Set(qids)].filter((qid) => QID_PATTERN.test(qid));
  if (clean.length === 0) return { ok: true, data: { mainSubjects: [], genres: [], locations: [] } };

  const result = await runQuery(facetsQuery(clean), endpoint);
  if (!result.ok) return result;

  const subjects = new Map<string, WikidataConcept>();
  const genres = new Map<string, WikidataConcept>();
  const places = new Map<string, PlaceAccumulator>();

  for (const row of result.bindings) {
    const qid = qidOf(row.item?.value);
    if (!qid) continue;
    const kind = row.kind?.value;
    if (kind === "subject" || kind === "genre") {
      const target = kind === "subject" ? subjects : genres;
      const existing = target.get(qid);
      if (!existing) target.set(qid, { qid, label: row.itemLabel?.value ?? null });
      else if (!existing.label && row.itemLabel?.value) existing.label = row.itemLabel.value;
      continue;
    }
    if (kind !== "place") continue;
    let place = places.get(qid);
    if (!place) {
      place = {
        qid,
        label: null,
        aliases: [],
        otherNames: [],
        sitelinks: 0,
        isFictional: false,
        isBroad: false,
        types: [],
        aliasSet: new Set(),
        otherSet: new Set(),
        typeSet: new Set(),
      };
      places.set(qid, place);
    }
    const mul = row.itemMul?.value;
    const label = row.itemLabel?.value ?? (mul && LATIN_SCRIPT.test(mul) ? mul : undefined);
    if (label && !place.label) place.label = label;
    if (row.sitelinks?.value) place.sitelinks = Math.max(place.sitelinks, Number(row.sitelinks.value) || 0);
    if (row.fictional?.value === "true") place.isFictional = true;
    if (row.broad?.value === "true") place.isBroad = true;
    if (row.alias?.value) place.aliasSet.add(row.alias.value);
    if (row.otherName?.value) place.otherSet.add(row.otherName.value);
    if (row.typeLabel?.value) place.typeSet.add(row.typeLabel.value);
  }

  return {
    ok: true,
    data: {
      mainSubjects: [...subjects.values()],
      genres: [...genres.values()],
      locations: [...places.values()].map(({ aliasSet, otherSet, typeSet, ...place }) => ({
        ...place,
        aliases: [...aliasSet],
        otherNames: [...otherSet],
        types: [...typeSet],
      })),
    },
  };
}

const MAX_PLACE_NAMES = 20;

/**
 * Which of the given names are the exact title of an English Wikipedia article about a
 * country, continent, empire or federated state. Article titles are unique, so each
 * name identifies at most one item; used only to recognise broad containers.
 */
export async function findBroadPlaceNames(
  names: string[],
  endpoint = SPARQL_ENDPOINT,
): Promise<{ ok: true; names: Set<string> } | { ok: false; error: string }> {
  const wanted = [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(0, MAX_PLACE_NAMES);
  if (wanted.length === 0) return { ok: true, names: new Set() };

  const query = `SELECT ?name WHERE {
  VALUES ?name { ${wanted.map((name) => `${literal(name)}@en`).join(" ")} }
  ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?name .
  FILTER(${isBroadPattern("?item")})
}`;
  const result = await runQuery(query, endpoint);
  if (!result.ok) return result;
  return { ok: true, names: new Set(result.bindings.map((row) => row.name?.value).filter((name): name is string => !!name)) };
}

export type TitleMatch = { qid: string; label: string | null; openLibraryIds: string[] };

/**
 * Works by any of the given authors whose label, in any language, equals the title
 * (case-insensitive). Editions and translations are excluded (Q3331189).
 */
export async function findWikidataWorksByAuthorAndTitle(
  authorQids: string[],
  title: string,
  endpoint = SPARQL_ENDPOINT,
): Promise<{ ok: true; matches: TitleMatch[] } | { ok: false; error: string }> {
  const authors = authorQids.filter((qid) => QID_PATTERN.test(qid));
  const wanted = title.trim().toLowerCase();
  if (authors.length === 0 || !wanted) return { ok: true, matches: [] };

  const query = `SELECT ?work ?workLabel ?olid WHERE {
  VALUES ?author { ${authors.map((qid) => `wd:${qid}`).join(" ")} }
  ?work wdt:P50 ?author ; rdfs:label ?title .
  FILTER(LCASE(STR(?title)) = ${literal(wanted)})
  FILTER NOT EXISTS { ?work wdt:P31 wd:Q3331189 }
  OPTIONAL { ?work wdt:P648 ?olid }
  OPTIONAL { ?work rdfs:label ?workLabel . FILTER(LANG(?workLabel) = "en") }
}`;
  const result = await runQuery(query, endpoint);
  if (!result.ok) return result;

  const matches = new Map<string, TitleMatch>();
  for (const row of result.bindings) {
    const qid = qidOf(row.work?.value);
    if (!qid) continue;
    const match = matches.get(qid) ?? { qid, label: row.workLabel?.value ?? null, openLibraryIds: [] };
    const olid = row.olid?.value;
    if (olid && WORK_ID_PATTERN.test(olid) && !match.openLibraryIds.includes(olid)) match.openLibraryIds.push(olid);
    matches.set(qid, match);
  }
  return { ok: true, matches: [...matches.values()].slice(0, MAX_TITLE_MATCHES) };
}
