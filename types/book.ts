export type Book = {
  id: string;
  title: string;
  author: string;
};

export type CoverMotif = "frame" | "dunes" | "dome";

/** Temporary CSS-drawn cover used until real cover artwork is available. */
export type CoverDesign = {
  motif: CoverMotif;
  background: string;
  ink: string;
  accent: string;
  ribbon: string;
};

export type CurrentRead = Book & {
  /** Whole-number percentage, 0–100. */
  progress: number;
  cover: CoverDesign;
};

export type SpineStyle = "plain" | "bands" | "label" | "foil";

export type ShelfBook = Book & {
  color: string;
  ink: string;
  spine: SpineStyle;
  /** Fraction of the shelf height, 0–1. */
  height: number;
  /** Multiplier of the base spine width. */
  thickness: number;
};
