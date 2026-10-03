import Form from "next/form";
import { Icon } from "@/components/ui/Icon";
import { MAX_QUERY_LENGTH } from "@/lib/books/search";

type BookSearchFormProps = {
  defaultQuery?: string;
  autoFocus?: boolean;
};

export function BookSearchForm({ defaultQuery = "", autoFocus = false }: BookSearchFormProps) {
  return (
    <Form action="/search" role="search" aria-label="Search books" className="flex gap-2 sm:gap-3">
      <div className="relative min-w-0 flex-1">
        <label htmlFor="book-search-query" className="sr-only">
          Search by title or author
        </label>
        <Icon
          name="search"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
        />
        <input
          key={defaultQuery}
          id="book-search-query"
          name="q"
          type="search"
          defaultValue={defaultQuery}
          placeholder="Title or author"
          required
          pattern=".*\S.*"
          title="Enter a title or author"
          maxLength={MAX_QUERY_LENGTH}
          autoComplete="off"
          enterKeyHint="search"
          autoFocus={autoFocus}
          className="h-12 w-full rounded-sm border border-line bg-cream pr-4 pl-12 text-base text-ink shadow-[inset_0_1px_2px_rgb(42_29_21/0.06)] transition-colors placeholder:text-ink-muted/80 hover:border-ink/25 focus:border-ink/40 sm:h-14 sm:text-lg"
        />
      </div>
      <button
        type="submit"
        className="h-12 shrink-0 rounded-sm bg-ink px-5 text-sm font-medium text-cream transition-[background-color,transform] duration-200 hover:bg-ink-soft active:translate-y-px sm:h-14 sm:px-7 sm:text-base"
      >
        Search
      </button>
    </Form>
  );
}
