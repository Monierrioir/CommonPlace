import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BookSearchForm } from "@/components/search/BookSearchForm";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchResultsSkeleton } from "@/components/search/SearchResultsSkeleton";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { normalizeSearchQuery, searchPath } from "@/lib/books/search";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const query = normalizeSearchQuery((await searchParams).q);
  return { title: query ? `Results for “${query}”` : "Search" };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = normalizeSearchQuery(q);

  // Keep shareable URLs canonical: no stray whitespace, no empty `q`.
  if (q !== undefined && (q !== query || !query)) {
    redirect(query ? searchPath(query) : "/search");
  }

  return (
    <Container className="pt-8 sm:pt-12">
      <header className="max-w-2xl">
        <h1 className="font-serif text-[2rem] leading-[1.1] tracking-[-0.015em] text-ink sm:text-[2.5rem]">
          Search the shelves
        </h1>
        <div className="mt-6">
          <BookSearchForm defaultQuery={query} autoFocus={!query} />
        </div>
        {query ? null : (
          <p className="mt-4 text-base text-ink-soft">Find a book by title or author.</p>
        )}
      </header>

      {query ? (
        <section aria-labelledby="search-results-heading" className="mt-12 sm:mt-16">
          <SectionHeading id="search-results-heading" title={`Results for “${query}”`} />
          <div className="mt-6">
            <Suspense key={query} fallback={<SearchResultsSkeleton />}>
              <SearchResults query={query} />
            </Suspense>
          </div>
        </section>
      ) : null}
    </Container>
  );
}
