import { searchBooks, searchPath } from "@/lib/books/search";
import { getSavedStatuses } from "@/lib/library/queries";
import { resultsGridClassName } from "./results-grid";
import { SearchBook } from "./SearchBook";
import { SearchMessage } from "./SearchMessage";

type SearchResultsProps = {
  query: string;
};

export async function SearchResults({ query }: SearchResultsProps) {
  const outcome = await searchBooks(query);

  if (outcome.status === "error") {
    return (
      <SearchMessage tone="error" title="We couldn’t reach the shelves just now.">
        <p>
          Please try again in a moment.{" "}
          <a
            href={searchPath(query)}
            className="font-medium text-ink underline decoration-line underline-offset-4 hover:text-burgundy"
          >
            Try again
          </a>
        </p>
      </SearchMessage>
    );
  }

  if (outcome.results.length === 0) {
    return (
      <SearchMessage title={`Nothing on the shelves for “${query}”.`}>
        <p>Try a different spelling, a shorter title, or just the author’s surname.</p>
      </SearchMessage>
    );
  }

  // Null when signed out: adding a book then leads to login and back here.
  const saved = await getSavedStatuses(outcome.results.map((book) => book.providerId));
  const returnTo = searchPath(query);

  return (
    <>
      <p className="text-sm text-ink-muted">
        {outcome.results.length} {outcome.results.length === 1 ? "book" : "books"} found
      </p>
      <ul className={`mt-8 ${resultsGridClassName}`}>
        {outcome.results.map((book, index) => (
          <li key={`${book.provider}:${book.providerId}`}>
            <SearchBook
              book={book}
              preload={index < 2}
              signedIn={saved !== null}
              savedStatus={saved?.get(book.providerId)?.status ?? null}
              returnTo={returnTo}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
