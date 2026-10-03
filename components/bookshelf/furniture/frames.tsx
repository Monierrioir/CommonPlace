import type { ReactNode } from "react";
import type { BookcaseStyleId } from "@/lib/shelf/catalogue";

/**
 * A bookcase frame owns the furniture: its outline, its boards and where top objects stand.
 * It never decides where books go; `children` is a layout that fills the shelves, and every
 * frame draws one board per `--row-h` so any layout's rows land on wood.
 */
export type FrameProps = {
  /** Objects for the top surface, or null when none are placed. */
  top: ReactNode;
  children: ReactNode;
};

const shelvesMinHeight = "min-h-[calc(var(--row-h)*var(--min-rows))]";

/** The original framed bookcase: crown, side posts, back panel and plinth. */
export function ClassicFrame({ top, children }: FrameProps) {
  return (
    <div className="bookcase" data-bookcase="classic">
      {top}
      <div aria-hidden="true" className="bookcase-crown relative z-10 -mx-1.5 h-4 rounded-t-[3px] sm:-mx-2 sm:h-5" />
      <div className="bookcase-sides">
        <div className={`bookcase-shelves ${shelvesMinHeight}`}>{children}</div>
      </div>
      <div aria-hidden="true" className="bookcase-plinth -mx-1.5 h-5 rounded-b-[2px] sm:-mx-2 sm:h-6" />
    </div>
  );
}

/** Separate boards on the wall, no carcass: the wall shows between and around every shelf. */
export function FloatingFrame({ top, children }: FrameProps) {
  return (
    <div className="bookcase px-2 sm:px-6 lg:px-10" data-bookcase="floating">
      {top ? (
        <>
          {top}
          <div aria-hidden="true" className="floating-ledge relative z-10 h-(--board-thick)" />
        </>
      ) : null}
      <div className={`floating-shelves ${shelvesMinHeight}`}>{children}</div>
    </div>
  );
}

/** A built-in nook: fluted sides, an arched opening with a keystone, deep backed shelves. */
export function ArchedFrame({ top, children }: FrameProps) {
  return (
    <div className="bookcase" data-bookcase="arched">
      {top}
      <div aria-hidden="true" className="bookcase-crown relative z-10 -mx-1.5 h-4 rounded-t-[3px] sm:-mx-2 sm:h-5" />
      <div className="arched-body">
        <div aria-hidden="true" className="arched-keystone" />
        <div aria-hidden="true" className="arched-vault" />
        <div className={`bookcase-shelves ${shelvesMinHeight}`}>{children}</div>
      </div>
      <div aria-hidden="true" className="bookcase-plinth -mx-1.5 h-5 rounded-b-[2px] sm:-mx-2 sm:h-6" />
    </div>
  );
}

export const FRAMES: Record<BookcaseStyleId, (props: FrameProps) => ReactNode> = {
  classic: ClassicFrame,
  floating: FloatingFrame,
  arched: ArchedFrame,
};
