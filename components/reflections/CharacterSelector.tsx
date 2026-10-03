"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { findCastMember, type CastMember } from "@/lib/reflections/cast";
import { REFLECTION_LIMITS } from "@/lib/reflections/types";
import { lineFieldClass, questionClass } from "./reflection-styles";

type Choice = { kind: "none" } | { kind: "member"; index: number } | { kind: "other" };

function initialChoice(members: readonly CastMember[], value: string): Choice {
  if (!value.trim()) return { kind: "none" };
  const index = findCastMember(members, value);
  return index === null ? { kind: "other" } : { kind: "member", index };
}

type Side = "left" | "right";

/**
 * "around": names alternate either side of the cover. "beside": one column to its left, for casts
 * whose names are too long to share the width without wrapping.
 */
type Layout = "around" | "beside";

/** Longer names than this switch the constellation to "beside". */
const LONG_NAME = 22;
/** Compact lists use two columns on wider screens only when every name fits a column on one line. */
const SHORT_NAME = 18;

/** How far a name at either end of a side is drawn in towards the cover, so each side curves like a bracket. */
function inset(position: number, count: number, maxRem: number): string {
  const middle = (count - 1) / 2;
  const fromMiddle = middle > 0 ? Math.abs(position - middle) / middle : 0;
  return `${(fromMiddle * maxRem).toFixed(2)}rem`;
}

/** Desktop placement in rank order; "around" puts the right side half a step lower than the left. */
function placement(index: number, total: number, layout: Layout): { side: Side; style: CSSProperties } {
  if (layout === "beside") {
    return {
      side: "left",
      style: { "--cast-row": `${index + 1}`, "--cast-inset": inset(index, total, 1.5) } as CSSProperties,
    };
  }
  const leftCount = Math.ceil(total / 2);
  const side: Side = index % 2 === 0 ? "left" : "right";
  const position = Math.floor(index / 2);
  const start = side === "left" ? position * 2 + 1 : position * 2 + 2;
  return {
    side,
    style: {
      "--cast-row": `${start} / span 2`,
      "--cast-inset": inset(position, side === "left" ? leftCount : total - leftCount, 2.25),
    } as CSSProperties,
  };
}

function constellationRows(total: number, layout: Layout): number {
  if (layout === "beside") return total;
  const leftCount = Math.ceil(total / 2);
  return Math.max(leftCount * 2, (total - leftCount) * 2 + 1);
}

/** Dotted leader towards the cover (or the mark); a pencil line is drawn over it when chosen. */
function Leader({ side, className = "" }: { side: Side | null; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`dot-leader relative h-[3px] min-w-5 flex-1 text-ink-muted/45 transition-colors group-hover:text-ink-muted/80 ${className}`}
    >
      <span
        className={`absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 scale-x-0 rounded-full bg-ochre transition-transform duration-500 ease-gentle group-has-checked:scale-x-100 ${
          side === "right" ? "origin-left md:origin-right" : "origin-left"
        }`}
      />
    </span>
  );
}

/** A dotted ring that is circled in pencil when chosen. */
function Mark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={`size-6 shrink-0 self-center ${className}`}>
      <circle
        cx="12"
        cy="12"
        r="6.5"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeDasharray="0.1 2.6"
        className="stroke-ink-muted/60 transition-opacity duration-300 group-hover:stroke-ink-muted group-has-checked:opacity-0"
      />
      <path
        d="M6.4 14.2c-1-3.7 1.4-7.6 5.3-8.2 3.8-.6 7 1.9 7.2 5.6.2 3.8-2.7 6.7-6.4 6.8-2.3.1-4.4-1-5.5-2.9"
        pathLength={1}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="1"
        className="stroke-ochre transition-[stroke-dashoffset] duration-500 ease-gentle [stroke-dashoffset:1] group-has-checked:[stroke-dashoffset:0]"
      />
      <circle
        cx="12"
        cy="12"
        r="2.4"
        className="origin-center scale-0 fill-ink transition-transform duration-300 [transform-box:fill-box] group-has-checked:scale-100"
      />
    </svg>
  );
}

type CharacterSelectorProps = {
  id: string;
  question: string;
  hint: string;
  members: readonly CastMember[];
  /** The answer as it will be saved: a chosen character's label, or whatever was typed for Someone else. */
  value: string;
  onChange: (value: string) => void;
  otherPlaceholder: string;
  /** The book cover. When given, wider screens arrange the cast around it; otherwise a programme list. */
  anchor?: ReactNode;
  /** A quieter, smaller list for a second question over the same cast. */
  compact?: boolean;
};

/**
 * A single-choice question over a book's cast, plus "Someone else" with a free-text name.
 * Underneath the programme styling it is a plain radio group, so keyboard and screen readers
 * work natively. Choosing a character already chosen clears the answer, as elsewhere in the reflection.
 */
export function CharacterSelector({
  id,
  question,
  hint,
  members,
  value,
  onChange,
  otherPlaceholder,
  anchor,
  compact = false,
}: CharacterSelectorProps) {
  const [choice, setChoice] = useState<Choice>(() => initialChoice(members, value));
  const [customText, setCustomText] = useState(() => (initialChoice(members, value).kind === "other" ? value : ""));
  const otherRef = useRef<HTMLInputElement>(null);
  const focusOther = useRef(false);
  const pointerOnOther = useRef(false);

  const constellation = Boolean(anchor);
  const longest = Math.max(...members.map((member) => member.label.length));
  const layout: Layout = longest > LONG_NAME ? "beside" : "around";
  const twoColumns = !constellation && longest <= SHORT_NAME;
  const name = `${id}-cast`;
  const hintId = `${id}-hint`;
  const otherId = `${id}-other`;
  const rows = constellationRows(members.length, layout);

  useEffect(() => {
    const shouldFocus = choice.kind === "other" && focusOther.current;
    focusOther.current = false;
    if (!shouldFocus) return;
    // After the browser has finished focusing the radio that the label click activated.
    const frame = requestAnimationFrame(() => otherRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [choice]);

  function clear() {
    setChoice({ kind: "none" });
    onChange("");
  }

  function chooseMember(index: number) {
    setChoice({ kind: "member", index });
    onChange(members[index].label);
  }

  function chooseOther() {
    setChoice({ kind: "other" });
    onChange(customText);
  }

  function clickOther() {
    if (choice.kind === "other") clear();
    // Pointer choices move straight to the name field; keyboard users reach it with Tab.
    else if (pointerOnOther.current) focusOther.current = true;
    pointerOnOther.current = false;
  }

  const rowClass = `group flex cursor-pointer items-baseline-last gap-3 rounded-sm py-2.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-forest ${
    compact ? "min-h-11" : "min-h-12"
  }`;
  const nameClass = `min-w-0 font-serif leading-snug text-ink-soft underline decoration-transparent decoration-2 underline-offset-[6px] transition-[color,text-decoration-color] duration-300 group-hover:text-ink group-hover:decoration-line group-has-checked:text-ink group-has-checked:decoration-ochre ${
    compact ? "text-base sm:text-[1.0625rem]" : "text-lg"
  }`;

  const gridClass = !constellation
    ? `grid grid-cols-1 ${twoColumns ? "md:grid-cols-2 md:gap-x-10" : ""}`
    : `grid grid-cols-1 md:mx-[calc((100%_-_min(44rem,_100vw_-_4rem))_/_2)] ${
        layout === "around" ? "md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]" : "md:grid-cols-[minmax(0,1fr)_auto]"
      }`;
  const otherRowClass = !constellation
    ? ""
    : layout === "around"
      ? "md:col-[1/-1] md:row-(--other-row) md:mt-4 md:justify-self-center"
      : "md:col-start-1 md:row-(--other-row) md:mt-2";
  const otherFieldClass = !constellation
    ? twoColumns
      ? "md:col-span-2"
      : ""
    : layout === "around"
      ? "md:col-[1/-1] md:row-(--other-field-row) md:mx-auto md:w-full md:max-w-sm"
      : "md:col-start-1 md:row-(--other-field-row) md:max-w-sm";

  return (
    <fieldset aria-describedby={hintId} className="min-w-0">
      <legend className={questionClass}>{question}</legend>
      <p id={hintId} className="mt-1 text-sm text-ink-muted">
        {hint}
      </p>

      <div
        className={`${gridClass} ${compact ? "mt-2" : "mt-4 md:mt-8"}`}
        style={
          {
            "--cover-rows": `1 / span ${rows}`,
            "--other-row": `${rows + 1}`,
            "--other-field-row": `${rows + 2}`,
          } as CSSProperties
        }
      >
        {anchor ? (
          <div
            aria-hidden="true"
            className="hidden md:col-start-2 md:row-(--cover-rows) md:flex md:items-center md:justify-center md:px-5"
          >
            {anchor}
          </div>
        ) : null}

        {members.map((member, index) => {
          const { side, style } = placement(index, members.length, layout);
          const selected = choice.kind === "member" && choice.index === index;
          const sideClass = !constellation
            ? ""
            : side === "left"
              ? "md:col-start-1 md:row-(--cast-row) md:self-center md:ps-(--cast-inset)"
              : "md:col-start-3 md:row-(--cast-row) md:flex-row-reverse md:self-center md:pe-(--cast-inset) md:text-right";
          return (
            <label key={member.label} className={`${rowClass} ${sideClass}`} style={constellation ? style : undefined}>
              <input
                type="radio"
                name={name}
                value={member.label}
                checked={selected}
                onChange={() => chooseMember(index)}
                onClick={() => {
                  if (selected) clear();
                }}
                className="sr-only"
              />
              <span className={nameClass}>{member.label}</span>
              <Leader side={constellation ? side : null} />
              <Mark className={constellation ? "md:hidden" : ""} />
            </label>
          );
        })}

        <label
          onPointerDown={() => {
            pointerOnOther.current = true;
          }}
          className={`${rowClass} ${otherRowClass}`}
        >
          <input
            type="radio"
            name={name}
            value=""
            checked={choice.kind === "other"}
            onChange={chooseOther}
            onClick={clickOther}
            className="sr-only"
          />
          <span className={`${nameClass} italic`}>Someone else</span>
          <Leader side={null} className={constellation ? "md:hidden" : ""} />
          <Mark className={constellation ? "md:hidden" : ""} />
        </label>

        {choice.kind === "other" ? (
          <div className={`motion-safe:animate-unfold ${otherFieldClass}`}>
            <label htmlFor={otherId} className="sr-only">
              {`${question} Someone else’s name`}
            </label>
            <input
              ref={otherRef}
              id={otherId}
              type="text"
              autoComplete="off"
              maxLength={REFLECTION_LIMITS.characterName}
              value={customText}
              onChange={(event) => {
                setCustomText(event.target.value);
                onChange(event.target.value);
              }}
              placeholder={otherPlaceholder}
              className={`${lineFieldClass} ${constellation && layout === "around" ? "md:text-center" : ""}`}
            />
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}
