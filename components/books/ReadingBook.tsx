import type { ReactNode } from "react";
import { ReadingProgress } from "./ReadingProgress";

type ReadingBookProps = {
  title: string;
  author: string | null;
  progress: number;
  progressColor: string;
  /** Rendered at full width inside a 2:3 stage, bottom-aligned. */
  cover: ReactNode;
};

export function ReadingBook({ title, author, progress, progressColor, cover }: ReadingBookProps) {
  return (
    <article className="group flex items-center gap-5 sm:max-w-[13.5rem] sm:flex-col sm:items-stretch sm:gap-6">
      <div className="relative isolate w-[5.5rem] shrink-0 pb-2 sm:w-full sm:pb-3">
        <div className="@container flex aspect-[2/3] items-end transition-transform duration-500 ease-gentle motion-safe:group-hover:-translate-y-1.5 motion-safe:group-hover:-rotate-1">
          <div className="relative w-full">{cover}</div>
        </div>
        <span
          aria-hidden="true"
          className="absolute inset-x-[10%] bottom-0 -z-10 h-3 rounded-[50%] bg-ink/25 blur-[6px] transition-[transform,opacity] duration-500 ease-gentle group-hover:scale-x-90 group-hover:opacity-60"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-lg leading-snug text-ink sm:text-xl">{title}</h3>
        <p className="mt-0.5 text-sm text-ink-soft">
          {author ?? <span className="italic">Author unknown</span>}
        </p>
        <div className="mt-3 sm:mt-4">
          <ReadingProgress title={title} progress={progress} color={progressColor} />
        </div>
      </div>
    </article>
  );
}
