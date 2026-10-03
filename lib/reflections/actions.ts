"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import type { LibraryActionResult } from "@/lib/library/actions";
import { isEntryId } from "@/lib/library/validation";
import { createClient } from "@/lib/supabase/server";
import { saveBookReflection } from "./data";
import { parseReflectionInput } from "./validation";

/**
 * Saves the reader's reflection on one of their books. Empty answers remove it.
 * The reflection is addressed by library entry; whose it is comes only from the session.
 */
export async function saveReflectionAction(entryId: unknown, reflection: unknown): Promise<LibraryActionResult> {
  const input = parseReflectionInput(reflection);
  if (!isEntryId(entryId) || !input) {
    return { ok: false, reason: "invalid", message: "Some of those answers didn’t look right, so nothing was saved." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "signed-out", message: "Your session has ended. Please log in again." };

  try {
    const supabase = await createClient();
    if (!(await saveBookReflection(supabase, user.id, entryId, input))) {
      return { ok: false, reason: "not-found", message: "That book is no longer on your shelves." };
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "[reflections] save failed");
    return {
      ok: false,
      reason: "failed",
      message: "We couldn’t keep your reflection just now. Your answers are still here — please try again.",
    };
  }

  refresh();
  return { ok: true };
}
