import type { ReactNode } from "react";

type SectionHeadingProps = {
  id: string;
  title: string;
  eyebrow?: string;
  action?: ReactNode;
};

export function SectionHeading({ id, title, eyebrow, action }: SectionHeadingProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line pb-3">
      <div>
        {eyebrow ? (
          <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-muted uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h2 id={id} className="mt-1 font-serif text-2xl leading-tight text-ink sm:text-[1.75rem]">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
