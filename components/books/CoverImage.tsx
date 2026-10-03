"use client";

import Image from "next/image";
import { useState } from "react";
import { BookObject } from "./BookObject";
import { PlaceholderCover } from "./PlaceholderCover";

type CoverImageProps = {
  src: string | null;
  title: string;
  author: string | null;
  seed: string;
  sizes: string;
  preload?: boolean;
};

/**
 * A real cover that fills its container's width, meant for an `@container aspect-[2/3]` stage.
 * Client-only so a cover that fails to load can fall back to the placeholder instead of a broken image.
 */
export function CoverImage({ src, title, author, seed, sizes, preload = false }: CoverImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <PlaceholderCover title={title} author={author} seed={seed} />;
  }

  return (
    <BookObject>
      <Image
        src={src}
        alt={author ? `Cover of ${title} by ${author}` : `Cover of ${title}`}
        width={360}
        height={540}
        sizes={sizes}
        preload={preload}
        onError={() => setFailed(true)}
        className="block h-auto max-h-[170cqw] w-full object-cover"
      />
    </BookObject>
  );
}
