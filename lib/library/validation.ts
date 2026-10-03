import {
  clampProgress,
  isReadingStatus,
  type LibraryBookInput,
  type LibraryEntryChange,
} from "./types";

const WORK_ID_PATTERN = /^OL\d{1,12}W$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_TITLE_LENGTH = 500;
const MAX_AUTHORS = 50;
const MAX_AUTHOR_LENGTH = 200;

export function isEntryId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function positiveIntegerOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** Rebuilds catalog metadata from untrusted client input, or returns null if it is unusable. */
export function parseBookInput(value: unknown): LibraryBookInput | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;

  if (typeof raw.providerWorkId !== "string" || !WORK_ID_PATTERN.test(raw.providerWorkId)) return null;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title || title.length > MAX_TITLE_LENGTH) return null;

  const authors = Array.isArray(raw.authors)
    ? [
        ...new Set(
          raw.authors
            .filter((name): name is string => typeof name === "string")
            .map((name) => name.trim())
            .filter((name) => name && name.length <= MAX_AUTHOR_LENGTH),
        ),
      ].slice(0, MAX_AUTHORS)
    : [];

  const year = typeof raw.firstPublishYear === "number" && Number.isInteger(raw.firstPublishYear)
    ? raw.firstPublishYear
    : null;

  return {
    providerWorkId: raw.providerWorkId,
    title,
    authors,
    coverId: positiveIntegerOrNull(raw.coverId),
    firstPublishYear: year !== null && year > 0 && year <= 3000 ? year : null,
  };
}

/** Keeps only the recognised, well-formed fields of a requested change. */
export function parseEntryChange(value: unknown): LibraryEntryChange | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const change: LibraryEntryChange = {};

  if (raw.status !== undefined) {
    if (!isReadingStatus(raw.status)) return null;
    change.status = raw.status;
  }
  if (raw.favorite !== undefined) {
    if (typeof raw.favorite !== "boolean") return null;
    change.favorite = raw.favorite;
  }
  if (raw.progress !== undefined) {
    if (typeof raw.progress !== "number" || !Number.isFinite(raw.progress)) return null;
    change.progress = clampProgress(raw.progress);
  }

  return Object.keys(change).length > 0 ? change : null;
}
