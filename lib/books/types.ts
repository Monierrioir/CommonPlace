export type BookProvider = "openlibrary";

export type BookCoverImage = {
  /** The provider's own cover identifier, kept so cover URLs can be rebuilt later. */
  sourceId: string;
  url: string;
};

/** A work-level book search result, normalized away from any provider's response shape. */
export type BookSearchResult = {
  provider: BookProvider;
  /** Stable work identifier within the provider, e.g. Open Library's "OL893414W". */
  providerId: string;
  title: string;
  authors: string[];
  firstPublishYear: number | null;
  editionCount: number | null;
  cover: BookCoverImage | null;
  providerUrl: string;
};

export type BookSearchOutcome =
  | {
      status: "ok";
      query: string;
      results: BookSearchResult[];
      totalMatches: number;
    }
  | {
      status: "error";
      query: string;
    };
