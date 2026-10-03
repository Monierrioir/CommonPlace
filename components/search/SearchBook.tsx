import { formatAuthors } from "@/lib/books/format";
import type { BookSearchResult } from "@/lib/books/types";
import type { ReadingStatus } from "@/lib/library/types";
import { seededIndex } from "@/lib/seeded";
import { CoverImage } from "@/components/books/CoverImage";
import { AddToLibrary } from "./AddToLibrary";

// Slightly different apparent widths keep a row of results from looking like a uniform grid.
const coverWidths = [100, 93, 87, 96, 90] as const;

type SearchBookProps = {
  book: BookSearchResult;
  preload?: boolean;
  signedIn: boolean;
  savedStatus: ReadingStatus | null;
  returnTo: string;
};

export function SearchBook({ book, preload = false, signedIn, savedStatus, returnTo }: SearchBookProps) {
  const authorLine = formatAuthors(book.authors);
  const coverWidth = coverWidths[seededIndex(book.providerId, coverWidths.length)];
  const details = [
    book.firstPublishYear ? String(book.firstPublishYear) : null,
    book.editionCount && book.editionCount > 1 ? `${book.editionCount} editions` : null,
  ].filter(Boolean);

  return (
    <article className="group flex h-full flex-col">
      <div className="@container flex aspect-[2/3] items-end justify-center px-3 sm:px-4">
        <div
          className="relative transition-transform duration-500 ease-gentle motion-safe:group-hover:-translate-y-1.5"
          style={{ width: `${coverWidth}%` }}
        >
          <CoverImage
            src={book.cover?.url ?? null}
            title={book.title}
            author={authorLine}
            seed={book.providerId}
            sizes="(min-width: 1024px) 200px, (min-width: 768px) 22vw, (min-width: 640px) 30vw, 45vw"
            preload={preload}
          />
        </div>
      </div>
      <div aria-hidden="true" className="shelf-plank h-2" />
      <div aria-hidden="true" className="shelf-lip h-1" />

      <div className="flex flex-1 flex-col px-3 pt-4 sm:px-4">
        <h3 className="line-clamp-2 font-serif text-base leading-snug text-ink sm:text-lg">
          {book.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
          {authorLine ?? <span className="text-ink-muted italic">Author unknown</span>}
        </p>
        {details.length > 0 ? (
          <p className="mt-1.5 text-xs text-ink-muted tabular-nums">{details.join(" · ")}</p>
        ) : null}
        <AddToLibrary book={book} signedIn={signedIn} savedStatus={savedStatus} returnTo={returnTo} />
        <a
          href={book.providerUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open Library details for ${book.title} (opens in a new tab)`}
          className="inline-flex min-h-9 items-center self-start text-[0.7rem] text-ink-muted/80 underline decoration-line/70 underline-offset-4 transition-colors hover:text-burgundy hover:decoration-burgundy/40"
        >
          Open Library
        </a>
      </div>
    </article>
  );
}
