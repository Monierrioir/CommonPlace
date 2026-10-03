import { BookSpine } from "@/components/books/BookSpine";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TextLink } from "@/components/ui/TextLink";
import type { ShelfBook } from "@/types/book";

type BookshelfPreviewProps = {
  books: ShelfBook[];
  totalBooks: number;
  finishedThisYear: number;
};

/** Hide later spines on narrow shelves so books are never clipped mid-spine. */
function visibilityClass(index: number): string {
  if (index >= 14) return "hidden lg:block";
  if (index >= 11) return "hidden md:block";
  if (index >= 7) return "hidden sm:block";
  return "";
}

export function BookshelfPreview({ books, totalBooks, finishedThisYear }: BookshelfPreviewProps) {
  return (
    <section aria-labelledby="library-heading">
      <SectionHeading
        id="library-heading"
        eyebrow={`${totalBooks} books · ${finishedThisYear} finished this year`}
        title="Your library"
        action={<TextLink href="/library">Visit your library</TextLink>}
      />

      <div className="mt-8 [--shelf-h:9.5rem] [--spine-w:1.6rem] sm:mt-10 sm:[--shelf-h:12rem] sm:[--spine-w:2rem] lg:[--shelf-h:13.5rem] lg:[--spine-w:2.15rem]">
        <div className="shelf-back flex items-end gap-3 overflow-hidden px-4 pt-7 sm:gap-4 sm:px-8">
          <ul aria-label="A few books from your shelves" className="flex h-[var(--shelf-h)] items-end gap-[3px]">
            {books.map((book, index) => (
              <BookSpine key={book.id} book={book} className={visibilityClass(index)} />
            ))}
          </ul>
          <ShelfOrnaments />
        </div>
        <div aria-hidden="true" className="shelf-plank h-3 sm:h-3.5" />
        <div aria-hidden="true" className="shelf-lip h-2 sm:h-2.5" />
      </div>
    </section>
  );
}

function ShelfOrnaments() {
  return (
    <div aria-hidden="true" className="ml-auto flex shrink-0 items-end gap-5">
      <div className="flex flex-col items-center">
        <span className="h-3 w-[3.75rem] translate-x-1 rounded-[1px] bg-dusty sm:w-[5rem]" />
        <span className="h-3.5 w-[4.25rem] rounded-[1px] bg-burgundy sm:w-[5.5rem]" />
        <span className="h-3 w-[4rem] -translate-x-0.5 rounded-[1px] bg-forest sm:w-[5.25rem]" />
      </div>
      <div className="relative hidden h-24 w-14 lg:block">
        <span className="absolute bottom-9 left-1 h-10 w-4 origin-bottom -rotate-[28deg] rounded-[50%] bg-forest" />
        <span className="absolute bottom-10 left-5 h-12 w-4 rounded-[50%] bg-[#4f6a52]" />
        <span className="absolute bottom-9 left-8 h-9 w-4 origin-bottom rotate-[30deg] rounded-[50%] bg-forest" />
        <span className="absolute bottom-0 left-1.5 h-10 w-11 bg-[#a4552f] [clip-path:polygon(0_0,100%_0,86%_100%,14%_100%)]" />
        <span className="absolute bottom-8 left-0.5 h-2 w-12 bg-[#8f4726]" />
      </div>
    </div>
  );
}
