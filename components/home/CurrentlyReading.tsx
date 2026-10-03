import Link from "next/link";
import { BookCover } from "@/components/books/BookCover";
import { CoverImage } from "@/components/books/CoverImage";
import { ReadingBook } from "@/components/books/ReadingBook";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatAuthors } from "@/lib/books/format";
import type { LibraryEntry } from "@/lib/library/types";
import type { CurrentRead } from "@/types/book";

const countWords = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

function describeOpenBooks(count: number): string {
  const word = countWords[count] ?? String(count);
  return `${word} ${count === 1 ? "book" : "books"} open`;
}

const listClassName = "mt-8 grid gap-7 sm:mt-10 sm:grid-cols-3 sm:gap-8 lg:gap-12";
const inlineLinkClassName =
  "text-ink-soft underline decoration-line underline-offset-4 hover:text-burgundy hover:decoration-burgundy/40";

type CurrentlyReadingProps =
  /** Signed-out visitors see a few sample books. */
  | { mode: "demo"; demoBooks: CurrentRead[] }
  /** Every book the signed-in reader has marked as currently reading. */
  | { mode: "reader"; books: LibraryEntry[] }
  | { mode: "unavailable" };

export function CurrentlyReading(props: CurrentlyReadingProps) {
  let action: string | null = null;
  if (props.mode === "demo") action = describeOpenBooks(props.demoBooks.length);
  else if (props.mode === "reader" && props.books.length > 0) action = describeOpenBooks(props.books.length);

  return (
    <section aria-labelledby="currently-reading-heading">
      <SectionHeading
        id="currently-reading-heading"
        eyebrow="On your nightstand"
        title="Currently reading"
        action={action ? <p className="font-serif text-base text-ink-muted italic">{action}</p> : null}
      />

      {props.mode === "demo" ? (
        <DemoCurrentlyReading books={props.demoBooks} />
      ) : props.mode === "unavailable" ? (
        <p className="mt-6 text-base text-ink-soft">
          We couldn’t reach your nightstand just now.{" "}
          <Link href="/library" className={inlineLinkClassName}>
            Visit your library
          </Link>
        </p>
      ) : props.books.length === 0 ? (
        <EmptyNightstand />
      ) : (
        <ul className={listClassName}>
          {props.books.map((book) => {
            const author = formatAuthors(book.authors);
            return (
              <li key={book.entryId}>
                <ReadingBook
                  title={book.title}
                  author={author}
                  progress={book.progress ?? 0}
                  progressColor="var(--color-burgundy)"
                  cover={
                    <CoverImage
                      src={book.coverUrl}
                      title={book.title}
                      author={author}
                      seed={book.providerWorkId}
                      sizes="(min-width: 640px) 216px, 88px"
                    />
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EmptyNightstand() {
  return (
    <div className="mt-6 max-w-md">
      <p className="font-serif text-xl leading-snug text-ink-soft italic">Nothing open on your nightstand yet.</p>
      <p className="mt-2 text-sm text-ink-muted">
        Mark a book as currently reading from{" "}
        <Link href="/library" className={inlineLinkClassName}>
          your library
        </Link>
        , or find a new one.
      </p>
      <Link
        href="/search"
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-muted/50"
      >
        <Icon name="search" className="size-4" />
        Find a book
      </Link>
    </div>
  );
}

/** Placeholder nightstand for signed-out visitors. */
function DemoCurrentlyReading({ books }: { books: CurrentRead[] }) {
  return (
    <>
      <ul className={listClassName}>
        {books.map((book) => (
          <li key={book.id}>
            <ReadingBook
              title={book.title}
              author={book.author}
              progress={book.progress}
              progressColor={book.cover.ribbon}
              cover={<BookCover title={book.title} author={book.author} design={book.cover} />}
            />
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-ink-muted">
        A few sample books keep your nightstand warm.{" "}
        <Link href="/login" className={inlineLinkClassName}>
          Log in to see your own
        </Link>
      </p>
    </>
  );
}
