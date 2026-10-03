import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  isBookcaseStyleId,
  isLightingStyleId,
  isShelfStyleId,
  isWallStyleId,
  type ShelfPreferences,
} from "./catalogue";
import { parseDecorations } from "./validation";

/**
 * Supabase access for shelf preferences. Same contract as the library data layer:
 * the caller passes the request's server client and the verified user id; RLS has
 * the final word, and the explicit `user_id` filters are defence in depth.
 */

export class ShelfDataError extends Error {
  constructor(operation: string, cause?: PostgrestError | null) {
    super(`[shelf] ${operation} failed${cause?.code ? ` (${cause.code})` : ""}`);
    this.name = "ShelfDataError";
  }
}

type PreferencesRow = {
  bookcase_style: string;
  shelf_style: string;
  wall_style: string;
  lighting_style: string;
  decorations: unknown;
};

const COLUMNS = "bookcase_style, shelf_style, wall_style, lighting_style, decorations";

function toPreferences(row: PreferencesRow): ShelfPreferences | null {
  const decorations = parseDecorations(row.decorations);
  if (
    !isBookcaseStyleId(row.bookcase_style) ||
    !isShelfStyleId(row.shelf_style) ||
    !isWallStyleId(row.wall_style) ||
    !isLightingStyleId(row.lighting_style) ||
    !decorations
  ) {
    return null;
  }
  return {
    bookcase: row.bookcase_style,
    shelf: row.shelf_style,
    wall: row.wall_style,
    lighting: row.lighting_style,
    decorations,
  };
}

/**
 * The reader's saved shelf, or null when they have never saved one. A row this
 * version of the app cannot read (for example a preset added later) is also null.
 */
export async function loadShelfPreferences(supabase: SupabaseClient, userId: string): Promise<ShelfPreferences | null> {
  const { data, error } = await supabase
    .from("shelf_preferences")
    .select(COLUMNS)
    .eq("user_id", userId)
    .maybeSingle<PreferencesRow>();
  if (error) throw new ShelfDataError("load", error);
  return data ? toPreferences(data) : null;
}

/** Stores the reader's shelf, creating their row the first time. */
export async function saveShelfPreferences(
  supabase: SupabaseClient,
  userId: string,
  preferences: ShelfPreferences,
): Promise<void> {
  const values = {
    bookcase_style: preferences.bookcase,
    shelf_style: preferences.shelf,
    wall_style: preferences.wall,
    lighting_style: preferences.lighting,
    decorations: preferences.decorations.map(({ slot, item }) => ({ slot, item })),
  };

  // Insert-or-nothing needs no update rights on user_id; the primary key settles races.
  const { data: inserted, error: insertError } = await supabase
    .from("shelf_preferences")
    .upsert({ user_id: userId, ...values }, { onConflict: "user_id", ignoreDuplicates: true, defaultToNull: false })
    .select("user_id")
    .overrideTypes<{ user_id: string }[], { merge: false }>();
  if (insertError) throw new ShelfDataError("insert", insertError);
  if (inserted && inserted.length > 0) return;

  const { data: updated, error: updateError } = await supabase
    .from("shelf_preferences")
    .update(values)
    .eq("user_id", userId)
    .select("user_id")
    .overrideTypes<{ user_id: string }[], { merge: false }>();
  if (updateError) throw new ShelfDataError("update", updateError);
  if (!updated || updated.length === 0) throw new ShelfDataError("update (no row)");
}

/** Back to the default shelf: the row is removed, and a missing row means defaults. */
export async function deleteShelfPreferences(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase.from("shelf_preferences").delete().eq("user_id", userId);
  if (error) throw new ShelfDataError("delete", error);
}
