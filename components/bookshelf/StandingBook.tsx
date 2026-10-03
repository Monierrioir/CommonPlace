"use client";

import Image from "next/image";
import { useState } from "react";
import { PlaceholderFace } from "@/components/books/PlaceholderCover";

type StandingBookProps = {
  src: string | null;
  title: string;
  author: string | null;
  seed: string;
};

/**
 * A book standing face-out: the real cover at its natural proportions, sized by the --h custom
 * property, with its page block (--depth wide) visible to the right. Falls back to the cloth
 * placeholder when there is no cover or it fails to load.
 */
export function StandingBook({ src, title, author, seed }: StandingBookProps) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="relative block pr-[var(--depth)] shadow-[3px_1px_4px_-1px_rgb(30_18_8/0.35),12px_2px_16px_-10px_rgb(30_18_8/0.45)] transition-shadow duration-500 ease-gentle group-hover:shadow-[4px_8px_12px_-4px_rgb(30_18_8/0.3),14px_14px_24px_-12px_rgb(30_18_8/0.4)]">
      <span
        aria-hidden="true"
        className="book-block absolute top-[2px] right-0 bottom-0 w-[var(--depth)] rounded-r-[1px] [clip-path:polygon(0_0,100%_2px,100%_100%,0_100%)]"
      />
      <span className="relative block overflow-hidden rounded-l-[2px] rounded-r-[3px] bg-parchment">
        {src && !failed ? (
          <Image
            src={src}
            alt={author ? `Cover of ${title} by ${author}` : `Cover of ${title}`}
            width={360}
            height={540}
            sizes="(min-width: 1024px) 160px, (min-width: 640px) 140px, 110px"
            onError={() => setFailed(true)}
            className="block h-[var(--h)] w-auto max-w-[calc(var(--h)*0.85)] min-w-[calc(var(--h)*0.5)] object-cover"
          />
        ) : (
          <span className="block w-[calc(var(--h)*2/3)]">
            <PlaceholderFace title={title} author={author} seed={seed} />
          </span>
        )}
        <span aria-hidden="true" className="book-spine-depth pointer-events-none absolute inset-0" />
        <span aria-hidden="true" className="cover-sheen pointer-events-none absolute inset-0" />
      </span>
    </span>
  );
}
