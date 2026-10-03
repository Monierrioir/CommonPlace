"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteShelfPreferences, saveShelfPreferences } from "./data";
import { parseShelfPreferences } from "./validation";

export type ShelfActionResult =
  | { ok: true }
  | { ok: false; reason: "signed-out" | "invalid" | "failed"; message: string };

const SIGNED_OUT: ShelfActionResult = {
  ok: false,
  reason: "signed-out",
  message: "Your session has ended. Please log in again.",
};

/** Saves the reader's shelf. Every id is checked against the catalogue; whose shelf it is comes only from the session. */
export async function saveShelfPreferencesAction(preferences: unknown): Promise<ShelfActionResult> {
  const parsed = parseShelfPreferences(preferences);
  if (!parsed) {
    return { ok: false, reason: "invalid", message: "That arrangement didn’t look right, so nothing was saved." };
  }

  const user = await getCurrentUser();
  if (!user) return SIGNED_OUT;

  try {
    const supabase = await createClient();
    await saveShelfPreferences(supabase, user.id, parsed);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "[shelf] save failed");
    return {
      ok: false,
      reason: "failed",
      message: "We couldn’t save your shelf just now. Your changes are still here — please try again.",
    };
  }

  refresh();
  return { ok: true };
}

/** Returns the reader to the default shelf by removing their saved preferences. */
export async function restoreDefaultShelfAction(): Promise<ShelfActionResult> {
  const user = await getCurrentUser();
  if (!user) return SIGNED_OUT;

  try {
    const supabase = await createClient();
    await deleteShelfPreferences(supabase, user.id);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "[shelf] restore failed");
    return { ok: false, reason: "failed", message: "We couldn’t restore the default shelf just now. Please try again." };
  }

  refresh();
  return { ok: true };
}
