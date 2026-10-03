"use client";

import Link from "next/link";
import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { loginPathFor } from "@/lib/auth/routes";
import type { BookSearchResult } from "@/lib/books/types";
import { addToLibraryAction } from "@/lib/library/actions";
import {
  READING_STATUSES,
  readingStatusLabels,
  type LibraryBookInput,
  type ReadingStatus,
} from "@/lib/library/types";

type AddToLibraryProps = {
  book: BookSearchResult;
  signedIn: boolean;
  savedStatus: ReadingStatus | null;
  /** Where login should bring a signed-out reader back to. */
  returnTo: string;
};

const triggerClassName = "flex min-h-11 w-full items-center gap-2 rounded-full border px-3.5 text-left text-sm transition-colors";
const unsavedClassName = "border-line bg-cream/80 text-ink hover:border-ink-muted/50 hover:bg-cream";

function toBookInput(book: BookSearchResult): LibraryBookInput {
  const coverId = book.cover ? Number(book.cover.sourceId) : null;
  return {
    providerWorkId: book.providerId,
    title: book.title,
    authors: book.authors,
    coverId: coverId && Number.isInteger(coverId) && coverId > 0 ? coverId : null,
    firstPublishYear: book.firstPublishYear,
  };
}

export function AddToLibrary({ book, signedIn, savedStatus, returnTo }: AddToLibraryProps) {
  if (!signedIn) {
    return (
      <div className="mt-auto pt-3">
        <Link
          href={loginPathFor(returnTo)}
          aria-label={`Log in to add ${book.title} to your library`}
          className={`${triggerClassName} ${unsavedClassName}`}
        >
          <Icon name="plus" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block font-medium">Add to library</span>
            <span className="block text-xs text-ink-muted">Log in to save it</span>
          </span>
        </Link>
      </div>
    );
  }

  return <AddToLibraryMenu book={book} savedStatus={savedStatus} />;
}

function AddToLibraryMenu({ book, savedStatus }: { book: BookSearchResult; savedStatus: ReadingStatus | null }) {
  const [status, setOptimisticStatus] = useOptimistic(savedStatus);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function choose(next: ReadingStatus) {
    const wasSaved = status !== null;
    setOpen(false);
    triggerRef.current?.focus();
    if (next === status) return;

    startTransition(async () => {
      setOptimisticStatus(next);
      const result = await addToLibraryAction(toBookInput(book), next);
      if (result.ok) {
        setError(null);
        setAnnouncement(
          wasSaved
            ? `${book.title} moved to ${readingStatusLabels[next]}.`
            : `${book.title} added to your library as ${readingStatusLabels[next]}.`,
        );
      } else {
        setError(result.message);
      }
    });
  }

  const saved = status !== null;

  return (
    <div ref={rootRef} className="relative mt-auto pt-3">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-busy={pending || undefined}
        aria-label={
          saved ? `In your library, ${readingStatusLabels[status]}: ${book.title}` : `Add to library: ${book.title}`
        }
        onClick={() => setOpen((value) => !value)}
        className={`${triggerClassName} ${
          saved ? "border-forest/30 bg-forest/[0.07] text-forest hover:bg-forest/[0.12]" : unsavedClassName
        }`}
      >
        <Icon name={saved ? "check" : "plus"} className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 leading-tight">
          {saved ? (
            <>
              <span className="block font-medium">In your library</span>
              <span className="block text-xs text-ink-muted">{readingStatusLabels[status]}</span>
            </>
          ) : (
            <span className="font-medium">Add to library</span>
          )}
        </span>
        <Icon
          name="chevron-down"
          className={`size-4 shrink-0 transition-transform duration-300 ease-gentle ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        id={menuId}
        role="group"
        aria-label={saved ? `Move ${book.title} to a shelf` : `Choose a shelf for ${book.title}`}
        hidden={!open}
        className="absolute inset-x-0 top-full z-20 mt-1.5 rounded-lg border border-line bg-cream p-1.5 shadow-paper"
      >
        <ul className="flex flex-col">
          {READING_STATUSES.map((option) => {
            const current = status === option;
            return (
              <li key={option}>
                <button
                  type="button"
                  aria-pressed={current}
                  onClick={() => choose(option)}
                  className="flex min-h-11 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-parchment/70 hover:text-ink aria-pressed:font-medium aria-pressed:text-forest"
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {current ? <Icon name="check" className="size-4" /> : null}
                  </span>
                  {readingStatusLabels[option]}
                </button>
              </li>
            );
          })}
        </ul>
        {saved ? (
          <Link
            href="/library"
            className="mt-1 flex min-h-11 items-center gap-1.5 border-t border-line/70 px-2.5 pt-1 text-xs text-ink-muted hover:text-burgundy"
          >
            See it on your shelf
            <Icon name="arrow" className="size-3.5" />
          </Link>
        ) : null}
      </div>

      <div role="alert">{error ? <p className="mt-1.5 text-xs leading-snug text-burgundy">{error}</p> : null}</div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
