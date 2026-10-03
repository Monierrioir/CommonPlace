import type { SupabaseClient } from "@supabase/supabase-js";
import { LibraryDataError } from "@/lib/library/data";
import { isEmptyReflection, type BookReflectionInput } from "./types";

/**
 * Supabase access for private book reflections. Same contract as the library
 * data layer: the caller passes the verified user id, RLS has the final word.
 */

function toAnswerColumns(reflection: BookReflectionInput) {
  return {
    rating: reflection.rating,
    favorite_character: reflection.favoriteCharacter,
    least_favorite_character: reflection.leastFavoriteCharacter,
    liked_aspects: reflection.likedAspects,
    emotions: reflection.emotions,
    would_live_there: reflection.wouldLiveThere,
    final_thought: reflection.finalThought,
  };
}

/**
 * Stores the reader's reflection on one of their library entries, replacing any
 * earlier one. A reflection with no answers is removed rather than stored.
 * Returns false if the entry is not on the reader's shelves.
 */
export async function saveBookReflection(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
  reflection: BookReflectionInput,
): Promise<boolean> {
  const { data: entry, error: entryError } = await supabase
    .from("user_library")
    .select("book_id")
    .eq("id", entryId)
    .eq("user_id", userId)
    .maybeSingle<{ book_id: string }>();
  if (entryError) throw new LibraryDataError("reflection entry lookup", entryError);
  if (!entry) return false;

  if (isEmptyReflection(reflection)) {
    const { error } = await supabase
      .from("book_reflections")
      .delete()
      .eq("user_id", userId)
      .eq("book_id", entry.book_id);
    if (error) throw new LibraryDataError("reflection delete", error);
    return true;
  }

  const answers = toAnswerColumns(reflection);

  // Insert-or-nothing needs no update rights on the key; the unique constraint settles races.
  const { data: inserted, error: insertError } = await supabase
    .from("book_reflections")
    .upsert(
      { user_id: userId, book_id: entry.book_id, ...answers },
      { onConflict: "user_id,book_id", ignoreDuplicates: true, defaultToNull: false },
    )
    .select("book_id")
    .overrideTypes<{ book_id: string }[], { merge: false }>();
  if (insertError) throw new LibraryDataError("reflection insert", insertError);
  if (inserted && inserted.length > 0) return true;

  const { data: updated, error: updateError } = await supabase
    .from("book_reflections")
    .update(answers)
    .eq("user_id", userId)
    .eq("book_id", entry.book_id)
    .select("book_id")
    .overrideTypes<{ book_id: string }[], { merge: false }>();
  if (updateError) throw new LibraryDataError("reflection update", updateError);
  return (updated?.length ?? 0) > 0;
}
