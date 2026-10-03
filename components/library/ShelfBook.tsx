import type { CSSProperties } from "react";
import { shelfSlotClassName } from "@/components/bookshelf/shelf-slot";
import { StandingBook } from "@/components/bookshelf/StandingBook";
import { Icon } from "@/components/ui/Icon";
import { formatAuthors } from "@/lib/books/format";
import { bookVariation } from "@/lib/bookshelf/book-variation";
import { readingStatusLabels, type LibraryBook } from "@/lib/library/types";

type ShelfBookProps = {
  book: LibraryBook;
  onOpen: () => void;
};

function describeBook(book: LibraryBook, author: string | null): string {
  const parts = [author ? `${book.title} by ${author}` : book.title, readingStatusLabels[book.status]];
  if (book.status === "currently-reading" && book.progress !== null) parts.push(`${book.progress}% read`);
  if (book.favorite) parts.push("Favorite");
  return parts.join(", ");
}

export function ShelfBook({ book, onOpen }: ShelfBookProps) {
  const variation = bookVariation(book.providerWorkId);
  const author = formatAuthors(book.authors);

  const style = {
    marginLeft: `${variation.gapBefore}px`,
    "--h": `calc(var(--book-h) * ${variation.heightFactor})`,
    "--depth": `${variation.thickness}px`,
    "--lean": `${variation.lean}deg`,
  } as CSSProperties;

  // A leaning book pivots on the bottom corner it leans towards, so that corner stays on the board.
  const pivot = variation.lean > 0 ? "origin-bottom-right" : "origin-bottom-left";

  return (
    <li className={shelfSlotClassName} style={style}>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={describeBook(book, author)}
        className="group relative isolate block rounded-[3px] focus-visible:outline-offset-4"
      >
        <span
          className={`relative block ${pivot} rotate-[var(--lean)] transition-[translate,rotate] duration-500 ease-gentle group-hover:rotate-0 group-focus-visible:rotate-0 motion-safe:group-hover:-translate-y-1.5 motion-safe:group-focus-visible:-translate-y-1.5`}
        >
          <StandingBook
            src={book.coverUrl}
            title={book.title}
            author={author}
            seed={book.providerWorkId}
          />
          {book.status === "currently-reading" ? (
            <span
              aria-hidden="true"
              className="absolute -top-2.5 right-[30%] h-6 w-[7px] bg-burgundy shadow-[1px_1px_2px_rgb(42_29_21/0.3)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_80%,0_100%)] sm:-top-3 sm:h-7 sm:w-2"
            />
          ) : null}
          {book.favorite ? (
            <span
              aria-hidden="true"
              className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full bg-cream text-burgundy shadow-[0_1px_3px_rgb(42_29_21/0.4)]"
            >
              <Icon name="heart" className="size-3 fill-current" />
            </span>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          className="absolute -inset-x-[3px] -bottom-[2px] -z-10 h-[7px] rounded-[50%] bg-[radial-gradient(closest-side,rgb(30_18_8/0.6),transparent)] transition-[opacity,scale] duration-500 ease-gentle group-hover:scale-x-90 group-hover:opacity-50"
        />
      </button>
    </li>
  );
}
