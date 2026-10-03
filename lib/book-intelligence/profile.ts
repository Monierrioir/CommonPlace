// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import type { BookEnrichment } from "@/lib/enrichment/book";
import { nameKey } from "@/lib/enrichment/characters";
import type { ThemeKey } from "@/lib/enrichment/theme-vocabulary";
import type { MotifAnalysis } from "./motifs";
import type { CharacterCandidate, NameExtraction, PlaceCandidate } from "./names";
import type { TextTheme, ThemeAnalysis } from "./themes";

/**
 * A hypothetical Commonplace Book Profile, merged from structured metadata and the text
 * pipeline. Nothing here is stored. Merge rules depend on the facet's nature:
 *
 * factual (a character or place exists in the book)
 *   - two independent sources agree            → accepted, high
 *   - the text alone, with strong grammatical
 *     and frequency evidence                    → accepted, medium
 *   - one structured source, not found in text  → disputed (flag for review; never silently dropped)
 * interpretive (the book is concerned with a theme; a motif recurs)
 *   - structured metadata and text both support → accepted, high
 *   - the text alone, strongly                  → candidate: needs a second source or review
 *   - catalogue alone, weak in the text         → candidate, with the disagreement noted
 *   - anything weaker                           → internal only
 *   - motifs are always candidates until reviewed
 * No rule picks "whichever score is highest": sources are compared by what they are.
 */
export const PROFILE_MERGE_VERSION = "merge-v1";

export type ProfileSource = "openlibrary" | "wikidata" | "text";

export type Provenance = { source: ProfileSource; method: string; evidence: string };

export type ProfileFacet = {
  kind: "character" | "place" | "theme" | "motif";
  key: string;
  label: string;
  aliases: string[];
  nature: "factual" | "interpretive";
  confidence: "high" | "medium" | "low";
  status: "accepted" | "candidate" | "disputed" | "internal";
  reviewState: "unreviewed";
  provenance: Provenance[];
  notes: string[];
};

export type ComparisonRow = { label: string; structured: string; text: string; outcome: string };

export type BookProfileDraft = {
  facets: ProfileFacet[];
  comparison: { characters: ComparisonRow[]; places: ComparisonRow[]; themes: ComparisonRow[] };
  hypotheticalQuestions: { characters: number; themes: number; places: number };
};

function words(label: string): string[] {
  return nameKey(label).split(" ").filter(Boolean);
}

/** Exact key, one name's words inside the other's, or a shared distinctive word (5+ letters). */
function namesMatch(a: string[], b: string[]): string | null {
  for (const left of a) {
    for (const right of b) {
      const l = words(left);
      const r = words(right);
      if (l.join(" ") === r.join(" ")) return "same name";
      if (l.length > 0 && r.length > 0 && (l.every((word) => r.includes(word)) || r.every((word) => l.includes(word)))) return "one name inside the other";
    }
  }
  const distinctive = (names: string[]) => new Set(names.flatMap(words).filter((word) => word.length >= 5));
  const shared = [...distinctive(a)].filter((word) => distinctive(b).has(word));
  return shared.length > 0 ? `shared name word “${shared[0]}”` : null;
}

function mergeCharacters(structured: BookEnrichment["characters"], text: NameExtraction | null, facets: ProfileFacet[], rows: ComparisonRow[]) {
  const used = new Set<CharacterCandidate>();
  for (const character of structured.candidates) {
    const names = [character.label, ...character.aliases];
    // A shared surname alone is the weakest link (relatives share it), so it is tried last.
    const open = (text?.characters ?? []).filter((candidate) => !used.has(candidate));
    const matchOf = (candidate: CharacterCandidate) => namesMatch(names, candidate.forms.map((form) => form.form));
    const match = open.find((candidate) => { const how = matchOf(candidate); return how !== null && !how.startsWith("shared"); }) ?? open.find((candidate) => matchOf(candidate) !== null);
    const provenance: Provenance[] = character.sources.map((source) => ({
      source,
      method: source === "wikidata" ? "Wikidata P674" : "Open Library subject_people",
      evidence: source === "wikidata" ? `${character.wikidataQid ?? ""} (${character.provenance.wikidata?.sitelinks ?? 0} sitelinks)` : character.provenance.openLibrary?.names.join("; ") ?? "",
    }));
    if (match) {
      used.add(match);
      provenance.push({ source: "text", method: "names-v1", evidence: `${match.mentions} mentions in ${Math.round(match.spread * 100)}% of chapters; person cues ${match.personScore}` });
      facets.push({ kind: "character", key: nameKey(character.label), label: character.label, aliases: [...new Set([...character.aliases, ...match.forms.map((f) => f.form)])].slice(0, 8), nature: "factual", confidence: "high", status: "accepted", reviewState: "unreviewed", provenance, notes: [`text match: ${namesMatch(names, match.forms.map((f) => f.form))}`] });
      rows.push({ label: character.label, structured: `${character.confidence} (${character.sources.join(" + ")})`, text: `${match.label} — ${match.tier}, ${match.mentions} mentions`, outcome: "agree → accepted, high" });
    } else {
      const status = text ? "disputed" : character.confidence === "low" ? "internal" : "accepted";
      facets.push({ kind: "character", key: nameKey(character.label), label: character.label, aliases: character.aliases, nature: "factual", confidence: character.confidence, status, reviewState: "unreviewed", provenance, notes: text ? ["not found in the analysed text (spelling may differ in this translation)"] : [] });
      rows.push({ label: character.label, structured: `${character.confidence} (${character.sources.join(" + ")})`, text: text ? "not found" : "no text", outcome: text ? "structured only, absent from text → disputed" : "structured only" });
    }
  }
  for (const candidate of text?.characters ?? []) {
    if (used.has(candidate)) continue;
    const strong = candidate.tier !== "minor" && candidate.personScore >= 5;
    facets.push({
      kind: "character",
      key: nameKey(candidate.label),
      label: candidate.label,
      aliases: candidate.forms.map((form) => form.form).filter((form) => form !== candidate.label).slice(0, 8),
      nature: "factual",
      confidence: strong ? "medium" : "low",
      status: strong ? "accepted" : "internal",
      reviewState: "unreviewed",
      provenance: [{ source: "text", method: "names-v1", evidence: `${candidate.mentions} mentions, ${Math.round(candidate.spread * 100)}% of chapters, person cues ${candidate.personScore}` }],
      notes: [],
    });
    if (candidate.tier !== "minor") rows.push({ label: candidate.label, structured: "—", text: `${candidate.tier}, ${candidate.mentions} mentions`, outcome: strong ? "text only, strong → accepted, medium" : "text only, weak → internal" });
  }
}

function mergePlaces(structured: BookEnrichment["places"], text: NameExtraction | null, facets: ProfileFacet[], rows: ComparisonRow[]) {
  const used = new Set<PlaceCandidate>();
  const structuredPlaces = [
    ...structured.candidates.map((place) => ({ label: place.label, names: [place.label, ...place.aliases], detail: `${place.confidence}${place.isFictional ? ", fictional" : ""} (${place.sources.join(" + ")})`, broad: false })),
    ...structured.discarded.filter((item) => /broad/i.test(item.reason)).map((item) => ({ label: item.name, names: [item.name], detail: `discarded as broad [${item.source}]`, broad: true })),
  ];
  for (const place of structuredPlaces) {
    const match = text?.places.find((candidate) => !used.has(candidate) && namesMatch(place.names, candidate.forms.map((form) => form.form)));
    if (match) used.add(match);
    const agree = Boolean(match) && !place.broad;
    facets.push({
      kind: "place",
      key: nameKey(place.label),
      label: place.label,
      aliases: match ? match.forms.map((form) => form.form) : [],
      nature: "factual",
      confidence: agree ? "high" : place.broad ? "low" : "medium",
      status: place.broad ? "internal" : agree ? "accepted" : text ? "disputed" : "accepted",
      reviewState: "unreviewed",
      provenance: [
        { source: "wikidata", method: "structured place metadata", evidence: place.detail },
        ...(match ? [{ source: "text" as const, method: "names-v1", evidence: `${match.mentions} mentions, place cues ${match.placeScore}` }] : []),
      ],
      notes: place.broad ? ["broad region: not a question option"] : [],
    });
    rows.push({ label: place.label, structured: place.detail, text: match ? `${match.label} — ${match.tier}, ${match.mentions} mentions` : text ? "not found" : "no text", outcome: place.broad ? "broad → internal" : agree ? "agree → accepted, high" : "structured only" });
  }
  for (const candidate of text?.places ?? []) {
    if (used.has(candidate)) continue;
    const strong = candidate.tier !== "minor";
    facets.push({
      kind: "place",
      key: nameKey(candidate.label),
      label: candidate.label,
      aliases: candidate.forms.map((form) => form.form).filter((form) => form !== candidate.label),
      nature: "factual",
      confidence: strong ? "medium" : "low",
      status: strong ? "accepted" : "internal",
      reviewState: "unreviewed",
      provenance: [{ source: "text", method: "names-v1", evidence: `${candidate.mentions} mentions, ${Math.round(candidate.spread * 100)}% of chapters, place cues ${candidate.placeScore}` }],
      notes: ["real or fictional: unknown from the text alone", ...(candidate.derivedFromCharacter ? [`name built on “${candidate.derivedFromCharacter}”`] : [])],
    });
    rows.push({ label: candidate.label, structured: "—", text: `${candidate.tier}, ${candidate.mentions} mentions`, outcome: strong ? "text only → accepted, medium (fictional/real unknown)" : "text only, minor → internal" });
  }
}

function mergeThemes(structured: BookEnrichment["themes"], text: ThemeAnalysis | null, facets: ProfileFacet[], rows: ComparisonRow[]) {
  const byKey = new Map<ThemeKey, TextTheme>((text?.themes ?? []).map((theme) => [theme.key, theme]));
  const keys = new Set<ThemeKey>([...structured.candidates.map((theme) => theme.key), ...(text?.themes ?? []).filter((theme) => theme.support !== "none").map((theme) => theme.key)]);
  for (const key of keys) {
    const catalogued = structured.candidates.find((theme) => theme.key === key);
    const found = byKey.get(key);
    const catalogueSupports = catalogued && catalogued.confidence !== "low";
    const textStrong = found?.support === "strong";
    const textSupports = found?.support === "strong" || found?.support === "moderate";
    let status: ProfileFacet["status"] = "internal";
    let confidence: ProfileFacet["confidence"] = "low";
    let outcome = "weak everywhere → internal";
    const notes: string[] = [];
    if (catalogueSupports && textSupports) [status, confidence, outcome] = ["accepted", "high", "catalogue and text agree → accepted, high"];
    else if (textStrong) [status, confidence, outcome] = ["candidate", "medium", "text only, strong → candidate (needs a second source or review)"];
    else if (catalogueSupports) {
      [status, confidence, outcome] = ["candidate", "medium", "catalogue only, text weak → candidate, disagreement noted"];
      notes.push(`the text uses this theme's vocabulary ${found ? `${found.ratio}×` : "no more than"} the background rate`);
    } else if (catalogued && textSupports) [status, confidence, outcome] = ["candidate", "medium", "weak catalogue + text support → candidate"];
    const provenance: Provenance[] = [];
    if (catalogued) {
      for (const source of catalogued.sources) {
        provenance.push({
          source,
          method: source === "wikidata" ? "Wikidata P921 → vocabulary" : "Open Library subjects → vocabulary",
          evidence: source === "wikidata" ? catalogued.evidence.wikidata.map((c) => c.label).join("; ") : catalogued.evidence.openLibrary.join("; "),
        });
      }
    }
    if (found && found.support !== "none") {
      provenance.push({ source: "text", method: text?.method ?? "", evidence: `${found.support}: ${found.ratio}× background, G² ${found.logLikelihood}, ${Math.round(found.spread * 100)}% of chapters, cues ${found.topCues.slice(0, 4).map((c) => `${c.cue} ${c.count}`).join(", ")}` });
    }
    facets.push({ kind: "theme", key, label: found?.label ?? catalogued?.label ?? key, aliases: [], nature: "interpretive", confidence, status, reviewState: "unreviewed", provenance, notes });
    rows.push({
      label: found?.label ?? catalogued?.label ?? key,
      structured: catalogued ? `${catalogued.confidence} (${catalogued.sources.join(" + ")})` : "—",
      text: found ? `${found.support} (${found.ratio}×, G² ${found.logLikelihood})` : "—",
      outcome,
    });
  }
}

function mergeMotifs(motifs: MotifAnalysis | null, facets: ProfileFacet[]) {
  for (const motif of motifs?.candidates.slice(0, 12) ?? []) {
    facets.push({
      kind: "motif",
      key: motif.word,
      label: motif.word,
      aliases: [],
      nature: "interpretive",
      confidence: "low",
      status: "candidate",
      reviewState: "unreviewed",
      provenance: [{ source: "text", method: motifs?.method ?? "", evidence: `${motif.count}×, ${motif.ratio}× background, ${Math.round(motif.spread * 100)}% of chapters` }],
      notes: motif.italicInSource ? ["italic in the source — probably an untranslated term"] : [],
    });
  }
}

export function mergeProfile(structured: BookEnrichment, names: NameExtraction | null, themes: ThemeAnalysis | null, motifs: MotifAnalysis | null): BookProfileDraft {
  const facets: ProfileFacet[] = [];
  const comparison = { characters: [] as ComparisonRow[], places: [] as ComparisonRow[], themes: [] as ComparisonRow[] };
  mergeCharacters(structured.characters, names, facets, comparison.characters);
  mergePlaces(structured.places, names, facets, comparison.places);
  mergeThemes(structured.themes, themes, facets, comparison.themes);
  mergeMotifs(motifs, facets);
  const accepted = (kind: ProfileFacet["kind"]) => facets.filter((facet) => facet.kind === kind && facet.status === "accepted").length;
  return { facets, comparison, hypotheticalQuestions: { characters: accepted("character"), themes: accepted("theme"), places: accepted("place") } };
}
