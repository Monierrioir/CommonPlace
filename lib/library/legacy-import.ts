import { useSyncExternalStore } from "react";
import { LIBRARY_STORAGE_KEY, readStoredLibraryRaw, sanitizeStoredBooks, storedLibraryItems } from "./storage";

/** Written only after every readable local book is confirmed on the reader's Supabase shelves. */
export const LEGACY_MIGRATION_MARKER_KEY = "commonplace.library.supabase-migration.v1";
/** "Not now" quiets the offer for the rest of this browser session only. */
const SNOOZE_KEY = `${LEGACY_MIGRATION_MARKER_KEY}.snoozed`;

type MigrationMarker = {
  status: "completed";
  completedAt: string;
  imported: number;
  alreadyInLibrary: number;
};

export type LegacyLibrary = {
  /** Raw stored items, sent as-is so the server does its own validation. */
  items: unknown[];
  readableCount: number;
  completed: boolean;
  snoozed: boolean;
};

const listeners = new Set<() => void>();

function readKey(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function writeKey(storage: () => Storage, key: string, value: string): void {
  try {
    storage().setItem(key, value);
  } catch {
    // Storage unavailable: the offer simply reappears next time.
  }
}

function isCompletedMarker(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "object" && value !== null && (value as { status?: unknown }).status === "completed";
  } catch {
    return false;
  }
}

let cachedSignature: string | undefined;
let cachedSnapshot: LegacyLibrary | null = null;

function getSnapshot(): LegacyLibrary | null {
  const raw = readStoredLibraryRaw();
  const marker = readKey(() => window.localStorage, LEGACY_MIGRATION_MARKER_KEY);
  const snooze = readKey(() => window.sessionStorage, SNOOZE_KEY);
  const signature = JSON.stringify([raw, marker, snooze]);
  if (signature === cachedSignature) return cachedSnapshot;

  cachedSignature = signature;
  const items = storedLibraryItems(raw);
  cachedSnapshot = items
    ? {
        items,
        readableCount: sanitizeStoredBooks(items).length,
        completed: isCompletedMarker(marker),
        snoozed: snooze === "1",
      }
    : null;
  return cachedSnapshot;
}

function getServerSnapshot(): null {
  return null;
}

function notify() {
  for (const listener of listeners) listener();
}

function handleStorageEvent(event: StorageEvent) {
  if (event.key === null || event.key === LIBRARY_STORAGE_KEY || event.key === LEGACY_MIGRATION_MARKER_KEY) notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", handleStorageEvent);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", handleStorageEvent);
  };
}

/** The prototype library saved in this browser, or null if there is none (or during SSR). */
export function useLegacyLibrary(): LegacyLibrary | null {
  return useSyncExternalStore<LegacyLibrary | null>(subscribe, getSnapshot, getServerSnapshot);
}

export function markLegacyMigrationComplete(result: { imported: number; alreadyInLibrary: number }): void {
  const marker: MigrationMarker = {
    status: "completed",
    completedAt: new Date().toISOString(),
    imported: result.imported,
    alreadyInLibrary: result.alreadyInLibrary,
  };
  writeKey(() => window.localStorage, LEGACY_MIGRATION_MARKER_KEY, JSON.stringify(marker));
  notify();
}

export function snoozeLegacyImport(): void {
  writeKey(() => window.sessionStorage, SNOOZE_KEY, "1");
  notify();
}
