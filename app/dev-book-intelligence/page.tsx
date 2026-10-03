// TEMPORARY development diagnostics for Book Intelligence research — delete with this folder.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import type { BookIntelligenceReport } from "@/lib/book-intelligence/analyze";
import type { NameGroup } from "@/lib/book-intelligence/names";
import type { ProfileFacet } from "@/lib/book-intelligence/profile";
import { cell, Facts, Heading, Subheading } from "../dev-characters/diagnostics";
import { buildReport, type SearchParams } from "./inputs";

export const metadata: Metadata = {
  title: "Book intelligence (dev)",
  robots: { index: false, follow: false },
};

function Table({ headings, rows, minWidth = "44rem" }: { headings: string[]; rows: ReactNode[][]; minWidth?: string }) {
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

const Spark = ({ value }: { value: string }) => <span className="font-mono tracking-tight text-ink-soft">{value}</span>;

function cueText(group: NameGroup): string {
  const { honorific, speech, possessive, address, locative, placeNoun } = group.cues;
  return `hon ${honorific} · speech ${speech} · poss ${possessive} · addr ${address} · loc ${locative} · place-noun ${placeNoun}`;
}

function forms(group: NameGroup): string {
  return group.forms.map((form) => `${form.form} ×${form.count}`).join(" · ");
}

function statusClass(status: ProfileFacet["status"]): string {
  if (status === "accepted") return "font-medium text-forest";
  if (status === "disputed") return "font-medium text-ink";
  return "text-ink-muted";
}

function Identity({ report, origin }: { report: BookIntelligenceReport; origin: string }) {
  const { identity, source } = report;
  return (
    <>
      <Heading>Identity</Heading>
      <Facts
        facts={[
          ["Origin", origin],
          ["Stored work id", identity.storedWorkId],
          ["Redirect chain", identity.redirectChain.join(" → ")],
          ["Open Library title", identity.title ?? "—"],
          ["Authors (metadata)", identity.authorNames.slice(0, 4).join("; ") || "—"],
          ["Editions", `${identity.editionCount} (${identity.editions.filter((edition) => edition.languages.includes("eng")).length} in English)`],
          ["Wikidata works", identity.wikidataWorks.join(", ") || "—"],
          ["Identity notes", identity.notes.join(" ") || "—"],
        ]}
      />
      <Subheading>Open-text candidates reached through identifiers ({identity.candidates.length})</Subheading>
      <Table
        headings={["Kind", "Locator", "Edition", "Chain"]}
        rows={identity.candidates.map((candidate) => [
          candidate.kind,
          candidate.locator,
          [candidate.edition.label, candidate.edition.language, candidate.edition.translator && `tr. ${candidate.edition.translator}`, candidate.edition.year].filter(Boolean).join(" · ") || "—",
          candidate.chain.join(" → "),
        ])}
      />
      <Subheading>Source attempts</Subheading>
      <Table headings={["Source", "Outcome"]} rows={report.attempts.map((attempt) => [attempt.source, attempt.outcome])} minWidth="36rem" />
      <Subheading>Chosen text</Subheading>
      {source ? (
        <Facts
          facts={[
            ["Source", `${source.kind} ${source.locator}`],
            ["URL", source.url],
            ["Matched by", source.matchedBy],
            ["Chain", source.chain.join(" → ")],
            ["Licence evidence", source.licence.join(" · ")],
            ["Names excluded", `${source.excludedNames.length} author/translator name forms`],
          ]}
        />
      ) : (
        <p className="mt-2 text-sm text-ink">{report.sourceError}</p>
      )}
    </>
  );
}

function Coverage({ report }: { report: BookIntelligenceReport }) {
  const { coverage, reference } = report;
  return (
    <>
      <Heading>Text coverage</Heading>
      {coverage ? (
        <Facts
          facts={[
            ["Analysed", coverage.source],
            ["Size", `${coverage.chapters} chapters · ${coverage.paragraphs} paragraphs · ${coverage.words.toLocaleString("en")} words`],
            ["Completeness", coverage.completeness],
            ["Skipped", coverage.skipped.join("; ") || "—"],
            ["Reference corpus", `${reference.books.length} public-domain novels, ${reference.words.toLocaleString("en")} words — background frequencies only`],
            ["Reference books", reference.books.map((book) => `${book.title} (${book.note})`).join("; ")],
            ["Reference failures", reference.failures.join("; ") || "—"],
            ["Methods", Object.entries(report.versions).map(([key, value]) => `${key}: ${value}`).join(" · ")],
            ["Timings (ms)", Object.entries(report.timingsMs).map(([key, value]) => `${key} ${value}`).join(" · ")],
          ]}
        />
      ) : (
        <p className="mt-2 text-sm text-ink-muted italic">No text analysed.</p>
      )}
    </>
  );
}

function Names({ report }: { report: BookIntelligenceReport }) {
  const names = report.names;
  if (!names) return null;
  return (
    <>
      <Heading>Characters (text, {names.method})</Heading>
      <p className="mt-2 text-sm text-ink-soft">{names.nameLikeWords} name-like words. Classified by grammatical cues around each mention; no outside knowledge.</p>
      <Table
        minWidth="64rem"
        headings={["Candidate", "Tier", "Mentions", "Chapters", "Forms / aliases", "Cues", "Often with"]}
        rows={names.characters.map((character) => [
          <span key="label">
            <span className="font-medium">{character.label}</span>
            {character.ambiguousWith.length ? <span className="block text-xs text-ink-muted">shared by {character.ambiguousWith.join("; ")}</span> : null}
          </span>,
          character.tier,
          `${character.mentions} (${character.per10k}/10k)`,
          <Spark key="spark" value={character.distribution} />,
          forms(character),
          cueText(character),
          character.companions.map((companion) => `${companion.label} (${companion.paragraphs})`).join(", ") || "—",
        ])}
      />
      <Heading>Places (text)</Heading>
      <Table
        minWidth="56rem"
        headings={["Candidate", "Tier", "Mentions", "Chapters", "Forms", "Cues", "Hint"]}
        rows={names.places.map((place) => [
          <span key="label" className="font-medium">{place.label}</span>,
          place.tier,
          place.mentions,
          <Spark key="spark" value={place.distribution} />,
          forms(place),
          cueText(place),
          place.derivedFromCharacter ? `contains character name “${place.derivedFromCharacter}”` : "—",
        ])}
      />
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-ink-soft">Rejected or unclassified names ({names.rejected.length})</summary>
        <Table headings={["Name", "Mentions", "Reason"]} rows={names.rejected.map((item) => [item.label, item.mentions, item.reason])} minWidth="30rem" />
      </details>
    </>
  );
}

function Themes({ report }: { report: BookIntelligenceReport }) {
  const themes = report.themes;
  if (!themes) return null;
  const structured = new Set(report.structured.themes.candidates.map((theme) => theme.key));
  const shown = themes.themes.filter((theme) => theme.support !== "none");
  return (
    <>
      <Heading>Themes (text, {themes.method})</Heading>
      <p className="mt-2 text-sm text-ink-soft">
        Cue words per theme (lexicon written before the run) compared with {themes.referenceSize.toLocaleString("en")} background words. Excerpts are
        public-domain text shown for development only.
      </p>
      <Table
        minWidth="72rem"
        headings={["Theme", "Support", "Ratio", "G²", "Beats refs", "Chapters", "Top cues", "Catalogue", "Short of"]}
        rows={shown.map((theme) => [
          <span key="label" className="font-medium">{theme.label}</span>,
          theme.support,
          theme.ratio,
          theme.logLikelihood,
          `${theme.beatsReferences}/${theme.perReference.length}`,
          <Spark key="spark" value={theme.distribution} />,
          theme.topCues.map((cue) => `${cue.cue} ${cue.count}`).join(", "),
          structured.has(theme.key) ? "yes" : "—",
          theme.shortOf.join("; ") || "—",
        ])}
      />
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-ink-soft">Excerpts for strong and moderate themes</summary>
        {shown
          .filter((theme) => theme.support === "strong" || theme.support === "moderate")
          .map((theme) => (
            <div key={theme.key} className="mt-3">
              <Subheading>{theme.label}</Subheading>
              <ul className="mt-1 space-y-1 text-sm text-ink-soft">
                {theme.excerpts.map((excerpt, index) => (
                  <li key={index}>“{excerpt}”</li>
                ))}
              </ul>
            </div>
          ))}
      </details>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-ink-soft">Themes with no support ({themes.themes.length - shown.length})</summary>
        <p className="mt-2 text-sm text-ink-muted">
          {themes.themes
            .filter((theme) => theme.support === "none")
            .map((theme) => `${theme.label} (${theme.ratio}×)`)
            .join(" · ")}
        </p>
      </details>
    </>
  );
}

function Motifs({ report }: { report: BookIntelligenceReport }) {
  const motifs = report.motifs;
  if (!motifs) return null;
  const row = (motif: (typeof motifs.candidates)[number]) => [
    <span key="word" className="font-medium">{motif.word}</span>,
    motif.count,
    motif.ratio,
    motif.logLikelihood,
    <Spark key="spark" value={motif.distribution} />,
    motif.nounness,
    motif.modifiers.map((modifier) => `${modifier.word} ${modifier.count}`).join(", ") || "—",
    motif.italicInSource ? "yes" : "—",
    motif.reason,
  ];
  return (
    <>
      <Heading>Motifs (text, {motifs.method})</Heading>
      <p className="mt-2 text-sm text-ink-soft">Unusually frequent recurring nouns. Candidates only — a word being frequent does not make it a motif.</p>
      <Table minWidth="64rem" headings={["Word", "Count", "Ratio", "G²", "Chapters", "Nounness", "Modifiers", "Italic", "Note"]} rows={motifs.candidates.map(row)} />
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-ink-soft">Rejected ({motifs.rejected.length})</summary>
        <Table minWidth="64rem" headings={["Word", "Count", "Ratio", "G²", "Chapters", "Nounness", "Modifiers", "Italic", "Reason"]} rows={motifs.rejected.map(row)} />
      </details>
    </>
  );
}

function Profile({ report }: { report: BookIntelligenceReport }) {
  const { profile } = report;
  const comparison = (title: string, rows: typeof profile.comparison.themes) => (
    <>
      <Subheading>{title}</Subheading>
      <Table headings={["Item", "Open Library / Wikidata", "Text", "Outcome"]} rows={rows.map((item) => [item.label, item.structured, item.text, item.outcome])} />
    </>
  );
  return (
    <>
      <Heading>Comparison with structured enrichment</Heading>
      {comparison("Characters", profile.comparison.characters)}
      {comparison("Places", profile.comparison.places)}
      {comparison("Themes", profile.comparison.themes)}
      <Heading>Hypothetical merged profile ({report.versions.merge}) — not stored</Heading>
      <p className="mt-2 text-sm text-ink-soft">
        A question built only from accepted facets would offer {profile.hypotheticalQuestions.characters} characters, {profile.hypotheticalQuestions.themes} themes
        and {profile.hypotheticalQuestions.places} places. Every facet is unreviewed.
      </p>
      <Table
        minWidth="64rem"
        headings={["Kind", "Facet", "Nature", "Status", "Confidence", "Provenance", "Notes"]}
        rows={profile.facets.map((facet) => [
          facet.kind,
          <span key="label" className="font-medium">{facet.label}</span>,
          facet.nature,
          <span key="status" className={statusClass(facet.status)}>{facet.status}</span>,
          facet.confidence,
          facet.provenance.map((item) => `${item.source}: ${item.evidence}`).join(" | "),
          facet.notes.join(" ") || "—",
        ])}
      />
    </>
  );
}

export default async function BookIntelligencePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const result = await buildReport(params);
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="font-serif text-3xl text-ink">Book intelligence — development prototype</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Research only. Finds an open, public-domain text through identifiers, runs deterministic extraction, and compares the result with Open Library and
        Wikidata. Nothing is stored and nothing here reaches the app.
      </p>

      <form className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          Open Library work id
          <input name="work" defaultValue={value("work")} className="h-10 rounded-sm border border-line bg-cream px-2" />
        </label>
        <label className="flex flex-col gap-1">
          Or search
          <input name="q" defaultValue={value("q")} placeholder="oblomov goncharov" className="h-10 rounded-sm border border-line bg-cream px-2" />
        </label>
        <label className="flex flex-col gap-1">
          Pin a Gutenberg id (comparison runs only)
          <input name="gutenberg" defaultValue={value("gutenberg")} inputMode="numeric" className="h-10 rounded-sm border border-line bg-cream px-2" />
        </label>
        <button type="submit" className="h-10 rounded-sm bg-ink px-4 font-medium text-cream sm:col-span-3 sm:justify-self-start">
          Analyse
        </button>
      </form>

      {result ? (
        <section className="mt-8 border-t border-line pt-4">
          <h2 className="font-serif text-2xl text-ink">{result.report.identity.title ?? result.report.workId}</h2>
          <Identity report={result.report} origin={result.origin} />
          <Coverage report={result.report} />
          <Names report={result.report} />
          <Themes report={result.report} />
          <Motifs report={result.report} />
          <Profile report={result.report} />
        </section>
      ) : (
        <p className="mt-8 text-ink-muted">No work found.</p>
      )}
    </Container>
  );
}
