// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import "server-only";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { nameKey } from "@/lib/enrichment/characters";
import { ENRICHMENT_USER_AGENT } from "@/lib/enrichment/http";

/**
 * Project Gutenberg's catalogue, which the project publishes for machine use and
 * dedicates to the public domain (https://www.gutenberg.org/policy/robot_access.html).
 * Too large for Next's data cache, so development keeps one copy on disk under
 * node_modules/.cache (git-ignored) and refreshes it weekly.
 */
const CATALOG_URL = "https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv.gz";
const CACHE_FILE = path.join(process.cwd(), "node_modules", ".cache", "commonplace-book-intelligence", "pg_catalog.csv.gz");
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type CatalogEntry = { ebookId: number; title: string; language: string; authors: string[]; translators: string[] };

let loaded: Promise<CatalogEntry[]> | null = null;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

async function download(): Promise<Buffer> {
  try {
    const info = await stat(CACHE_FILE);
    if (Date.now() - info.mtimeMs < MAX_AGE_MS) return await readFile(CACHE_FILE);
  } catch {
    // Not cached yet.
  }
  const response = await fetch(CATALOG_URL, { headers: { "User-Agent": ENRICHMENT_USER_AGENT }, cache: "no-store", signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`catalogue responded with ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await writeFile(CACHE_FILE, buffer);
  return buffer;
}

async function load(): Promise<CatalogEntry[]> {
  const rows = parseCsv(gunzipSync(await download()).toString("utf8"));
  const header = rows[0] ?? [];
  const column = (name: string) => header.indexOf(name);
  const [id, type, title, language, authors] = ["Text#", "Type", "Title", "Language", "Authors"].map(column);
  return rows.slice(1).flatMap((row): CatalogEntry[] => {
    if (row[type] !== "Text") return [];
    const people = (row[authors] ?? "").split(";").map((person) => person.trim()).filter(Boolean);
    return [
      {
        ebookId: Number(row[id]),
        title: (row[title] ?? "").replace(/\s+/g, " ").trim(),
        language: row[language] ?? "",
        authors: people.filter((person) => !/\[[^\]]+\]$/.test(person)),
        translators: people.filter((person) => /\[Translator\]$/.test(person)).map((person) => person.replace(/\s*\[Translator\]$/, "")),
      },
    ];
  });
}

export function gutenbergCatalog(): Promise<CatalogEntry[]> {
  loaded ??= load().catch((error: unknown) => {
    loaded = null;
    throw error;
  });
  return loaded;
}

/** Catalogue entries with the same title and an author sharing a surname. A lead, never proof of identity. */
export async function findInCatalog(title: string, authorNames: string[], language = "en"): Promise<{ ok: true; entries: CatalogEntry[] } | { ok: false; error: string }> {
  let catalog: CatalogEntry[];
  try {
    catalog = await gutenbergCatalog();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "catalogue unavailable" };
  }
  const titleKey = nameKey(title);
  const surnames = new Set(authorNames.map((name) => nameKey(name).split(" ").pop() ?? "").filter((name) => name.length >= 3));
  const entries = catalog.filter((entry) => {
    if (!entry.language.split(/[;,\s]+/).includes(language)) return false;
    const entryTitle = nameKey(entry.title.split(/[:\n]/)[0]);
    if (entryTitle !== titleKey) return false;
    return entry.authors.some((author) => surnames.has(nameKey(author.split(",")[0])));
  });
  return { ok: true, entries: entries.slice(0, 5) };
}
