// TEMPORARY development diagnostics for character enrichment — delete with this folder.
"use client";

import { useId, useState } from "react";
import { CoverImage } from "@/components/books/CoverImage";
import type { CastState } from "@/components/reflections/book-cast";
import { CharacterQuestion } from "@/components/reflections/CharacterQuestion";
import type { BookCast } from "@/lib/reflections/cast";

type ReaderPreviewProps = {
  title: string;
  workId: string;
  coverUrl: string | null;
  cast: BookCast | null;
  savedFavorite: string;
  /** Show the placeholder a reader sees while the cast is still being looked up. */
  loading?: boolean;
};

/** What the reader would see in the Finished Experience for this cast, with local-only answers. */
export function ReaderPreview({ title, workId, coverUrl, cast, savedFavorite, loading = false }: ReaderPreviewProps) {
  const id = useId();
  const [favorite, setFavorite] = useState(savedFavorite);
  const [least, setLeast] = useState("");
  const state: CastState = loading
    ? { status: "loading" }
    : cast
      ? { status: "ready", cast }
      : { status: "unavailable" };

  return (
    <div className="mx-auto max-w-xl space-y-8 rounded-sm bg-cream px-5 py-8 sm:px-8">
      <CharacterQuestion
        id={`${id}-favorite`}
        question="Who stayed with you?"
        hint="Choose one from the cast, or name someone else."
        placeholder="A character’s name"
        value={favorite}
        onChange={setFavorite}
        cast={state}
        anchor={
          <div className="@container flex aspect-[2/3] w-24 items-end">
            <div className="w-full">
              <CoverImage src={coverUrl} title={title} author={null} seed={workId} sizes="100px" />
            </div>
          </div>
        }
      />
      <div className="border-t border-line/70 pt-8">
        <CharacterQuestion
          id={`${id}-least`}
          question="Who tested your patience?"
          hint="Only if someone did."
          placeholder="No one, perhaps"
          value={least}
          onChange={setLeast}
          cast={state}
          compact
        />
      </div>
      <p className="text-xs text-ink-muted">
        Would save — favorite: <code>{JSON.stringify(favorite.replace(/\s+/g, " ").trim() || null)}</code>, least favorite:{" "}
        <code>{JSON.stringify(least.replace(/\s+/g, " ").trim() || null)}</code>
      </p>
    </div>
  );
}
