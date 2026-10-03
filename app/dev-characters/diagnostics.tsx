// TEMPORARY development diagnostics for book enrichment — delete with this folder.
import type { ReactNode } from "react";
import type { EnrichedPlace, PlaceEnrichment, PlaceSourceReport } from "@/lib/enrichment/places";
import type { ClassifiedSubject, EnrichedTheme, ThemeEnrichment, ThemeSourceReport } from "@/lib/enrichment/themes";
import type { QuestionPlan } from "@/lib/reflections/question-plan";

export const cell = "border-b border-line/70 px-2 py-1.5 align-top";

export function Heading({ children }: { children: ReactNode }) {
  return <h3 className="mt-8 font-serif text-xl text-ink">{children}</h3>;
}

export function Subheading({ children }: { children: ReactNode }) {
  return <h4 className="mt-5 text-xs font-medium tracking-[0.14em] text-ink-muted uppercase">{children}</h4>;
}

export function Facts({ facts }: { facts: [string, string][] }) {
  return (
    <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[11rem_1fr]">
      {facts.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-ink-muted">{label}</dt>
          <dd className="mb-1.5 break-words text-ink sm:mb-0">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Table({ headings, rows, minWidth = "40rem" }: { headings: string[]; rows: ReactNode[][]; minWidth?: string }) {
  if (rows.length === 0) return <p className="mt-2 text-sm text-ink-muted italic">None.</p>;
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
        <thead className="text-xs tracking-wide text-ink-muted uppercase">
          <tr>
            {headings.map((heading) => (
              <th key={heading} className={cell}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((value, column) => (
                <td key={column} className={cell}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function sourceText(report: ThemeSourceReport | PlaceSourceReport): string {
  if (report.status === "failed") return `FAILED — ${report.error}`;
  if (report.status === "no-item") return "no Wikidata item for this work";
  return "mapped" in report ? `ok — ${report.values} values, ${report.mapped} mapped to themes` : `ok — ${report.values} values, ${report.kept} kept`;
}

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

function outcomeText(item: ClassifiedSubject): ReactNode {
  switch (item.outcome.kind) {
    case "theme":
      return <span className="font-medium text-forest">→ theme: {item.outcome.theme}</span>;
    case "genre":
      return <span className="text-ink-soft">→ genre: {item.outcome.genre}</span>;
    default:
      return <span className="text-ink-muted">{item.outcome.reason}</span>;
  }
}

function ThemeTable({ themes }: { themes: EnrichedTheme[] }) {
  return (
    <Table
      headings={["#", "Theme", "Key", "Confidence", "Sources", "Wikidata evidence", "Open Library evidence (distinct headings)"]}
      rows={themes.map((theme) => [
        theme.rank,
        <span key="label" className="font-medium">{theme.label}</span>,
        theme.key,
        theme.confidence,
        theme.sources.join(" + "),
        theme.evidence.wikidata.map((concept) => `${concept.label} (${concept.qid})`).join("; ") || "—",
        theme.evidence.openLibrary.length ? `${theme.evidence.openLibrary.join("; ")} (${theme.evidence.openLibraryHeadings})` : "—",
      ])}
    />
  );
}

function InputList({ items }: { items: ClassifiedSubject[] }) {
  if (items.length === 0) return <p className="mt-2 text-sm text-ink-muted italic">None.</p>;
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {items.map((item, index) => (
        <li key={index} className="break-words">
          <span className="text-ink">{item.raw}</span>
          {item.wikidataQid ? <span className="text-ink-muted"> ({item.wikidataQid})</span> : null}
          {item.heading && item.heading !== item.raw.toLowerCase() ? <span className="text-ink-muted"> ⟨{item.heading}⟩</span> : null}{" "}
          — {outcomeText(item)}
        </li>
      ))}
    </ul>
  );
}

export function ThemeDiagnostics({ themes }: { themes: ThemeEnrichment }) {
  const wikidata = themes.inputs.filter((item) => item.source === "wikidata");
  const openLibrary = themes.inputs.filter((item) => item.source === "openlibrary");
  const unmapped = openLibrary.filter((item) => item.outcome.kind === "discarded");
  const mapped = openLibrary.filter((item) => item.outcome.kind !== "discarded");
  return (
    <>
      <Heading>Themes</Heading>
      <Facts
        facts={[
          ["Status", `${themes.status}${themes.confidence ? ` — ${themes.confidence} confidence` : ""}`],
          ["Open Library", sourceText(themes.sources.openLibrary)],
          ["Wikidata", sourceText(themes.sources.wikidata)],
          ["Genres (separate)", themes.genres.map((genre) => `${genre.label} [${genre.sources.join(" + ")}]`).join("; ") || "—"],
        ]}
      />
      <Subheading>Recommended shortlist ({themes.themes.length}) — high/medium only</Subheading>
      <ThemeTable themes={themes.themes} />
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-ink-soft">All mapped themes, incl. low ({themes.candidates.length})</summary>
        <ThemeTable themes={themes.candidates} />
      </details>
      <details className="mt-3" open>
        <summary className="cursor-pointer text-sm text-ink-soft">Raw Wikidata main subjects and genres ({wikidata.length})</summary>
        <InputList items={wikidata} />
      </details>
      <details className="mt-3" open>
        <summary className="cursor-pointer text-sm text-ink-soft">Open Library subjects that mapped to a theme or genre ({mapped.length})</summary>
        <InputList items={mapped} />
      </details>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-ink-soft">Open Library subjects discarded or unmapped ({unmapped.length})</summary>
        <InputList items={unmapped} />
      </details>
    </>
  );
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

function PlaceTable({ places }: { places: EnrichedPlace[] }) {
  return (
    <Table
      minWidth="48rem"
      headings={["#", "Place", "Confidence", "Sources", "Match", "Fictional", "Sitelinks", "Wikidata", "Open Library raw", "Aliases"]}
      rows={places.map((place) => [
        place.rank,
        <span key="label" className="font-medium">{place.label}</span>,
        place.confidence,
        place.sources.join(" + "),
        place.provenance.match ?? "—",
        place.isFictional ? `yes (${place.provenance.fictionalBy})` : "no",
        place.provenance.wikidata?.sitelinks ?? "—",
        place.wikidataQid ?? "—",
        place.provenance.openLibrary?.names.join("; ") ?? "—",
        place.aliases.join(" · ") || "—",
      ])}
    />
  );
}

export function PlaceDiagnostics({ places }: { places: PlaceEnrichment }) {
  return (
    <>
      <Heading>Places</Heading>
      <Facts
        facts={[
          ["Status", `${places.status}${places.confidence ? ` — ${places.confidence} confidence` : ""}`],
          ["Place question", places.eligibility.eligible ? "ELIGIBLE" : `not eligible — ${places.eligibility.reason}`],
          ["Open Library", sourceText(places.sources.openLibrary)],
          ["Wikidata", sourceText(places.sources.wikidata)],
          ["Notes", places.notes.join(" ") || "—"],
        ]}
      />
      <Subheading>Recommended shortlist ({places.places.length})</Subheading>
      <PlaceTable places={places.places} />
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-ink-soft">All cleaned specific candidates ({places.candidates.length})</summary>
        <PlaceTable places={places.candidates} />
      </details>
      <details className="mt-3" open>
        <summary className="cursor-pointer text-sm text-ink-soft">
          Raw inputs ({places.raw.openLibrary.length} Open Library, {places.raw.wikidata.length} Wikidata)
        </summary>
        <ul className="mt-2 space-y-1 text-sm">
          {places.raw.openLibrary.map((name, index) => (
            <li key={`ol-${index}`}>
              <span className="text-ink-muted">[openlibrary]</span> {name}
            </li>
          ))}
          {places.raw.wikidata.map((place) => (
            <li key={place.qid}>
              <span className="text-ink-muted">[wikidata P840]</span> {place.label ?? "(no label)"} ({place.qid}) —{" "}
              {place.types.join(", ") || "no type"}
              {place.isFictional ? " · fictional" : ""}
              {place.isBroad ? " · broad" : ""}
            </li>
          ))}
        </ul>
      </details>
      <details className="mt-3" open={places.discarded.length > 0}>
        <summary className="cursor-pointer text-sm text-ink-soft">Discarded or merged ({places.discarded.length})</summary>
        <ul className="mt-2 space-y-1 text-sm">
          {places.discarded.map((item, index) => (
            <li key={index} className="break-words">
              <span className="font-medium text-ink">{item.name}</span> <span className="text-ink-muted">[{item.source}]</span> —{" "}
              {item.reason}
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}

// ---------------------------------------------------------------------------
// Question plan
// ---------------------------------------------------------------------------

export function PlanDiagnostics({ plan }: { plan: QuestionPlan }) {
  return (
    <>
      <Heading>Question plan (copy v{plan.copyVersion})</Heading>
      <Table
        headings={["Question", "Prompt", "Mode", "Options / reason"]}
        rows={[
          ...plan.questions.map((question) => [
            question.id,
            question.prompt,
            <span key="mode" className={question.mode === "choices" ? "font-medium text-forest" : undefined}>
              {question.mode}
            </span>,
            question.mode === "choices" ? question.options.join(" · ") : question.mode === "free-text" ? `fallback: ${question.reason}` : "—",
          ]),
          ...plan.omitted.map((question) => [
            question.id,
            "—",
            <span key="mode" className="text-ink-muted">omitted</span>,
            question.reason,
          ]),
        ]}
      />
    </>
  );
}
