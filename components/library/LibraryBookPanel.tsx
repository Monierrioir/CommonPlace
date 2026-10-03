"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CoverImage } from "@/components/books/CoverImage";
import { ReflectionSummary } from "@/components/reflections/ReflectionSummary";
import { Icon } from "@/components/ui/Icon";
import { formatAuthors } from "@/lib/books/format";
import {
  READING_STATUSES,
  clampProgress,
  readingStatusLabels,
  type LibraryEntry,
  type LibraryEntryChange,
} from "@/lib/library/types";

// Progress is saved once the reader pauses, not on every step of the slider.
const PROGRESS_SAVE_DELAY_MS = 450;

type LibraryBookPanelProps = {
  book: LibraryEntry;
  saveError: string | null;
  onChange: (change: LibraryEntryChange) => void;
  onRemove: () => void;
  onReflect: () => void;
  onClose: () => void;
};

export function LibraryBookPanel({ book, saveError, onChange, onRemove, onReflect, onClose }: LibraryBookPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [pendingProgress, setPendingProgress] = useState<number | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const pendingRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  const titleId = useId();
  const statusName = useId();

  const author = formatAuthors(book.authors);
  const progress = pendingProgress ?? book.progress ?? 0;

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    // Closing mid-edit still saves the last value.
    return () => {
      window.clearTimeout(saveTimer.current);
      if (pendingRef.current !== null) onChangeRef.current({ progress: pendingRef.current });
    };
  }, []);

  function flushProgress() {
    window.clearTimeout(saveTimer.current);
    const value = pendingRef.current;
    pendingRef.current = null;
    setPendingProgress(null);
    if (value !== null && value !== book.progress) onChange({ progress: value });
  }

  function queueProgress(value: number) {
    const next = clampProgress(value);
    pendingRef.current = next;
    setPendingProgress(next);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flushProgress, PROGRESS_SAVE_DELAY_MS);
  }

  function editProgressText(value: string) {
    setProgressText(value);
    const parsed = Number(value);
    if (value.trim() !== "" && Number.isFinite(parsed)) queueProgress(parsed);
  }

  function remove() {
    // Close first: closing restores focus to the shelf book, which is about to disappear.
    window.clearTimeout(saveTimer.current);
    pendingRef.current = null;
    dialogRef.current?.close();
    onRemove();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-2xl bg-cream p-0 text-ink shadow-paper backdrop:bg-ink/45 sm:m-auto sm:max-w-lg sm:rounded-xl"
    >
      <div className="relative px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-7">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          className="absolute top-2.5 right-2.5 flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-parchment hover:text-ink"
        >
          <Icon name="close" className="size-5" />
        </button>

        <div className="flex gap-5 pr-10">
          <div className="@container flex aspect-[2/3] w-24 shrink-0 items-end sm:w-28">
            <div className="w-full">
              <CoverImage
                src={book.coverUrl}
                title={book.title}
                author={author}
                seed={book.providerWorkId}
                sizes="120px"
              />
            </div>
          </div>
          <div className="min-w-0 self-end pb-1">
            <h2 id={titleId} className="font-serif text-xl leading-snug text-ink sm:text-2xl">
              {book.title}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {author ?? <span className="italic">Author unknown</span>}
            </p>
            {book.firstPublishYear ? (
              <p className="mt-1 text-xs text-ink-muted tabular-nums">{book.firstPublishYear}</p>
            ) : null}
          </div>
        </div>

        <fieldset className="mt-7">
          <legend className="text-xs font-medium tracking-[0.14em] text-ink-muted uppercase">
            Reading status
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {READING_STATUSES.map((status) => (
              <label
                key={status}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-paper/60 px-3.5 text-sm text-ink-soft transition-colors hover:border-ink-muted/50 has-checked:border-forest/50 has-checked:bg-forest/[0.08] has-checked:font-medium has-checked:text-forest has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-forest"
              >
                <input
                  type="radio"
                  name={statusName}
                  value={status}
                  checked={book.status === status}
                  onChange={() => onChange({ status })}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className="flex size-4 shrink-0 items-center justify-center rounded-full border border-current"
                >
                  {book.status === status ? <Icon name="check" className="size-3" /> : null}
                </span>
                {readingStatusLabels[status]}
              </label>
            ))}
          </div>
        </fieldset>

        {book.status === "currently-reading" ? (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor={`${statusName}-progress`}
                className="text-xs font-medium tracking-[0.14em] text-ink-muted uppercase"
              >
                Progress
              </label>
              <span className="flex items-center gap-1 text-sm text-ink">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  step={1}
                  aria-label={`Progress for ${book.title}, in percent`}
                  value={progressText ?? String(progress)}
                  onChange={(event) => editProgressText(event.target.value)}
                  onBlur={() => {
                    setProgressText(null);
                    flushProgress();
                  }}
                  className="h-11 w-16 rounded-md border border-line bg-paper/60 px-2 text-right tabular-nums"
                />
                %
              </span>
            </div>
            <input
              id={`${statusName}-progress`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={progress}
              aria-valuetext={`${progress}%`}
              onChange={(event) => {
                setProgressText(null);
                queueProgress(Number(event.target.value));
              }}
              onPointerUp={flushProgress}
              onBlur={flushProgress}
              className="mt-3 h-11 w-full cursor-pointer accent-burgundy"
            />
          </div>
        ) : null}

        {book.status === "finished" || book.reflection ? (
          <ReflectionSummary reflection={book.reflection} onEdit={onReflect} />
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line/80 pt-5">
          <button
            type="button"
            aria-pressed={book.favorite}
            onClick={() => onChange({ favorite: !book.favorite })}
            className="flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm text-ink-soft transition-colors hover:border-ink-muted/50 aria-pressed:border-burgundy/40 aria-pressed:bg-burgundy/[0.06] aria-pressed:text-ink"
          >
            <Icon
              name="heart"
              className={`size-4.5 ${book.favorite ? "fill-burgundy text-burgundy" : ""}`}
            />
            Favorite
          </button>

          <div className="ml-auto">
            {confirmingRemove ? (
              <div className="flex flex-wrap items-center justify-end gap-1" role="group" aria-label="Confirm removal">
                <span className="mr-1 text-sm text-ink-soft">
                  {book.reflection ? "Remove this book and your reflection?" : "Remove this book?"}
                </span>
                <button
                  type="button"
                  onClick={remove}
                  className="min-h-11 rounded-full bg-burgundy px-4 text-sm font-medium text-cream hover:bg-burgundy/90"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingRemove(false)}
                  className="min-h-11 rounded-full px-3 text-sm text-ink-soft hover:text-ink"
                >
                  Keep
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingRemove(true)}
                className="min-h-11 px-1 text-sm text-ink-muted underline decoration-line underline-offset-4 hover:text-burgundy hover:decoration-burgundy/40"
              >
                Remove from library
              </button>
            )}
          </div>
        </div>

        <div role="alert">
          {saveError ? <p className="mt-4 text-sm leading-relaxed text-burgundy">{saveError}</p> : null}
        </div>
      </div>
    </dialog>
  );
}
