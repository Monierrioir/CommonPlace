import "server-only";
import { charactersFromSources, enrichCharacters, type CharacterEnrichment } from "./characters";
import { WORK_ID_PATTERN } from "./open-library";
import { derivePlaces, placeNamesToClassify, type PlaceEnrichment, type PlaceInput } from "./places";
import { deriveThemes, type ThemeEnrichment, type ThemeInput } from "./themes";
import { fetchWikidataFacets, findBroadPlaceNames, type WikidataFacetsOutcome } from "./wikidata";
import { gatherWorkSources, type EnrichmentOptions } from "./work";

/**
 * Read-only enrichment of one work across every dimension. The work and its Wikidata
 * item are identified once; characters, themes and places are then derived
 * independently, so one dimension failing or coming up sparse never affects another.
 */
export type BookEnrichment = {
  characters: CharacterEnrichment;
  themes: ThemeEnrichment;
  places: PlaceEnrichment;
};

export async function enrichBook(storedWorkId: string, options: EnrichmentOptions = {}): Promise<BookEnrichment> {
  if (!WORK_ID_PATTERN.test(storedWorkId)) {
    const invalid = { ok: false as const, error: "invalid work id" };
    return {
      characters: await enrichCharacters(storedWorkId),
      themes: deriveThemes({ openLibrary: invalid, wikidata: invalid, wikidataMatch: null }),
      places: derivePlaces({ openLibrary: invalid, wikidata: invalid, wikidataMatch: null, broadNames: null }),
    };
  }

  const sources = await gatherWorkSources(storedWorkId, options);
  const characters = charactersFromSources(sources);
  const { resolution, wikidata, wikidataMatch, endpoints } = sources;

  const qids = wikidata.ok ? wikidata.data.works.map((work) => work.qid) : [];
  const facets: WikidataFacetsOutcome = !wikidata.ok
    ? { ok: false, error: wikidata.error }
    : await fetchWikidataFacets(qids, endpoints.wikidata);
  const hasItem = qids.length > 0;

  const work = resolution.ok ? resolution.work : null;
  const openLibraryFailure = { ok: false as const, error: resolution.ok ? "" : resolution.error };
  const themeInput: ThemeInput = {
    openLibrary: work ? { ok: true, subjects: work.subjects, placeNames: work.subjectPlaces } : openLibraryFailure,
    wikidata: facets.ok
      ? { ok: true, hasItem, mainSubjects: facets.data.mainSubjects, genres: facets.data.genres }
      : { ok: false, error: facets.error },
    wikidataMatch,
  };

  const placeInput: Omit<PlaceInput, "broadNames"> = {
    openLibrary: work ? { ok: true, subjectPlaces: work.subjectPlaces, subjects: work.subjects } : openLibraryFailure,
    wikidata: facets.ok ? { ok: true, hasItem, locations: facets.data.locations } : { ok: false, error: facets.error },
    wikidataMatch,
  };
  const unexplained = placeNamesToClassify(placeInput);
  const broadNames = unexplained.length > 0 ? await findBroadPlaceNames(unexplained, endpoints.wikidata) : null;

  return {
    characters,
    themes: deriveThemes(themeInput),
    places: derivePlaces({ ...placeInput, broadNames }),
  };
}
