// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import "server-only";
import { fetchJson, isRecord } from "./http";
import { stripTags, type SourceChapter, type SourceText } from "./source-text";

const API = "https://en.wikisource.org/w/api.php";
const MAX_CHAPTERS = 120;

/** Wikisource licence templates that assert public-domain status. Read from the page, never assumed. */
const PUBLIC_DOMAIN_TEMPLATE = /^Template:PD-/;

export type WikisourceWork = {
  title: string;
  url: string;
  /** Licence templates transcluded on the main page, e.g. Template:PD-old, Template:PD-US. */
  licenceTemplates: string[];
  publicDomainAsserted: boolean;
  chapterPages: string[];
  /** Linked from the contents but not yet transcribed on Wikisource. */
  missingPages: string[];
  skippedPages: string[];
};

async function missingTitles(pages: string[]): Promise<{ ok: true; missing: Set<string> } | { ok: false; error: string }> {
  const missing = new Set<string>();
  for (let start = 0; start < pages.length; start += 50) {
    const params = new URLSearchParams({ action: "query", prop: "info", format: "json", formatversion: "2", titles: pages.slice(start, start + 50).join("|") });
    const result = await fetchJson(`${API}?${params}`, { timeoutMs: 15000 });
    if (!result.ok) return result;
    const found = isRecord(result.data) && isRecord(result.data.query) && Array.isArray(result.data.query.pages) ? result.data.query.pages : null;
    if (!found) return { ok: false, error: "unexpected Wikisource response" };
    for (const page of found) if (isRecord(page) && page.missing === true && typeof page.title === "string") missing.add(page.title);
  }
  return { ok: true, missing };
}

type ParseResult = { ok: true; parse: Record<string, unknown> } | { ok: false; error: string };

async function parse(page: string, prop: string): Promise<ParseResult> {
  const params = new URLSearchParams({
    action: "parse",
    page,
    prop,
    format: "json",
    formatversion: "2",
    redirects: "1",
    disableeditsection: "1",
    disablelimitreport: "1",
  });
  const result = await fetchJson(`${API}?${params}`, { timeoutMs: 15000 });
  if (!result.ok) return result;
  if (!isRecord(result.data) || !isRecord(result.data.parse)) return { ok: false, error: "unexpected Wikisource response" };
  return { ok: true, parse: result.data.parse };
}

function titles(value: unknown, namespace?: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { title: string; ns: number } => isRecord(item) && typeof item.title === "string" && typeof item.ns === "number")
    .filter((item) => namespace === undefined || item.ns === namespace)
    .map((item) => item.title);
}

/** "Oblomov (1915)/2/10" → [2, 10]; null for non-numbered subpages such as "/Adv". */
function chapterPath(title: string, root: string): number[] | null {
  const rest = title.slice(root.length + 1);
  return /^\d+(?:\/\d+)*$/.test(rest) ? rest.split("/").map(Number) : null;
}

export async function describeWikisourceWork(title: string): Promise<{ ok: true; work: WikisourceWork } | { ok: false; error: string }> {
  const result = await parse(title, "links|templates");
  if (!result.ok) return result;
  const root = typeof result.parse.title === "string" ? result.parse.title : title;
  const templates = titles(result.parse.templates);
  const licenceTemplates = templates.filter((name) => PUBLIC_DOMAIN_TEMPLATE.test(name) || name === "Template:Translation license");

  const subpages = [...new Set(titles(result.parse.links, 0).filter((link) => link.startsWith(`${root}/`)))];
  const numbered = subpages
    .map((page) => ({ page, path: chapterPath(page, root) }))
    .filter((item): item is { page: string; path: number[] } => item.path !== null)
    .sort((a, b) => {
      for (let i = 0; i < Math.max(a.path.length, b.path.length); i++) {
        const diff = (a.path[i] ?? 0) - (b.path[i] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
  const linked = (numbered.length > 0 ? numbered.map((item) => item.page) : subpages).slice(0, MAX_CHAPTERS);
  const skippedPages = subpages.filter((page) => !linked.includes(page));
  const existence = await missingTitles(linked);
  if (!existence.ok) return existence;

  return {
    ok: true,
    work: {
      title: root,
      url: `https://en.wikisource.org/wiki/${encodeURIComponent(root.replace(/ /g, "_"))}`,
      licenceTemplates,
      publicDomainAsserted: licenceTemplates.some((name) => PUBLIC_DOMAIN_TEMPLATE.test(name)),
      chapterPages: linked.filter((page) => !existence.missing.has(page)),
      missingPages: linked.filter((page) => existence.missing.has(page)),
      skippedPages,
    },
  };
}

/** Story paragraphs from rendered chapter HTML; footnotes are returned separately as edition apparatus. */
function readChapterHtml(html: string): { label: string | null; paragraphs: string[]; italics: string[]; footnotes: string[] } {
  const label = /<div class="header-section-text">([\s\S]*?)<\/div>/.exec(html)?.[1];
  const footnotes = [...html.matchAll(/<span class="reference-text">([\s\S]*?)<\/span>\s*<\/li>/g)].map((match) => stripTags(match[1]));
  const body = html
    .replace(/<ol class="references">[\s\S]*?<\/ol>/g, "")
    .replace(/<sup[^>]*class="reference"[^>]*>[\s\S]*?<\/sup>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "");

  const paragraphs: string[] = [];
  const italics = new Set<string>();
  for (const match of body.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    for (const italic of match[1].matchAll(/<i>([\s\S]*?)<\/i>/g)) {
      for (const word of stripTags(italic[1]).toLowerCase().match(/\p{L}+(?:[-'’]\p{L}+)*/gu) ?? []) italics.add(word);
    }
    const text = stripTags(match[1]);
    if (text) paragraphs.push(text);
  }
  return { label: label ? stripTags(label) : null, paragraphs, italics: [...italics], footnotes };
}

/** Sequential on purpose: Wikimedia asks API clients not to parallelise requests. */
export async function fetchWikisourceText(work: WikisourceWork): Promise<{ ok: true; text: SourceText } | { ok: false; error: string }> {
  const chapters: SourceChapter[] = [];
  const apparatus: string[] = [];
  const skipped = [
    ...work.skippedPages.map((page) => `${page} — not a numbered chapter page`),
    ...work.missingPages.map((page) => `${page} — linked but not yet transcribed on Wikisource`),
  ];
  for (const page of work.chapterPages) {
    const result = await parse(page, "text");
    if (!result.ok) return { ok: false, error: `${page}: ${result.error}` };
    const html = typeof result.parse.text === "string" ? result.parse.text : "";
    const chapter = readChapterHtml(html);
    apparatus.push(...chapter.footnotes);
    if (chapter.paragraphs.length === 0) {
      skipped.push(`${page} — no story paragraphs`);
      continue;
    }
    chapters.push({ label: chapter.label ?? page.slice(work.title.length + 1), paragraphs: chapter.paragraphs, italics: chapter.italics });
  }
  return { ok: true, text: { chapters, apparatus, skipped } };
}
