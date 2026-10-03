// TEMPORARY development diagnostics for book enrichment — delete with this folder.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { castFromEnrichment } from "@/lib/enrichment/cast";
import type { EnrichedCharacter, SourceReport } from "@/lib/enrichment/characters";
import { cell, Facts, Heading, PlaceDiagnostics, PlanDiagnostics, Subheading, ThemeDiagnostics } from "./diagnostics";
import { buildReports, type Report, type SearchParams } from "./inputs";
import { ReaderPreview } from "./ReaderPreview";

export const metadata: Metadata = {
  title: "Book enrichment (dev)",
  robots: { index: false, follow: false },
};

function sourceText(report: SourceReport): string {
  return report.status === "ok" ? `ok — ${report.candidates} raw, ${report.kept} kept` : `FAILED — ${report.error}`;
}

function CharacterTable({ characters }: { characters: EnrichedCharacter[] }) {
  if (characters.length === 0) return <p className="text-sm text-ink-muted italic">None.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
        <thead className="text-xs tracking-wide text-ink-muted uppercase">
          <tr>
            {["#", "Character", "Confidence", "Sources", "Match", "OL pos", "Sitelinks", "Statements", "Wikidata", "Aliases"].map((heading) => (
              <th key={heading} className={cell}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {characters.map((character) => (
            <tr key={`${character.rank}-${character.label}`}>
              <td className={`${cell} tabular-nums`}>{character.rank}</td>
              <td className={`${cell} font-medium`}>{character.label}</td>
              <td className={cell}>{character.confidence}</td>
              <td className={cell}>{character.sources.join(" + ")}</td>
              <td className={cell}>{character.provenance.match ?? "—"}</td>
              <td className={`${cell} tabular-nums`}>{character.provenance.openLibrary?.position ?? "—"}</td>
              <td className={`${cell} tabular-nums`}>{character.provenance.wikidata?.sitelinks ?? "—"}</td>
              <td className={`${cell} tabular-nums`}>{character.provenance.wikidata?.statements ?? "—"}</td>
              <td className={cell}>{character.wikidataQid ?? "—"}</td>
              <td className={`${cell} text-ink-soft`}>{character.aliases.join(" · ") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportSection({ report, saved, loading }: { report: Report; saved: string; loading: boolean }) {
  const { target, result, plan } = report;
  const characters = result.characters;
  const cast = castFromEnrichment(characters);
  const work = characters.work;

  return (
    <section className="border-t border-line py-8">
      <h2 className="font-serif text-2xl text-ink">{work.title ?? "Untitled work"}</h2>
      <Facts
        facts={[
          ["Origin", target.origin],
          ["Stored work id", work.storedWorkId],
          ["Resolved work id", work.resolvedWorkId ?? "—"],
          ["Redirect chain", work.redirectChain.join(" → ")],
          [
            "Wikidata items",
            work.wikidataItems
              .map((item) => `${item.qid} ${item.label ?? ""}${item.matchedOpenLibraryId ? ` (via ${item.matchedOpenLibraryId})` : ""}`)
              .join("; ") || "none matched",
          ],
          ["Wikidata match", work.wikidataMatch ?? "—"],
          ["Notes", characters.notes.join(" ") || "—"],
        ]}
      />

      <PlanDiagnostics plan={plan} />

      <Heading>Characters</Heading>
      <Facts
        facts={[
          ["Status", `${characters.status}${characters.confidence ? ` — ${characters.confidence} confidence` : ""}`],
          ["Open Library", sourceText(characters.sources.openLibrary)],
          ["Wikidata", sourceText(characters.sources.wikidata)],
          ["Merged candidates", String(characters.candidates.length)],
        ]}
      />
      <Subheading>Recommended shortlist ({characters.characters.length})</Subheading>
      <div className="mt-2">
        <CharacterTable characters={characters.characters} />
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-ink-soft">All merged candidates ({characters.candidates.length})</summary>
        <div className="mt-2">
          <CharacterTable characters={characters.candidates} />
        </div>
      </details>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-ink-soft">Discarded ({characters.discarded.length})</summary>
        <ul className="mt-2 space-y-1 text-sm">
          {characters.discarded.map((item, index) => (
            <li key={index} className="break-words">
              <span className="font-medium text-ink">{item.name}</span>{" "}
              <span className="text-ink-muted">[{item.source}]</span> — {item.reason}
            </li>
          ))}
        </ul>
      </details>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-ink-soft">
          Reader view ({cast ? `cast of ${cast.characters.length}` : "free text — no trustworthy cast"})
        </summary>
        <div className="mt-4">
          <ReaderPreview
            title={work.title ?? "Untitled work"}
            workId={target.workId}
            coverUrl={target.coverUrl ?? null}
            cast={cast}
            savedFavorite={saved}
            loading={loading}
          />
        </div>
      </details>

      <ThemeDiagnostics themes={result.themes} />
      <PlaceDiagnostics places={result.places} />
    </section>
  );
}

export default async function BookEnrichmentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const reports = await buildReports(params);
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="font-serif text-3xl text-ink">Book enrichment — development check</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Temporary diagnostic page. Read-only: nothing is written to the database. Without parameters it checks the default
        test books found through the app’s own search.
      </p>

      <form className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          Work ids (comma separated)
          <input name="works" defaultValue={value("works")} className="h-10 rounded-sm border border-line bg-cream px-2" />
        </label>
        <label className="flex flex-col gap-1">
          Search queries (separated by |)
          <input name="q" defaultValue={value("q")} className="h-10 rounded-sm border border-line bg-cream px-2" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="library" value="1" defaultChecked={value("library") === "1"} />
          Include books from my library (when signed in)
        </label>
        <label className="flex flex-col gap-1">
          Simulate an outage
          <select name="simulate" defaultValue={value("simulate")} className="h-10 rounded-sm border border-line bg-cream px-2">
            <option value="">None</option>
            <option value="openlibrary">Open Library unreachable</option>
            <option value="wikidata">Wikidata unreachable</option>
          </select>
        </label>
        <button type="submit" className="h-10 rounded-sm bg-ink px-4 font-medium text-cream sm:col-span-2 sm:justify-self-start">
          Check
        </button>
      </form>

      <div className="mt-8">
        {reports.length === 0 ? <p className="text-ink-muted">No works to check.</p> : null}
        {reports.map((report) => (
          <ReportSection
            key={report.target.workId}
            report={report}
            saved={value("saved")}
            loading={value("preview") === "loading"}
          />
        ))}
      </div>
    </Container>
  );
}
