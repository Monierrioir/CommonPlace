"use client";

import { useId, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { importLegacyLibraryAction } from "@/lib/library/actions";
import { markLegacyMigrationComplete, snoozeLegacyImport, useLegacyLibrary } from "@/lib/library/legacy-import";

function books(count: number): string {
  return `${count} ${count === 1 ? "book" : "books"}`;
}

type Outcome = { tone: "done" | "error"; message: string };

/** Offers a one-time, reader-initiated import of the localStorage prototype library. */
export function LegacyImportNotice() {
  const legacy = useLegacyLibrary();
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const headingId = useId();

  const offer = legacy !== null && !legacy.completed && !legacy.snoozed && legacy.readableCount > 0;
  if (dismissed || (!offer && outcome?.tone !== "done")) return null;

  function importBooks() {
    if (!legacy) return;
    const items = legacy.items;
    startTransition(async () => {
      const result = await importLegacyLibraryAction(items);
      if (result.status === "complete") {
        markLegacyMigrationComplete(result);
        const parts = [`${books(result.imported)} brought onto your shelves.`];
        if (result.alreadyInLibrary > 0) parts.push(`${books(result.alreadyInLibrary)} were already there, so we left them as they were.`);
        if (result.unreadable > 0) parts.push(`${books(result.unreadable)} couldn’t be read and stayed behind.`);
        setOutcome({ tone: "done", message: parts.join(" ") });
      } else {
        setOutcome({ tone: "error", message: result.message });
      }
    });
  }

  if (outcome?.tone === "done") {
    return (
      <section
        aria-labelledby={headingId}
        className="mb-8 flex items-start gap-3 border-y border-line/80 py-5"
      >
        <Icon name="check" className="mt-1 size-5 shrink-0 text-forest" />
        <div className="min-w-0 flex-1" role="status">
          <h2 id={headingId} className="font-serif text-xl leading-snug text-ink">
            Your books have moved in.
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{outcome.message}</p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-parchment hover:text-ink"
        >
          <Icon name="close" className="size-5" />
        </button>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="mb-8 flex flex-col gap-4 border-y border-line/80 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
    >
      <div className="min-w-0">
        <h2 id={headingId} className="font-serif text-xl leading-snug text-ink">
          We found books from your local library.
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Bring them into your Commonplace account? {books(legacy!.readableCount)} saved in this browser.
        </p>
        <div role="alert">
          {outcome?.tone === "error" ? (
            <p className="mt-2 text-sm leading-relaxed text-burgundy">{outcome.message}</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={importBooks}
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-cream transition-colors hover:bg-ink-soft disabled:cursor-progress disabled:bg-ink-soft"
        >
          {pending ? "Bringing them over…" : outcome?.tone === "error" ? "Try again" : "Import books"}
        </button>
        <button
          type="button"
          onClick={snoozeLegacyImport}
          disabled={pending}
          className="min-h-11 px-3 text-sm text-ink-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink disabled:opacity-60"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
