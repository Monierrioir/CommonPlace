import { BookshelfPreview } from "@/components/home/BookshelfPreview";
import { ClubsPreview } from "@/components/home/ClubsPreview";
import { CurrentlyReading } from "@/components/home/CurrentlyReading";
import { Greeting } from "@/components/home/Greeting";
import { InsightCard } from "@/components/home/InsightCard";
import { Container } from "@/components/ui/Container";
import { getCurrentUserLibrary } from "@/lib/library/queries";
import {
  demoCurrentReads,
  mockClubs,
  mockInsight,
  mockLibraryStats,
  mockReader,
  mockShelfBooks,
} from "@/lib/mock-data";

export default async function HomePage() {
  const library = await getCurrentUserLibrary();

  return (
    <Container className="flex flex-col gap-14 pt-8 sm:gap-20 sm:pt-12">
      <Greeting name={mockReader.firstName} />
      {library.status === "signed-out" ? (
        <CurrentlyReading mode="demo" demoBooks={demoCurrentReads} />
      ) : library.status === "error" ? (
        <CurrentlyReading mode="unavailable" />
      ) : (
        <CurrentlyReading
          mode="reader"
          books={library.entries.filter((entry) => entry.status === "currently-reading")}
        />
      )}
      <BookshelfPreview
        books={mockShelfBooks}
        totalBooks={mockLibraryStats.totalBooks}
        finishedThisYear={mockLibraryStats.finishedThisYear}
      />
      <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-12">
        <ClubsPreview clubs={mockClubs} className="lg:col-span-7" />
        <InsightCard
          message={mockInsight.message}
          basis={mockInsight.basis}
          className="lg:col-span-5"
        />
      </div>
    </Container>
  );
}
