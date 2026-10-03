import { openLibraryCoverUrl } from "@/lib/books/covers";
import {
  clampProgress,
  isReadingStatus,
  libraryBookKey,
  type LibraryBook,
} from "./types";

/**
 * The localStorage prototype library. Read-only now: it exists only so readers can
 * import it into their account once. Signed-in libraries live in Supabase.
 */
export const LIBRARY_STORAGE_KEY = "commonplace.library.v1";
const SCHEMA_VERSION = 1;

export function readStoredLibraryRaw(): string | null {
  try {
    return window.localStorage.getItem(LIBRARY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function positiveIntegerOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

/** Rebuilds a trusted LibraryBook from untrusted stored data, or returns null if it is unusable. */
export function sanitizeStoredBook(value: unknown): LibraryBook | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;

  if (raw.provider !== "openlibrary") return null;
  if (typeof raw.providerWorkId !== "string" || !/^OL\d+W$/.test(raw.providerWorkId)) return null;
  if (typeof raw.title !== "string" || !raw.title.trim()) return null;
  if (!isReadingStatus(raw.status)) return null;

  const coverId = positiveIntegerOrNull(raw.coverId);
  const dateAdded =
    typeof raw.dateAdded === "string" && !Number.isNaN(Date.parse(raw.dateAdded))
      ? raw.dateAdded
      : new Date(0).toISOString();

  return {
    provider: "openlibrary",
    providerWorkId: raw.providerWorkId,
    title: raw.title.trim(),
    authors: Array.isArray(raw.authors)
      ? raw.authors.filter((name): name is string => typeof name === "string" && name.trim() !== "")
      : [],
    coverId,
    // Never trust a stored URL: only ever point at the configured cover host.
    coverUrl: coverId ? openLibraryCoverUrl(coverId, "L") : null,
    firstPublishYear: positiveIntegerOrNull(raw.firstPublishYear),
    status: raw.status,
    favorite: raw.favorite === true,
    progress:
      typeof raw.progress === "number" && Number.isFinite(raw.progress)
        ? clampProgress(raw.progress)
        : null,
    dateAdded,
  };
}

/** The raw `books` array of a stored library, or null if the payload isn't a v1 library. */
export function storedLibraryItems(raw: string | null): unknown[] | null {
  if (!raw) return null;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  if (record.version !== SCHEMA_VERSION || !Array.isArray(record.books)) return null;
  return record.books;
}

/** Sanitizes and de-duplicates stored items. Anything malformed is dropped, never thrown. */
export function sanitizeStoredBooks(items: readonly unknown[]): LibraryBook[] {
  const seen = new Set<string>();
  const books: LibraryBook[] = [];
  for (const item of items) {
    const book = sanitizeStoredBook(item);
    if (book && !seen.has(libraryBookKey(book))) {
      seen.add(libraryBookKey(book));
      books.push(book);
    }
  }
  return books;
}

/** Parses stored JSON defensively. Anything malformed yields an empty or partial library, never an error. */
export function parseStoredLibrary(raw: string | null): LibraryBook[] {
  return sanitizeStoredBooks(storedLibraryItems(raw) ?? []);
}
