import { Children, type ReactNode } from "react";
import { decorationAt, type DecorationId, type DecorationPlacement, type SlotId } from "@/lib/shelf/catalogue";
import { ShelfObject } from "./ShelfDecorations";
import { shelfSlotClassName } from "./shelf-slot";

type AutoWrapLayoutProps = {
  /** Items built with `shelfSlotClassName`, placed left to right. */
  children?: ReactNode;
  /** Accessible name for the list of books. Omit for a purely decorative, empty shelf. */
  label?: string;
  decorations: readonly DecorationPlacement[];
};

/** Spacing for objects standing among the books; the defaults match the original bookend and plant. */
function rowSlotClassName(slot: SlotId, item: DecorationId): string {
  if (slot === "row-start") return item === "glazed-bookend" ? "mr-0.5" : "mr-2";
  if (slot === "row-middle") return item === "glazed-bookend" ? "mx-0.5" : "mx-2";
  return item === "glazed-bookend" ? "ml-0.5" : "mr-1 ml-auto pl-3";
}

/**
 * How books are arranged: in reading order, left to right, wrapping onto a new board whenever
 * a row is full, with the reader's row objects in the flow. It knows nothing about the
 * furniture; every bookcase draws one board per `--row-h` behind it.
 */
export function AutoWrapLayout({ children, label, decorations }: AutoWrapLayoutProps) {
  const Slot = label ? "li" : "div";
  const className = "shelf-layout flex flex-wrap content-start items-end px-1.5 sm:px-4";

  const rowObject = (slot: SlotId) => {
    const item = decorationAt(decorations, slot);
    if (!item) return null;
    return (
      <Slot key={slot} aria-hidden="true" className={`${shelfSlotClassName} pointer-events-none ${rowSlotClassName(slot, item)}`}>
        <ShelfObject id={item} mirrored={slot === "row-end" && item === "glazed-bookend"} />
      </Slot>
    );
  };

  // The middle object stands after the first half of the visible books.
  const books = Children.toArray(children);
  const middle = Math.ceil(books.length / 2);
  const contents = (
    <>
      {rowObject("row-start")}
      {books.slice(0, middle)}
      {rowObject("row-middle")}
      {books.slice(middle)}
      {rowObject("row-end")}
    </>
  );

  return label ? (
    <ul aria-label={label} className={className}>
      {contents}
    </ul>
  ) : (
    <div className={className}>{contents}</div>
  );
}
