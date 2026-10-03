import { decorationAt, type DecorationPlacement } from "@/lib/shelf/catalogue";
import { ShelfObject } from "../ShelfDecorations";

const TOP_SLOTS = ["top-left", "top-center", "top-right"] as const;

/** The trailing plant sits right at the corner so its vine hangs clear of the books. */
const trailingCornerClassName: Record<(typeof TOP_SLOTS)[number], string> = {
  "top-left": "block -ml-(--corner-pull)",
  "top-center": "block",
  "top-right": "block -mr-(--corner-pull)",
};

export function hasTopObjects(decorations: readonly DecorationPlacement[]): boolean {
  return TOP_SLOTS.some((slot) => decorationAt(decorations, slot));
}

/**
 * Objects standing on the top surface of a bookcase. Each frame places this row on its own
 * top (a crown, a ledge) and sets `--top-inset` and `--corner-pull` for its proportions.
 */
export function TopObjects({ decorations }: { decorations: readonly DecorationPlacement[] }) {
  return (
    <div aria-hidden="true" className="bookcase-top pointer-events-none relative z-20 grid grid-cols-3 items-end px-(--top-inset)">
      {TOP_SLOTS.map((slot) => {
        const item = decorationAt(decorations, slot);
        return (
          <div
            key={slot}
            className={`flex min-w-0 items-end ${slot === "top-left" ? "justify-start" : slot === "top-right" ? "justify-end" : "justify-center"}`}
          >
            {item ? (
              <span className={item === "trailing-plant" ? trailingCornerClassName[slot] : undefined}>
                <ShelfObject id={item} mirrored={slot === "top-right"} />
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
