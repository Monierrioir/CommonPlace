import type { ReactNode } from "react";

type BookObjectProps = {
  children: ReactNode;
  className?: string;
};

/** Gives any cover a physical presence: page block, spine sheen and a restrained shadow. */
export function BookObject({ children, className = "" }: BookObjectProps) {
  return (
    <div className={`relative ${className}`}>
      <span
        aria-hidden="true"
        className="book-pages absolute inset-y-[3px] -right-[5px] w-[5px] rounded-r-[2px]"
      />
      <div className="relative overflow-hidden rounded-l-[2px] rounded-r-[4px] bg-parchment shadow-book transition-shadow duration-500 ease-gentle group-hover:shadow-book-lifted">
        {children}
        <span aria-hidden="true" className="cover-sheen pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}
