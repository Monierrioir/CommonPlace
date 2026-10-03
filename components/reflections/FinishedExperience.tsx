"use client";

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { CoverImage } from "@/components/books/CoverImage";
import { Icon } from "@/components/ui/Icon";
import { formatAuthors } from "@/lib/books/format";
import type { LibraryActionResult } from "@/lib/library/actions";
import type { LibraryEntry } from "@/lib/library/types";
import {
  LIKED_ASPECTS,
  REFLECTION_EMOTIONS,
  REFLECTION_LIMITS,
  WORLD_ANSWERS,
  isEmptyReflection,
  likedAspectLabels,
  reflectionEmotionLabels,
  worldAnswerLabels,
  type BookReflectionInput,
  type LikedAspect,
  type Rating,
  type ReflectionEmotion,
  type WorldAnswer,
} from "@/lib/reflections/types";
import { useBookCast } from "./book-cast";
import { CharacterQuestion } from "./CharacterQuestion";
import { questionClass } from "./reflection-styles";
import { StarRatingInput } from "./StarRating";

type Draft = {
  rating: Rating | null;
  favoriteCharacter: string;
  leastFavoriteCharacter: string;
  likedAspects: LikedAspect[];
  emotions: ReflectionEmotion[];
  wouldLiveThere: WorldAnswer | null;
  finalThought: string;
};

function draftFrom(book: LibraryEntry): Draft {
  const saved = book.reflection;
  return {
    rating: saved?.rating ?? null,
    favoriteCharacter: saved?.favoriteCharacter ?? "",
    leastFavoriteCharacter: saved?.leastFavoriteCharacter ?? "",
    likedAspects: saved?.likedAspects ?? [],
    emotions: saved?.emotions ?? [],
    wouldLiveThere: saved?.wouldLiveThere ?? null,
    finalThought: saved?.finalThought ?? "",
  };
}

function textOrNull(value: string, singleLine: boolean): string | null {
  const text = (singleLine ? value.replace(/\s+/g, " ") : value).trim();
  return text === "" ? null : text;
}

function toInput(draft: Draft): BookReflectionInput {
  return {
    rating: draft.rating,
    favoriteCharacter: textOrNull(draft.favoriteCharacter, true),
    leastFavoriteCharacter: textOrNull(draft.leastFavoriteCharacter, true),
    likedAspects: draft.likedAspects,
    emotions: draft.emotions,
    wouldLiveThere: draft.wouldLiveThere,
    finalThought: textOrNull(draft.finalThought, false),
  };
}

/** Toggles a value while keeping the canonical option order. */
function toggle<T extends string>(options: readonly T[], selected: T[], value: T): T[] {
  const chosen = new Set(selected);
  if (chosen.has(value)) chosen.delete(value);
  else chosen.add(value);
  return options.filter((option) => chosen.has(option));
}

function unfoldDelay(index: number, celebrate: boolean): string {
  return `${celebrate ? 550 + index * 110 : index * 50}ms`;
}

type QuestionProps = {
  index: number;
  celebrate: boolean;
  children: ReactNode;
};

/** One quiet section of the reflection; sections unfold one after another on arrival. */
function Question({ index, celebrate, children }: QuestionProps) {
  return (
    <div
      className="border-t border-line/70 pt-8 first:border-t-0 first:pt-0 motion-safe:animate-unfold"
      style={{ animationDelay: unfoldDelay(index, celebrate) }}
    >
      {children}
    </div>
  );
}

type WordChoiceProps = {
  type: "checkbox" | "radio";
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  onClick?: () => void;
};

/** A selectable word, marked like a pencil underline rather than a button. */
function WordChoice({ type, name, label, checked, onChange, onClick }: WordChoiceProps) {
  return (
    <label className="group inline-flex min-h-11 cursor-pointer items-center rounded-sm px-2 font-serif text-lg text-ink-muted transition-colors hover:text-ink has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-forest">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        onClick={onClick}
        className="sr-only"
      />
      <span className="underline decoration-transparent decoration-2 underline-offset-[7px] transition-[text-decoration-color] duration-200 group-hover:decoration-line group-has-checked:decoration-ochre">
        {label}
      </span>
    </label>
  );
}

type FinishedExperienceProps = {
  book: LibraryEntry;
  /** True right after the book was marked Finished; false when revisiting from the shelf. */
  celebrate: boolean;
  onSave: (reflection: BookReflectionInput) => Promise<LibraryActionResult>;
  onClose: () => void;
};

export function FinishedExperience({ book, celebrate, onSave, onClose }: FinishedExperienceProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(book));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cast = useBookCast(book.entryId);
  const id = useId();
  const titleId = `${id}-title`;
  const author = formatAuthors(book.authors);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function save() {
    const input = toInput(draft);
    // Nothing answered and nothing saved before: there is nothing to keep.
    if (isEmptyReflection(input) && !book.reflection) {
      dialogRef.current?.close();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onSave(input);
      if (!result.ok) setError(result.message);
    });
  }

  const thoughtLength = draft.finalThought.length;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain bg-cream p-0 text-ink backdrop:bg-ink/60"
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label={celebrate ? "Skip for now" : "Close"}
          className="absolute top-2.5 right-2.5 flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-parchment hover:text-ink sm:top-4 sm:right-4"
        >
          <Icon name="close" className="size-5" />
        </button>

        <div className="mx-auto max-w-xl px-5 pt-14 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-20">
          <header className="text-center">
            <div className="@container mx-auto flex aspect-[2/3] w-28 items-end sm:w-32 motion-safe:animate-settle">
              <div className="w-full">
                <CoverImage
                  src={book.coverUrl}
                  title={book.title}
                  author={author}
                  seed={book.providerWorkId}
                  sizes="140px"
                />
              </div>
            </div>

            <p className="mt-8 text-xs font-medium tracking-[0.16em] text-ink-muted uppercase">
              {celebrate ? "The final page" : "Your reflection"}
            </p>
            <h2 id={titleId} className="mt-3 font-serif text-[1.875rem] leading-[1.15] text-ink sm:text-[2.5rem]">
              {celebrate ? (
                <>
                  You finished <em className="italic">{book.title}</em>.
                </>
              ) : (
                <em className="italic">{book.title}</em>
              )}
            </h2>
            {author ? <p className="mt-2 text-sm text-ink-soft">{author}</p> : null}
            <p className="mx-auto mt-5 max-w-sm font-serif text-lg leading-relaxed text-ink-soft italic">
              {celebrate
                ? "Close it gently. If you like, leave a few notes for your future self — every question is optional."
                : "Every question is optional. Change whatever you like."}
            </p>
            <span
              aria-hidden="true"
              className="mx-auto mt-8 block h-px w-24 origin-center bg-ochre/70 motion-safe:animate-draw"
            />
          </header>

          <div className="mt-10 space-y-8">
            <Question index={0} celebrate={celebrate}>
              <fieldset>
                <legend className={questionClass}>How was it?</legend>
                <div className="mt-3">
                  <StarRatingInput
                    name={`${id}-rating`}
                    value={draft.rating}
                    onChange={(value) => update("rating", value)}
                  />
                </div>
              </fieldset>
            </Question>

            <Question index={1} celebrate={celebrate}>
              <CharacterQuestion
                id={`${id}-favorite`}
                question="Who stayed with you?"
                hint="Choose one from the cast, or name someone else."
                placeholder="A character’s name"
                value={draft.favoriteCharacter}
                onChange={(value) => update("favoriteCharacter", value)}
                cast={cast}
                anchor={
                  <div className="@container flex aspect-[2/3] w-24 items-end">
                    <div className="w-full">
                      <CoverImage
                        src={book.coverUrl}
                        title={book.title}
                        author={author}
                        seed={book.providerWorkId}
                        sizes="100px"
                      />
                    </div>
                  </div>
                }
              />
            </Question>

            <Question index={2} celebrate={celebrate}>
              <CharacterQuestion
                id={`${id}-least`}
                question="Who tested your patience?"
                hint="Only if someone did."
                placeholder="No one, perhaps"
                value={draft.leastFavoriteCharacter}
                onChange={(value) => update("leastFavoriteCharacter", value)}
                cast={cast}
                compact
              />
            </Question>

            <Question index={3} celebrate={celebrate}>
              <fieldset>
                <legend className={questionClass}>What drew you in?</legend>
                <p className="mt-1 text-sm text-ink-muted">Choose as many as you like.</p>
                <div className="-ml-2 mt-2 flex flex-wrap gap-x-2">
                  {LIKED_ASPECTS.map((aspect) => (
                    <WordChoice
                      key={aspect}
                      type="checkbox"
                      name={`${id}-aspects`}
                      label={likedAspectLabels[aspect]}
                      checked={draft.likedAspects.includes(aspect)}
                      onChange={() => update("likedAspects", toggle(LIKED_ASPECTS, draft.likedAspects, aspect))}
                    />
                  ))}
                </div>
              </fieldset>
            </Question>

            <Question index={4} celebrate={celebrate}>
              <fieldset>
                <legend className={questionClass}>How did it leave you feeling?</legend>
                <p className="mt-1 text-sm text-ink-muted">Choose as many as you like.</p>
                <div className="-ml-2 mt-2 flex flex-wrap gap-x-2">
                  {REFLECTION_EMOTIONS.map((emotion) => (
                    <WordChoice
                      key={emotion}
                      type="checkbox"
                      name={`${id}-emotions`}
                      label={reflectionEmotionLabels[emotion]}
                      checked={draft.emotions.includes(emotion)}
                      onChange={() => update("emotions", toggle(REFLECTION_EMOTIONS, draft.emotions, emotion))}
                    />
                  ))}
                </div>
              </fieldset>
            </Question>

            <Question index={5} celebrate={celebrate}>
              <fieldset>
                <legend className={questionClass}>Would you live in this world?</legend>
                <div className="-ml-2 mt-2 flex flex-wrap gap-x-2">
                  {WORLD_ANSWERS.map((answer) => (
                    <WordChoice
                      key={answer}
                      type="radio"
                      name={`${id}-world`}
                      label={worldAnswerLabels[answer]}
                      checked={draft.wouldLiveThere === answer}
                      onChange={() => update("wouldLiveThere", answer)}
                      onClick={() => {
                        if (draft.wouldLiveThere === answer) update("wouldLiveThere", null);
                      }}
                    />
                  ))}
                </div>
              </fieldset>
            </Question>

            <Question index={6} celebrate={celebrate}>
              <label htmlFor={`${id}-thought`} className={questionClass}>
                One last thought?
              </label>
              <p id={`${id}-thought-hint`} className="mt-1 text-sm text-ink-muted">
                A private note — only you can see it.
              </p>
              <textarea
                id={`${id}-thought`}
                aria-describedby={`${id}-thought-hint`}
                rows={4}
                maxLength={REFLECTION_LIMITS.finalThought}
                value={draft.finalThought}
                onChange={(event) => update("finalThought", event.target.value)}
                className="paper-lined mt-4 block w-full resize-y rounded-sm border border-line/70 bg-local px-4 pt-8 pb-2 font-serif text-lg leading-8 text-ink focus:border-forest focus-visible:outline-none"
              />
              {thoughtLength > REFLECTION_LIMITS.finalThought * 0.8 ? (
                <p className="mt-1.5 text-right text-xs text-ink-muted tabular-nums">
                  {thoughtLength} / {REFLECTION_LIMITS.finalThought}
                </p>
              ) : null}
            </Question>

            <div
              className="border-t border-line/70 pt-8 motion-safe:animate-unfold"
              style={{ animationDelay: unfoldDelay(7, celebrate) }}
            >
              <div role="alert">
                {error ? <p className="mb-5 text-sm leading-relaxed text-burgundy">{error}</p> : null}
              </div>
              <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  disabled={pending}
                  className="min-h-11 px-3 text-sm text-ink-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink disabled:opacity-60"
                >
                  {celebrate ? "Skip for now" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={pending}
                  className="inline-flex h-12 items-center justify-center gap-2.5 rounded-sm bg-ink px-6 text-base font-medium text-cream transition-[background-color,transform] duration-200 hover:bg-ink-soft active:translate-y-px disabled:cursor-progress disabled:bg-ink-soft"
                >
                  {pending ? (
                    <span
                      aria-hidden="true"
                      className="size-4 rounded-full border-2 border-cream/30 border-t-cream motion-safe:animate-spin"
                    />
                  ) : null}
                  {pending ? "Keeping your notes…" : "Save reflection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
