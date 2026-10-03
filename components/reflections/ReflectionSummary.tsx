import { useId } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  likedAspectLabels,
  reflectionEmotionLabels,
  worldAnswerLabels,
  type BookReflection,
} from "@/lib/reflections/types";
import { StarRatingDisplay } from "./StarRating";

type ReflectionSummaryProps = {
  reflection: BookReflection | null;
  onEdit: () => void;
};

const textButtonClass =
  "inline-flex min-h-11 items-center gap-2 text-sm text-ink-soft underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink-muted/60";

/** The reader's saved reflection inside the book panel, or a quiet invitation to write one. */
export function ReflectionSummary({ reflection, onEdit }: ReflectionSummaryProps) {
  const headingId = useId();

  const notes: { label: string; value: string }[] = [];
  if (reflection) {
    if (reflection.favoriteCharacter) notes.push({ label: "Stayed with you", value: reflection.favoriteCharacter });
    if (reflection.leastFavoriteCharacter) {
      notes.push({ label: "Tested your patience", value: reflection.leastFavoriteCharacter });
    }
    if (reflection.likedAspects.length > 0) {
      notes.push({
        label: "Drew you in",
        value: reflection.likedAspects.map((aspect) => likedAspectLabels[aspect]).join(", "),
      });
    }
    if (reflection.emotions.length > 0) {
      notes.push({
        label: "Left you feeling",
        value: reflection.emotions.map((emotion) => reflectionEmotionLabels[emotion]).join(", "),
      });
    }
    if (reflection.wouldLiveThere) {
      notes.push({ label: "Live in this world?", value: worldAnswerLabels[reflection.wouldLiveThere] });
    }
  }

  return (
    <section aria-labelledby={headingId} className="mt-6 border-t border-line/80 pt-5">
      <div className="flex items-center justify-between gap-4">
        <h3 id={headingId} className="text-xs font-medium tracking-[0.14em] text-ink-muted uppercase">
          Your reflection
        </h3>
        {reflection ? (
          <button type="button" onClick={onEdit} className={`-my-3 ${textButtonClass}`}>
            Edit reflection
          </button>
        ) : null}
      </div>

      {reflection ? (
        <div className="mt-3 space-y-3">
          {reflection.rating ? <StarRatingDisplay rating={reflection.rating} /> : null}
          {notes.length > 0 ? (
            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-y-1.5">
              {notes.map((note) => (
                <div key={note.label} className="contents">
                  <dt className="text-ink-muted">{note.label}</dt>
                  <dd className="mb-1.5 break-words text-ink sm:mb-0">{note.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {reflection.finalThought ? (
            <blockquote className="border-l-2 border-ochre/60 pl-3 font-serif leading-relaxed whitespace-pre-line break-words text-ink-soft italic">
              {reflection.finalThought}
            </blockquote>
          ) : null}
        </div>
      ) : (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4">
          <p className="font-serif text-ink-soft italic">Nothing written yet.</p>
          <button type="button" onClick={onEdit} className={textButtonClass}>
            <Icon name="sparkle" className="size-3.5 text-ochre" />
            Add reflection
          </button>
        </div>
      )}
    </section>
  );
}
