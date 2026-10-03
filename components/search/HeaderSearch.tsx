import Form from "next/form";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MAX_QUERY_LENGTH } from "@/lib/books/search";

/** Inline search field on wide screens; a quiet link to the search page on smaller ones. */
export function HeaderSearch() {
  return (
    <>
      <Link
        href="/search"
        aria-label="Search books"
        className="inline-flex size-11 items-center justify-center rounded-sm text-ink-soft transition-[color,background-color,transform] duration-200 hover:bg-cream hover:text-ink active:translate-y-px lg:hidden"
      >
        <Icon name="search" className="size-5" />
      </Link>

      <Form action="/search" role="search" aria-label="Search books" className="relative hidden lg:block">
        <label htmlFor="header-search-query" className="sr-only">
          Search books and authors
        </label>
        <input
          id="header-search-query"
          name="q"
          type="search"
          placeholder="Search books, authors…"
          required
          pattern=".*\S.*"
          title="Enter a title or author"
          maxLength={MAX_QUERY_LENGTH}
          autoComplete="off"
          enterKeyHint="search"
          className="h-10 w-60 rounded-sm border border-line bg-cream/70 pr-3 pl-9 text-sm text-ink transition-colors placeholder:text-ink-muted hover:border-ink/25 focus:border-ink/40 focus:bg-cream"
        />
        <button
          type="submit"
          aria-label="Submit search"
          className="absolute inset-y-0 left-0 flex w-9 items-center justify-center text-ink-muted transition-colors hover:text-ink"
        >
          <Icon name="search" className="size-4" />
        </button>
      </Form>
    </>
  );
}
