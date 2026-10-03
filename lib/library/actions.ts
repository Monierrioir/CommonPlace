"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  addLibraryBook,
  importLibraryBooks,
  removeLibraryEntry,
  updateLibraryEntry,
  type ImportableBook,
} from "./data";
import { sanitizeStoredBooks } from "./storage";
import { isReadingStatus } from "./types";
import { isEntryId, parseBookInput, parseEntryChange } from "./validation";

export type LibraryActionResult =
  | { ok: true }
  | { ok: false; reason: "signed-out" | "invalid" | "not-found" | "failed"; message: string };

const SIGNED_OUT = {
  ok: false,
  reason: "signed-out",
  message: "Your session has ended. Please log in again.",
} as const satisfies LibraryActionResult;
const INVALID: LibraryActionResult = {
  ok: false,
  reason: "invalid",
  message: "That change didn’t look right, so nothing was saved.",
};
const NOT_FOUND: LibraryActionResult = {
  ok: false,
  reason: "not-found",
  message: "That book is no longer on your shelves.",
};
const FAILED: LibraryActionResult = {
  ok: false,
  reason: "failed",
  message: "We couldn’t save that just now. Please try again in a moment.",
};

function logFailure(error: unknown) {
  console.error(error instanceof Error ? error.message : "[library] action failed");
}

/** Adds a searched book to the reader's shelves, or moves it if they already own it. */
export async function addToLibraryAction(book: unknown, status: unknown): Promise<LibraryActionResult> {
  const input = parseBookInput(book);
  if (!input || !isReadingStatus(status)) return INVALID;

  const user = await getCurrentUser();
  if (!user) return SIGNED_OUT;

  try {
    const supabase = await createClient();
    await addLibraryBook(supabase, user.id, input, status);
  } catch (error) {
    logFailure(error);
    return FAILED;
  }

  refresh();
  return { ok: true };
}

export async function updateLibraryEntryAction(entryId: unknown, change: unknown): Promise<LibraryActionResult> {
  const parsed = parseEntryChange(change);
  if (!isEntryId(entryId) || !parsed) return INVALID;

  const user = await getCurrentUser();
  if (!user) return SIGNED_OUT;

  try {
    const supabase = await createClient();
    if (!(await updateLibraryEntry(supabase, user.id, entryId, parsed))) return NOT_FOUND;
  } catch (error) {
    logFailure(error);
    return FAILED;
  }

  refresh();
  return { ok: true };
}

export async function removeLibraryEntryAction(entryId: unknown): Promise<LibraryActionResult> {
  if (!isEntryId(entryId)) return INVALID;

  const user = await getCurrentUser();
  if (!user) return SIGNED_OUT;

  try {
    const supabase = await createClient();
    if (!(await removeLibraryEntry(supabase, user.id, entryId))) return NOT_FOUND;
  } catch (error) {
    logFailure(error);
    return FAILED;
  }

  refresh();
  return { ok: true };
}

export type LegacyImportResult =
  | { status: "complete"; imported: number; alreadyInLibrary: number; unreadable: number }
  | { status: "failed"; message: string };

const MAX_LEGACY_ITEMS = 2000;

function importDate(value: string): string | null {
  const time = Date.parse(value);
  // The prototype used the epoch as a stand-in for unknown dates.
  if (Number.isNaN(time) || time <= 0) return null;
  return new Date(Math.min(time, Date.now())).toISOString();
}

/**
 * One-time import of the localStorage prototype. The raw items are re-validated
 * here; only the verified session decides whose shelves they land on.
 */
export async function importLegacyLibraryAction(items: unknown): Promise<LegacyImportResult> {
  if (!Array.isArray(items) || items.length > MAX_LEGACY_ITEMS) {
    return { status: "failed", message: "We couldn’t read the books saved in this browser." };
  }

  const user = await getCurrentUser();
  if (!user) return { status: "failed", message: SIGNED_OUT.message };

  const books: ImportableBook[] = sanitizeStoredBooks(items).map((book) => ({
    providerWorkId: book.providerWorkId,
    title: book.title,
    authors: book.authors,
    coverId: book.coverId,
    firstPublishYear: book.firstPublishYear,
    status: book.status,
    favorite: book.favorite,
    progress: book.progress,
    dateAdded: importDate(book.dateAdded),
  }));
  const unreadable = items.length - books.length;

  try {
    const supabase = await createClient();
    const outcome = await importLibraryBooks(supabase, user.id, books);
    if (outcome.missing > 0) {
      refresh();
      return {
        status: "failed",
        message: `${outcome.missing} ${outcome.missing === 1 ? "book didn’t" : "books didn’t"} make it onto your shelves. Your local copy is safe — please try again.`,
      };
    }
    refresh();
    return { status: "complete", imported: outcome.imported, alreadyInLibrary: outcome.alreadyInLibrary, unreadable };
  } catch (error) {
    logFailure(error);
    return {
      status: "failed",
      message: "We couldn’t bring your books over just now. Your local copy is safe — please try again.",
    };
  }
}
