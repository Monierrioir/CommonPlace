import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listLibraryEntries, savedStatusesForWorks, type SavedStatus } from "./data";
import type { LibraryEntry } from "./types";

export type LibraryLoad =
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "ok"; entries: LibraryEntry[] };

/** The signed-in reader's shelves, read once per request. Never throws. */
export const getCurrentUserLibrary = cache(async (): Promise<LibraryLoad> => {
  const user = await getCurrentUser();
  if (!user) return { status: "signed-out" };

  try {
    const supabase = await createClient();
    return { status: "ok", entries: await listLibraryEntries(supabase, user.id) };
  } catch (error) {
    console.error(error instanceof Error ? error.message : "[library] list failed");
    return { status: "error" };
  }
});

/**
 * Which of these works the signed-in reader already owns. Null when signed out;
 * an empty map if the lookup fails, so search keeps working.
 */
export async function getSavedStatuses(workIds: readonly string[]): Promise<Map<string, SavedStatus> | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const supabase = await createClient();
    return await savedStatusesForWorks(supabase, user.id, workIds);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "[library] saved statuses failed");
    return new Map();
  }
}
