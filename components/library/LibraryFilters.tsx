import { Icon } from "@/components/ui/Icon";
import type { LibraryBook, ReadingStatus } from "@/lib/library/types";

export type LibraryFilter = "all" | ReadingStatus | "favorites";

export const libraryFilters: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "currently-reading", label: "Reading" },
  { id: "want-to-read", label: "Want to Read" },
  { id: "finished", label: "Finished" },
  { id: "dnf", label: "DNF" },
  { id: "favorites", label: "Favorites" },
];

export function matchesFilter(book: LibraryBook, filter: LibraryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "favorites") return book.favorite;
  return book.status === filter;
}

type LibraryFiltersProps = {
  books: LibraryBook[];
  active: LibraryFilter;
  onChange: (filter: LibraryFilter) => void;
};

/** A quiet, index-like row of shelf filters. The active one is marked by weight and an underline. */
export function LibraryFilters({ books, active, onChange }: LibraryFiltersProps) {
  return (
    <div role="group" aria-label="Filter your library" className="border-b border-line/80">
      <ul className="-mx-2 flex flex-wrap items-center">
        {libraryFilters.map((item) => {
          const count = books.filter((book) => matchesFilter(book, item.id)).length;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={active === item.id}
                onClick={() => onChange(item.id)}
                className="relative flex min-h-11 items-center gap-1.5 px-2 text-sm text-ink-muted transition-colors after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-transparent after:transition-colors hover:text-ink aria-pressed:font-medium aria-pressed:text-ink aria-pressed:after:bg-burgundy sm:px-3 sm:after:inset-x-3"
              >
                {item.id === "favorites" ? (
                  <Icon name="heart" className="size-3.5 fill-current text-burgundy/80" />
                ) : null}
                {item.label}
                <span className="text-xs font-normal text-ink-muted/80 tabular-nums">
                  {count}
                  <span className="sr-only"> {count === 1 ? "book" : "books"}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
