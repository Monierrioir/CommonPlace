import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LiveBookcase } from "@/components/bookshelf/LiveBookcase";
import { LegacyImportNotice } from "@/components/library/LegacyImportNotice";
import { LibraryView } from "@/components/library/LibraryView";
import { CustomizeShelfButton, ShelfCustomizer, ShelfWorkspace } from "@/components/shelf/ShelfCustomizer";
import { Container } from "@/components/ui/Container";
import { requireUser } from "@/lib/auth/session";
import { getCurrentUserLibrary } from "@/lib/library/queries";
import { getCurrentShelfPreferences } from "@/lib/shelf/queries";

export const metadata: Metadata = {
  title: "Your Library",
};

export default async function LibraryPage() {
  await requireUser("/library");
  const shelf = await getCurrentShelfPreferences();

  return (
    <Container className="pt-8 sm:pt-12">
      <ShelfCustomizer preferences={shelf.preferences} source={shelf.source}>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div>
            <h1 className="font-serif text-[2rem] leading-[1.1] tracking-[-0.015em] text-ink sm:text-[2.75rem]">
              Your Library
            </h1>
            <p className="mt-2 font-serif text-lg text-ink-muted italic">A shelf that grows with you.</p>
          </div>
          <CustomizeShelfButton />
        </header>

        <div className="mt-8 sm:mt-10">
          <LegacyImportNotice />
          <ShelfWorkspace>
            <Suspense fallback={<ShelvesLoading />}>
              <LibraryShelves />
            </Suspense>
          </ShelfWorkspace>
        </div>
      </ShelfCustomizer>
    </Container>
  );
}

async function LibraryShelves() {
  const library = await getCurrentUserLibrary();

  if (library.status !== "ok") {
    return (
      <div role="alert">
        <p className="font-serif text-2xl leading-snug text-ink">We couldn’t open your shelves just now.</p>
        <p className="mt-2 text-ink-soft">Your books are safe. Please try again in a moment.</p>
        <Link
          href="/library"
          className="mt-5 inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-medium text-ink transition-colors hover:border-ink-muted/50"
        >
          Try again
        </Link>
      </div>
    );
  }

  return <LibraryView entries={library.entries} />;
}

function ShelvesLoading() {
  return (
    <div aria-busy="true">
      <p className="flex min-h-11 items-center border-b border-line/80 text-sm text-ink-muted">
        Opening your shelves…
      </p>
      <div className="mt-8">
        <LiveBookcase />
      </div>
    </div>
  );
}
