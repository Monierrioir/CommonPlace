import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { openLibraryCoverUrl } from "@/lib/books/covers";
import { REFLECTION_COLUMNS, toBookReflection, type ReflectionRow } from "@/lib/reflections/rows";
import {
  isReadingStatus,
  progressForStatus,
  type LibraryBook,
  type LibraryBookInput,
  type LibraryEntry,
  type LibraryEntryChange,
  type ReadingStatus,
} from "./types";

/**
 * Supabase access for personal libraries. Every function takes the request's
 * server client plus the user id from verified claims; RLS remains the final
 * authority, the explicit `user_id` filters are defence in depth.
 */

const PROVIDER = "openlibrary";

export class LibraryDataError extends Error {
  constructor(operation: string, cause?: PostgrestError | null) {
    super(`[library] ${operation} failed${cause?.code ? ` (${cause.code})` : ""}`);
    this.name = "LibraryDataError";
  }
}

type BookRow = {
  id: string;
  provider: string;
  provider_work_id: string;
  title: string;
  authors: unknown;
  cover_id: string | null;
  first_publish_year: number | null;
};

type EntryRow = {
  id: string;
  status: string;
  favorite: boolean;
  progress: number | null;
  date_added: string;
  book: BookRow | null;
  /** One-to-one through (user_id, book_id); tolerate an array in case the embed is read as to-many. */
  reflection: ReflectionRow | ReflectionRow[] | null;
};

const ENTRY_COLUMNS = `id, status, favorite, progress, date_added, book:books!inner(id, provider, provider_work_id, title, authors, cover_id, first_publish_year), reflection:book_reflections(${REFLECTION_COLUMNS})`;

function coverIdFromRow(value: string | null): number | null {
  if (!value || !/^\d{1,12}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

function toLibraryEntry(row: EntryRow): LibraryEntry | null {
  const book = row.book;
  if (!book || book.provider !== PROVIDER || !isReadingStatus(row.status)) return null;

  const coverId = coverIdFromRow(book.cover_id);
  const authors = Array.isArray(book.authors)
    ? book.authors.filter((name): name is string => typeof name === "string")
    : [];

  const libraryBook: LibraryBook = {
    provider: PROVIDER,
    providerWorkId: book.provider_work_id,
    title: book.title,
    authors,
    coverId,
    coverUrl: coverId ? openLibraryCoverUrl(coverId, "L") : null,
    firstPublishYear: book.first_publish_year,
    status: row.status,
    favorite: row.favorite,
    progress: row.progress,
    dateAdded: row.date_added,
  };
  const reflection = Array.isArray(row.reflection) ? (row.reflection[0] ?? null) : row.reflection;
  return { ...libraryBook, entryId: row.id, reflection: reflection ? toBookReflection(reflection) : null };
}

export async function listLibraryEntries(supabase: SupabaseClient, userId: string): Promise<LibraryEntry[]> {
  const { data, error } = await supabase
    .from("user_library")
    .select(ENTRY_COLUMNS)
    .eq("user_id", userId)
    .order("date_added", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<EntryRow[], { merge: false }>();

  if (error) throw new LibraryDataError("list", error);
  return (data ?? []).map(toLibraryEntry).filter((entry): entry is LibraryEntry => entry !== null);
}

export type SavedStatus = { entryId: string; status: ReadingStatus };

type SavedStatusRow = {
  id: string;
  status: string;
  book: Pick<BookRow, "provider" | "provider_work_id"> | null;
};

/** The reader's saved status for each of the given Open Library works that they own. */
export async function savedStatusesForWorks(
  supabase: SupabaseClient,
  userId: string,
  workIds: readonly string[],
): Promise<Map<string, SavedStatus>> {
  const saved = new Map<string, SavedStatus>();
  if (workIds.length === 0) return saved;

  const { data, error } = await supabase
    .from("user_library")
    .select("id, status, book:books!inner(provider, provider_work_id)")
    .eq("user_id", userId)
    .eq("book.provider", PROVIDER)
    .in("book.provider_work_id", [...workIds])
    .overrideTypes<SavedStatusRow[], { merge: false }>();

  if (error) throw new LibraryDataError("saved statuses", error);
  for (const row of data ?? []) {
    if (row.book && isReadingStatus(row.status)) {
      saved.set(row.book.provider_work_id, { entryId: row.id, status: row.status });
    }
  }
  return saved;
}

/** The Open Library work behind one of the reader's entries, or null if they have no such entry. */
export async function workIdForEntry(supabase: SupabaseClient, userId: string, entryId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_library")
    .select("id, book:books!inner(provider, provider_work_id)")
    .eq("id", entryId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string; book: Pick<BookRow, "provider" | "provider_work_id"> | null }>();
  if (error) throw new LibraryDataError("entry lookup", error);
  return data?.book?.provider === PROVIDER ? data.book.provider_work_id : null;
}

/**
 * Makes sure each work exists in the shared catalog and returns its id by work id.
 * `ON CONFLICT DO NOTHING` lets concurrent adds of the same work both succeed
 * without duplicates; the first writer's metadata is kept.
 */
export async function ensureCatalogBooks(
  supabase: SupabaseClient,
  books: readonly LibraryBookInput[],
): Promise<Map<string, string>> {
  const unique = [...new Map(books.map((book) => [book.providerWorkId, book])).values()];
  if (unique.length === 0) return new Map();

  const { error: insertError } = await supabase.from("books").upsert(
    unique.map((book) => ({
      provider: PROVIDER,
      provider_work_id: book.providerWorkId,
      title: book.title,
      authors: book.authors,
      cover_id: book.coverId === null ? null : String(book.coverId),
      first_publish_year: book.firstPublishYear,
    })),
    { onConflict: "provider,provider_work_id", ignoreDuplicates: true, defaultToNull: false },
  );
  if (insertError) throw new LibraryDataError("catalog insert", insertError);

  const { data, error } = await supabase
    .from("books")
    .select("id, provider_work_id")
    .eq("provider", PROVIDER)
    .in(
      "provider_work_id",
      unique.map((book) => book.providerWorkId),
    )
    .overrideTypes<Pick<BookRow, "id" | "provider_work_id">[], { merge: false }>();
  if (error) throw new LibraryDataError("catalog lookup", error);

  const ids = new Map((data ?? []).map((row) => [row.provider_work_id, row.id]));
  if (unique.some((book) => !ids.has(book.providerWorkId))) {
    throw new LibraryDataError("catalog lookup");
  }
  return ids;
}

export type AddOutcome = { entryId: string; alreadyOwned: boolean };

/**
 * Adds a work to the reader's shelves, or moves it to `status` if they already own it.
 * The (user_id, book_id) unique constraint makes repeated or concurrent adds safe.
 */
export async function addLibraryBook(
  supabase: SupabaseClient,
  userId: string,
  book: LibraryBookInput,
  status: ReadingStatus,
): Promise<AddOutcome> {
  const bookIds = await ensureCatalogBooks(supabase, [book]);
  const bookId = bookIds.get(book.providerWorkId)!;

  const { data: inserted, error: insertError } = await supabase
    .from("user_library")
    .upsert(
      { user_id: userId, book_id: bookId, status, favorite: false, progress: progressForStatus(status, null) },
      { onConflict: "user_id,book_id", ignoreDuplicates: true },
    )
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (insertError) throw new LibraryDataError("library insert", insertError);
  if (inserted && inserted.length > 0) return { entryId: inserted[0].id, alreadyOwned: false };

  const { data: existing, error: existingError } = await supabase
    .from("user_library")
    .select("id")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle<{ id: string }>();
  if (existingError || !existing) throw new LibraryDataError("library lookup", existingError);

  await updateLibraryEntry(supabase, userId, existing.id, { status });
  return { entryId: existing.id, alreadyOwned: true };
}

/** Applies a change to one of the reader's entries. Returns false if they have no such entry. */
export async function updateLibraryEntry(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
  change: LibraryEntryChange,
): Promise<boolean> {
  const values: { status?: ReadingStatus; favorite?: boolean; progress?: number | null } = {};
  if (change.favorite !== undefined) values.favorite = change.favorite;
  if (change.progress !== undefined) values.progress = change.progress;

  if (change.status !== undefined) {
    values.status = change.status;
    if (change.progress === undefined) {
      const { data: current, error } = await supabase
        .from("user_library")
        .select("progress")
        .eq("id", entryId)
        .eq("user_id", userId)
        .maybeSingle<{ progress: number | null }>();
      if (error) throw new LibraryDataError("library read", error);
      if (!current) return false;
      values.progress = progressForStatus(change.status, current.progress);
    }
  }

  const { data, error } = await supabase
    .from("user_library")
    .update(values)
    .eq("id", entryId)
    .eq("user_id", userId)
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (error) throw new LibraryDataError("library update", error);
  return (data?.length ?? 0) > 0;
}

/** Deletes only the reader's relationship to a book; the shared catalog row stays. */
export async function removeLibraryEntry(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_library")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId)
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (error) throw new LibraryDataError("library delete", error);
  return (data?.length ?? 0) > 0;
}

export type ImportableBook = LibraryBookInput & {
  status: ReadingStatus;
  favorite: boolean;
  progress: number | null;
  /** ISO timestamp, or null to use the time of import. */
  dateAdded: string | null;
};

export type ImportOutcome = {
  imported: number;
  alreadyInLibrary: number;
  /** Books that should be on the shelves afterwards but could not be found. */
  missing: number;
};

/**
 * Imports books into the reader's shelves. Existing entries always win: a work the
 * reader already owns is left untouched. Safe to retry after any failure.
 */
export async function importLibraryBooks(
  supabase: SupabaseClient,
  userId: string,
  books: readonly ImportableBook[],
): Promise<ImportOutcome> {
  if (books.length === 0) return { imported: 0, alreadyInLibrary: 0, missing: 0 };

  const bookIds = await ensureCatalogBooks(supabase, books);
  const now = new Date().toISOString();
  const rows = books.map((book) => ({
    user_id: userId,
    book_id: bookIds.get(book.providerWorkId)!,
    status: book.status,
    favorite: book.favorite,
    progress: book.progress,
    date_added: book.dateAdded ?? now,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("user_library")
    .upsert(rows, { onConflict: "user_id,book_id", ignoreDuplicates: true, defaultToNull: false })
    .select("book_id")
    .overrideTypes<{ book_id: string }[], { merge: false }>();
  if (insertError) throw new LibraryDataError("library import", insertError);

  const expected = [...new Set(rows.map((row) => row.book_id))];
  const { data: present, error: verifyError } = await supabase
    .from("user_library")
    .select("book_id")
    .eq("user_id", userId)
    .in("book_id", expected)
    .overrideTypes<{ book_id: string }[], { merge: false }>();
  if (verifyError) throw new LibraryDataError("library import check", verifyError);

  const importedCount = inserted?.length ?? 0;
  const presentCount = new Set((present ?? []).map((row) => row.book_id)).size;
  return {
    imported: importedCount,
    alreadyInLibrary: Math.max(0, presentCount - importedCount),
    missing: expected.length - presentCount,
  };
}
