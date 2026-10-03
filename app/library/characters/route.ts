import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { castFromEnrichment } from "@/lib/enrichment/cast";
import { enrichCharacters, type EnrichmentOptions } from "@/lib/enrichment/characters";
import { workIdForEntry } from "@/lib/library/data";
import { isEntryId } from "@/lib/library/validation";
import { createClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "private, no-store" };
const KEEP_FOR_AN_HOUR = { "Cache-Control": "private, max-age=3600" };

function outageToSimulate(request: NextRequest): EnrichmentOptions["simulateFailure"] {
  if (process.env.NODE_ENV !== "development") return undefined;
  const value = request.nextUrl.searchParams.get("simulate");
  return value === "openlibrary" || value === "wikidata" ? value : undefined;
}

/**
 * The cast of a book on the signed-in reader's shelves, for the Finished Experience.
 * Only the reader's own entries can be looked up; external services are called from here, never the browser.
 */
export async function GET(request: NextRequest) {
  const entryId = request.nextUrl.searchParams.get("entry");
  if (!isEntryId(entryId)) return NextResponse.json({ cast: null }, { status: 400, headers: NO_STORE });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ cast: null }, { status: 401, headers: NO_STORE });

  try {
    const supabase = await createClient();
    const workId = await workIdForEntry(supabase, user.id, entryId);
    if (!workId) return NextResponse.json({ cast: null }, { status: 404, headers: NO_STORE });

    const enrichment = await enrichCharacters(workId, { simulateFailure: outageToSimulate(request) });
    const complete = enrichment.sources.openLibrary.status === "ok" && enrichment.sources.wikidata.status === "ok";
    return NextResponse.json({ cast: castFromEnrichment(enrichment) }, { headers: complete ? KEEP_FOR_AN_HOUR : NO_STORE });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "[characters] lookup failed");
    return NextResponse.json({ cast: null }, { status: 502, headers: NO_STORE });
  }
}
