"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { REFLECTION_LIMITS } from "@/lib/reflections/types";
import type { CastState } from "./book-cast";
import { CharacterSelector } from "./CharacterSelector";
import { lineFieldClass, questionClass } from "./reflection-styles";

const PLACEHOLDER_WIDTHS = ["42%", "55%", "36%"];

type CharacterQuestionProps = {
  id: string;
  question: string;
  /** Shown under the question when the cast is offered. */
  hint: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  cast: CastState;
  anchor?: ReactNode;
  compact?: boolean;
};

/**
 * One character question: the book's cast when a trustworthy one is known, otherwise the
 * plain name field. The question never waits on the lookup — the reader can always type instead.
 */
export function CharacterQuestion({
  id,
  question,
  hint,
  placeholder,
  value,
  onChange,
  cast,
  anchor,
  compact,
}: CharacterQuestionProps) {
  const [writing, setWriting] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const fieldId = `${id}-name`;

  useEffect(() => {
    if (writing) fieldRef.current?.focus();
  }, [writing]);

  if (!writing && cast.status === "ready") {
    return (
      <CharacterSelector
        id={id}
        question={question}
        hint={hint}
        members={cast.cast.characters}
        value={value}
        onChange={onChange}
        otherPlaceholder={placeholder}
        anchor={anchor}
        compact={compact}
      />
    );
  }

  if (!writing && cast.status === "loading") {
    return (
      <div aria-busy="true">
        <p className={questionClass}>{question}</p>
        <p className="mt-1 text-sm text-ink-muted italic">Gathering the cast…</p>
        <div aria-hidden="true" className="mt-4 space-y-5">
          {PLACEHOLDER_WIDTHS.slice(0, compact ? 2 : 3).map((width) => (
            <div key={width} className="flex items-center gap-3">
              <span className="h-2 rounded-sm bg-line/70 motion-safe:animate-pulse" style={{ width }} />
              <span className="dot-leader h-[3px] flex-1 text-ink-muted/25" />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setWriting(true)}
          className="mt-3 min-h-11 text-sm text-ink-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink"
        >
          Write a name instead
        </button>
      </div>
    );
  }

  return (
    <>
      <label htmlFor={fieldId} className={questionClass}>
        {question}
      </label>
      <input
        ref={fieldRef}
        id={fieldId}
        type="text"
        autoComplete="off"
        maxLength={REFLECTION_LIMITS.characterName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={lineFieldClass}
      />
    </>
  );
}
