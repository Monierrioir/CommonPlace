"use client";

import { createContext, use, type RefObject } from "react";
import { DEFAULT_SHELF_PREFERENCES, type ShelfPreferences } from "@/lib/shelf/catalogue";

export type ShelfSource = "saved" | "default" | "unavailable";

export type ShelfCustomizerValue = {
  saved: ShelfPreferences;
  source: ShelfSource;
  /** The draft while the editor is open; null otherwise. */
  draft: ShelfPreferences | null;
  editorId: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  notice: string | null;
  open: () => void;
  setDraft: (draft: ShelfPreferences) => void;
  /** Closes the editor. An outcome replaces the last saved shelf, e.g. after saving or restoring. */
  close: (outcome?: { saved: ShelfPreferences; source: ShelfSource; notice: string }) => void;
};

export const ShelfCustomizerContext = createContext<ShelfCustomizerValue | null>(null);

export function useShelfCustomizer(): ShelfCustomizerValue {
  const value = use(ShelfCustomizerContext);
  if (!value) throw new Error("useShelfCustomizer must be used inside <ShelfCustomizer>");
  return value;
}

/** What the shelf should look like right now: the live draft while customizing, otherwise the saved shelf. */
export function useShelfAppearance(): ShelfPreferences {
  const value = use(ShelfCustomizerContext);
  if (!value) return DEFAULT_SHELF_PREFERENCES;
  return value.draft ?? value.saved;
}
