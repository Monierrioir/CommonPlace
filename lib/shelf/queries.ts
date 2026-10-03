import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SHELF_PREFERENCES, type ShelfPreferences } from "./catalogue";
import { loadShelfPreferences } from "./data";

export type ShelfLoad = {
  preferences: ShelfPreferences;
  /** "default" when the reader has no saved shelf; "unavailable" when it couldn't be read. */
  source: "saved" | "default" | "unavailable";
};

/**
 * The signed-in reader's shelf appearance, read once per request. Never throws and
 * never writes: a reader who has not customized anything simply gets the defaults.
 */
export const getCurrentShelfPreferences = cache(async (): Promise<ShelfLoad> => {
  const user = await getCurrentUser();
  if (!user) return { preferences: DEFAULT_SHELF_PREFERENCES, source: "default" };

  try {
    const supabase = await createClient();
    const saved = await loadShelfPreferences(supabase, user.id);
    return saved ? { preferences: saved, source: "saved" } : { preferences: DEFAULT_SHELF_PREFERENCES, source: "default" };
  } catch (error) {
    console.error(error instanceof Error ? error.message : "[shelf] load failed");
    return { preferences: DEFAULT_SHELF_PREFERENCES, source: "unavailable" };
  }
});
