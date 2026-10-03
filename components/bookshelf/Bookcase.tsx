import type { ReactNode } from "react";
import { DEFAULT_SHELF_PREFERENCES, wallKind, type ShelfPreferences } from "@/lib/shelf/catalogue";
import { AutoWrapLayout } from "./AutoWrapLayout";
import { FRAMES } from "./furniture/frames";
import { hasTopObjects, TopObjects } from "./furniture/TopObjects";

type BookcaseProps = {
  /** Items built with `shelfSlotClassName`, placed left to right; rows wrap automatically. */
  children?: ReactNode;
  /** Accessible name for the list of books. Omit for a purely decorative, empty bookcase. */
  label?: string;
  /** How the bookcase looks. Omitted means the default shelf. */
  appearance?: ShelfPreferences;
};

/**
 * The reader's bookcase: the wall, the chosen furniture, and the books flowing across its
 * boards with the reader's objects. Cosmetic only — it knows nothing about library data,
 * so shelf appearance can change without touching the collection.
 */
export function Bookcase({ children, label, appearance = DEFAULT_SHELF_PREFERENCES }: BookcaseProps) {
  const Frame = FRAMES[appearance.bookcase];
  const { decorations } = appearance;

  return (
    <div
      className="shelf-room -mx-3 -my-6 px-3 py-6 sm:-mx-6 sm:px-6"
      data-shelf={appearance.shelf}
      data-wall={appearance.wall}
      data-wall-kind={wallKind(appearance.wall)}
      data-light={appearance.lighting}
    >
      <Frame top={hasTopObjects(decorations) ? <TopObjects decorations={decorations} /> : null}>
        <AutoWrapLayout label={label} decorations={decorations}>
          {children}
        </AutoWrapLayout>
      </Frame>
    </div>
  );
}
