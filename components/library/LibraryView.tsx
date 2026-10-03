"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { LiveBookcase } from "@/components/bookshelf/LiveBookcase";
import { prefetchBookCast } from "@/components/reflections/book-cast";
import { FinishedExperience } from "@/components/reflections/FinishedExperience";
import {
  removeLibraryEntryAction,
  updateLibraryEntryAction,
  type LibraryActionResult,
} from "@/lib/library/actions";
import {
  progressForStatus,
  readingStatusLabels,
  type LibraryEntry,
  type LibraryEntryChange,
  type ReadingStatus,
} from "@/lib/library/types";
import { saveReflectionAction } from "@/lib/reflections/actions";
import { isEmptyReflection, type BookReflection, type BookReflectionInput } from "@/lib/reflections/types";
import { EmptyLibrary } from "./EmptyLibrary";
import { LibraryBookPanel } from "./LibraryBookPanel";
import { LibraryFilters, libraryFilters, matchesFilter, type LibraryFilter } from "./LibraryFilters";
import { ShelfBook } from "./ShelfBook";

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "book" : "books"}`;
}

type OptimisticChange =
  | { type: "update"; entryId: string; change: LibraryEntryChange }
  | { type: "reflect"; entryId: string; reflection: BookReflection | null }
  | { type: "remove"; entryId: string };

function applyChange(entries: LibraryEntry[], action: OptimisticChange): LibraryEntry[] {
  if (action.type === "remove") return entries.filter((entry) => entry.entryId !== action.entryId);
  return entries.map((entry) => {
    if (entry.entryId !== action.entryId) return entry;
    if (action.type === "reflect") return { ...entry, reflection: action.reflection };
    const { status, favorite, progress } = action.change;
    return {
      ...entry,
      ...(favorite !== undefined && { favorite }),
      ...(progress !== undefined && { progress }),
      ...(status !== undefined && { status, progress: progressForStatus(status, entry.progress) }),
    };
  });
}

type Reflecting = {
  entryId: string;
  /** Opened by finishing the book, rather than from "Add/Edit reflection". */
  celebrate: boolean;
};

type LibraryViewProps = {
  entries: LibraryEntry[];
};

export function LibraryView({ entries }: LibraryViewProps) {
  const [books, applyOptimistic] = useOptimistic(entries, applyChange);
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reflecting, setReflecting] = useState<Reflecting | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const requestedStatus = useRef(new Map<string, ReadingStatus>());

  function select(entryId: string | null) {
    selectedIdRef.current = entryId;
    setSelectedId(entryId);
  }

  function mutate(change: OptimisticChange, run: () => Promise<LibraryActionResult>, onSaved?: () => void) {
    startTransition(async () => {
      applyOptimistic(change);
      const result = await run();
      if (result.ok) {
        setSaveError(null);
        onSaved?.();
      } else {
        setSaveError(result.message);
      }
    });
  }

  function updateEntry(entry: LibraryEntry, change: LibraryEntryChange) {
    const finishing = change.status === "finished" && entry.status !== "finished";
    if (change.status) requestedStatus.current.set(entry.entryId, change.status);
    if (finishing) prefetchBookCast(entry.entryId);

    mutate({ type: "update", entryId: entry.entryId, change }, () =>
      updateLibraryEntryAction(entry.entryId, change),
    () => {
      if (change.status) setAnnouncement(`${entry.title} moved to ${readingStatusLabels[change.status]}.`);
      // The status is already saved; the reflection that follows is optional.
      if (
        finishing &&
        selectedIdRef.current === entry.entryId &&
        requestedStatus.current.get(entry.entryId) === "finished"
      ) {
        setReflecting({ entryId: entry.entryId, celebrate: true });
      }
    });
  }

  function removeEntry(entry: LibraryEntry) {
    select(null);
    summaryRef.current?.focus();
    mutate({ type: "remove", entryId: entry.entryId }, () => removeLibraryEntryAction(entry.entryId), () =>
      setAnnouncement(`${entry.title} removed from your library.`),
    );
  }

  /** Runs inside the experience's transition, so the optimistic reflection shows at once. */
  async function saveReflection(entry: LibraryEntry, input: BookReflectionInput): Promise<LibraryActionResult> {
    const now = new Date().toISOString();
    applyOptimistic({
      type: "reflect",
      entryId: entry.entryId,
      reflection: isEmptyReflection(input)
        ? null
        : { ...input, createdAt: entry.reflection?.createdAt ?? now, updatedAt: now },
    });
    const result = await saveReflectionAction(entry.entryId, input);
    if (result.ok) {
      setReflecting(null);
      setAnnouncement(
        isEmptyReflection(input) ? `Reflection on ${entry.title} cleared.` : `Reflection on ${entry.title} saved.`,
      );
    }
    return result;
  }

  const errorNotice = saveError ? (
    <p role="alert" className="mb-5 border-l-2 border-burgundy bg-burgundy/[0.06] px-3.5 py-2.5 text-sm text-burgundy">
      {saveError}
    </p>
  ) : null;

  if (books.length === 0) {
    return (
      <>
        {errorNotice}
        <EmptyLibrary />
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </>
    );
  }

  const visibleBooks = books.filter((book) => matchesFilter(book, filter));
  const selectedBook = books.find((book) => book.entryId === selectedId) ?? null;
  const reflectingBook = reflecting ? (books.find((book) => book.entryId === reflecting.entryId) ?? null) : null;
  const activeLabel = libraryFilters.find((item) => item.id === filter)?.label ?? "All";

  return (
    <div>
      <LibraryFilters books={books} active={filter} onChange={setFilter} />

      <p ref={summaryRef} tabIndex={-1} className="sr-only">
        {filter === "all"
          ? `${countLabel(books.length)} on your shelves`
          : `${activeLabel}: ${countLabel(visibleBooks.length)}`}
      </p>

      <div className="mt-8">
        {selectedBook ? null : errorNotice}
        {visibleBooks.length === 0 ? (
          <p className="mb-5 font-serif text-lg text-ink-soft italic">Nothing on this shelf yet.</p>
        ) : null}
        <LiveBookcase label={filter === "all" ? "Your books" : `Your books: ${activeLabel}`}>
          {visibleBooks.map((book) => (
            <ShelfBook
              key={book.entryId}
              book={book}
              onOpen={() => {
                select(book.entryId);
                if (book.status === "finished" || book.reflection) prefetchBookCast(book.entryId);
              }}
            />
          ))}
        </LiveBookcase>
      </div>

      {selectedBook && !reflectingBook ? (
        <LibraryBookPanel
          key={selectedBook.entryId}
          book={selectedBook}
          saveError={saveError}
          onChange={(change) => updateEntry(selectedBook, change)}
          onRemove={() => removeEntry(selectedBook)}
          onReflect={() => setReflecting({ entryId: selectedBook.entryId, celebrate: false })}
          onClose={() => select(null)}
        />
      ) : null}

      {reflectingBook ? (
        <FinishedExperience
          key={reflectingBook.entryId}
          book={reflectingBook}
          celebrate={reflecting?.celebrate ?? false}
          onSave={(input) => saveReflection(reflectingBook, input)}
          onClose={() => setReflecting(null)}
        />
      ) : null}

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
