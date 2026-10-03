import { useEffect, useState } from "react";
import { parseBookCast, type BookCast } from "@/lib/reflections/cast";

/** Past this, the character questions settle on free text; the server keeps working and caches for next time. */
const TIMEOUT_MS = 12000;

type Outcome = { cast: BookCast | null; final: boolean };

const requests = new Map<string, Promise<BookCast | null>>();
const settled = new Map<string, BookCast | null>();

async function request(entryId: string): Promise<Outcome> {
  try {
    const response = await fetch(`/library/characters?entry=${encodeURIComponent(entryId)}`, {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return { cast: null, final: false };
    const body: unknown = await response.json();
    const cast = typeof body === "object" && body !== null ? (body as { cast?: unknown }).cast : null;
    return { cast: parseBookCast(cast), final: true };
  } catch {
    return { cast: null, final: false };
  }
}

/** Resolves to the book's cast, or null when there is no trustworthy one. Never rejects. */
export function loadBookCast(entryId: string): Promise<BookCast | null> {
  let pending = requests.get(entryId);
  if (!pending) {
    pending = request(entryId).then(({ cast, final }) => {
      // Only settled answers are remembered, so a failed lookup is tried again next time.
      if (final) settled.set(entryId, cast);
      else requests.delete(entryId);
      return cast;
    });
    requests.set(entryId, pending);
  }
  return pending;
}

/** Starts the lookup early — when a book is finished or opened — so the reflection rarely waits. */
export function prefetchBookCast(entryId: string): void {
  void loadBookCast(entryId);
}

export type CastState = { status: "loading" } | { status: "ready"; cast: BookCast } | { status: "unavailable" };

export function useBookCast(entryId: string): CastState {
  const [result, setResult] = useState<{ entryId: string; cast: BookCast | null } | null>(() =>
    settled.has(entryId) ? { entryId, cast: settled.get(entryId) ?? null } : null,
  );

  useEffect(() => {
    let active = true;
    loadBookCast(entryId).then((cast) => {
      if (active) setResult({ entryId, cast });
    });
    return () => {
      active = false;
    };
  }, [entryId]);

  if (!result || result.entryId !== entryId) return { status: "loading" };
  return result.cast ? { status: "ready", cast: result.cast } : { status: "unavailable" };
}
