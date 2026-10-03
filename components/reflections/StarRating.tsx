"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { RATINGS, type Rating } from "@/lib/reflections/types";

export const ratingWords: Record<Rating, string> = {
  1: "Not for me",
  2: "It had its moments",
  3: "A good read",
  4: "Loved it",
  5: "One for the ages",
};

function starLabel(rating: Rating): string {
  return `${rating} ${rating === 1 ? "star" : "stars"}, ${ratingWords[rating]}`;
}

type StarRatingInputProps = {
  name: string;
  value: Rating | null;
  onChange: (value: Rating | null) => void;
};

/** Five radio stars. Choosing the current star again clears the rating. */
export function StarRatingInput({ name, value, onChange }: StarRatingInputProps) {
  const [hovered, setHovered] = useState<Rating | null>(null);
  const shown = hovered ?? value;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <div className="-ml-2.5 flex" onPointerLeave={() => setHovered(null)}>
        {RATINGS.map((rating) => (
          <label
            key={rating}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setHovered(rating);
            }}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full has-focus-visible:outline-2 has-focus-visible:outline-forest"
          >
            <input
              type="radio"
              name={name}
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              onClick={() => {
                if (value === rating) onChange(null);
              }}
              aria-label={starLabel(rating)}
              className="sr-only"
            />
            <Icon
              name="star"
              className={`size-7 transition-[color,fill,transform] duration-200 ease-gentle ${
                shown !== null && rating <= shown ? "fill-ochre text-ochre" : "text-ink-muted/45"
              } ${hovered === rating ? "motion-safe:-translate-y-0.5" : ""}`}
            />
          </label>
        ))}
      </div>
      <p aria-hidden="true" className="min-h-7 font-serif text-lg text-ink-soft italic">
        {shown !== null ? ratingWords[shown] : ""}
      </p>
    </div>
  );
}

/** A saved rating, drawn small and read aloud as a sentence. */
export function StarRatingDisplay({ rating }: { rating: Rating }) {
  return (
    <span role="img" aria-label={`Rated ${rating} out of 5`} className="flex items-center gap-0.5">
      {RATINGS.map((star) => (
        <Icon
          key={star}
          name="star"
          className={`size-4 ${star <= rating ? "fill-ochre text-ochre" : "text-ink-muted/40"}`}
        />
      ))}
    </span>
  );
}
