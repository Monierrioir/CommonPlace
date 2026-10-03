import Link from "next/link";
import { LiveBookcase } from "@/components/bookshelf/LiveBookcase";
import { Icon } from "@/components/ui/Icon";

export function EmptyLibrary() {
  return (
    <div>
      <div className="max-w-md">
        <p className="font-serif text-2xl leading-snug text-ink sm:text-3xl">Your shelves are waiting.</p>
        <p className="mt-2 text-ink-soft">Find your first book and give it a home.</p>
        <Link
          href="/search"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-cream transition-colors hover:bg-ink-soft"
        >
          <Icon name="search" className="size-4" />
          Search for a book
        </Link>
      </div>
      <div className="mt-10">
        <LiveBookcase />
      </div>
    </div>
  );
}
