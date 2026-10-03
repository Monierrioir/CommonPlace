import type { BookProvider } from "@/lib/books/types";
import type { BookReflection } from "@/lib/reflections/types";

export const READING_STATUSES = ["want-to-read", "currently-reading", "finished", "dnf"] as const;

export type ReadingStatus = (typeof READING_STATUSES)[number];

export const readingStatusLabels: Record<ReadingStatus, string> = {
  "want-to-read": "Want to read",
  "currently-reading": "Currently reading",
  finished: "Finished",
  dnf: "DNF",
};

/**
 * A book in the reader's personal collection. Holds collection data only —
 * shelf appearance is derived separately so future bookshelf themes never touch this record.
 */
export type LibraryBook = {
  provider: BookProvider;
  providerWorkId: string;
  title: string;
  authors: string[];
  coverId: number | null;
  coverUrl: string | null;
  firstPublishYear: number | null;
  status: ReadingStatus;
  favorite: boolean;
  /** Whole-number percentage, 0–100, or null when not tracked. */
  progress: number | null;
  /** ISO 8601 timestamp. */
  dateAdded: string;
};

/** A book on the signed-in reader's Supabase shelves. `entryId` is the user_library row id. */
export type LibraryEntry = LibraryBook & {
  entryId: string;
  /** The reader's private reflection, kept through later status changes. */
  reflection: BookReflection | null;
};

/** Normalized catalog metadata sent when adding a book. Validated again on the server. */
export type LibraryBookInput = {
  providerWorkId: string;
  title: string;
  authors: string[];
  coverId: number | null;
  firstPublishYear: number | null;
};

export type LibraryEntryChange = {
  status?: ReadingStatus;
  favorite?: boolean;
  progress?: number;
};

/** Legacy localStorage schema, kept only so prototype libraries can be imported. */
export type StoredLibrary = {
  version: 1;
  books: LibraryBook[];
};

export function libraryBookKey(book: { provider: BookProvider; providerWorkId: string }): string {
  return `${book.provider}:${book.providerWorkId}`;
}

export function isReadingStatus(value: unknown): value is ReadingStatus {
  return typeof value === "string" && (READING_STATUSES as readonly string[]).includes(value);
}

export function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Starting a book opens it at 0%, finishing fills it; other moves keep whatever progress was tracked. */
export function progressForStatus(status: ReadingStatus, current: number | null): number | null {
  if (status === "currently-reading") return current ?? 0;
  if (status === "finished") return 100;
  return current;
}
