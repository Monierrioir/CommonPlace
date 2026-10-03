import type { ShelfBook } from "@/types/book";

type BookSpineProps = {
  book: ShelfBook;
  className?: string;
};

/** Expects `--shelf-h` and `--spine-w` to be set by the parent shelf. */
export function BookSpine({ book, className = "" }: BookSpineProps) {
  return (
    <li
      title={`${book.title} — ${book.author}`}
      className={`relative shrink-0 transition-transform duration-300 ease-gentle motion-safe:hover:-translate-y-2 ${className}`}
      style={{
        height: `calc(var(--shelf-h) * ${book.height})`,
        width: `calc(var(--spine-w) * ${book.thickness})`,
      }}
    >
      <div
        className="spine-shade relative flex h-full w-full items-center justify-center overflow-hidden rounded-t-[2px]"
        style={{ backgroundColor: book.color, color: book.ink }}
      >
        <SpineDecoration style={book.spine} />
        <span className="max-h-[80%] max-w-full overflow-hidden text-center font-serif text-[0.625rem] leading-[1.15] tracking-[0.1em] uppercase [text-wrap:balance] [writing-mode:vertical-rl] sm:text-[0.6875rem]">
          {book.title}
          <span className="sr-only"> by {book.author}</span>
        </span>
      </div>
    </li>
  );
}

function SpineDecoration({ style }: { style: ShelfBook["spine"] }) {
  switch (style) {
    case "bands":
      return (
        <>
          <span aria-hidden="true" className="absolute inset-x-0 top-[7%] h-[5px] border-y border-current opacity-50" />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-[7%] h-[5px] border-y border-current opacity-50" />
        </>
      );
    case "foil":
      return <span aria-hidden="true" className="absolute inset-x-0 top-[5%] h-px bg-current opacity-70" />;
    case "label":
      return (
        <span
          aria-hidden="true"
          className="absolute inset-x-[18%] bottom-[6%] h-[9%] border border-current/30 bg-cream/60"
        />
      );
    case "plain":
      return null;
  }
}
