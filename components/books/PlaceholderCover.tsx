import { seededIndex } from "@/lib/seeded";
import { BookObject } from "./BookObject";

const palettes = [
  { background: "var(--color-forest)", ink: "#efe3c8", accent: "var(--color-ochre)" },
  { background: "var(--color-burgundy)", ink: "#f3e6cf", accent: "var(--color-ochre)" },
  { background: "var(--color-dusty)", ink: "#f4ecdd", accent: "#f4ecdd" },
  { background: "#e9dcc2", ink: "#3b2a1c", accent: "var(--color-burgundy)" },
  { background: "#40302a", ink: "#d8b27a", accent: "#d8b27a" },
] as const;

type PlaceholderCoverProps = {
  title: string;
  author: string | null;
  /** Stable value (e.g. a work ID) so the same book always gets the same binding. */
  seed: string;
};

/** A cloth-bound stand-in for books without cover artwork. */
export function PlaceholderCover(props: PlaceholderCoverProps) {
  return (
    <BookObject>
      <PlaceholderFace {...props} />
    </BookObject>
  );
}

/** Just the cloth cover face, for callers that draw their own book body. */
export function PlaceholderFace({ title, author, seed }: PlaceholderCoverProps) {
  const palette = palettes[seededIndex(seed, palettes.length)];

  return (
    <div
      role="img"
      aria-label={`No cover image available for ${title}`}
      className="@container relative aspect-[2/3] w-full"
      style={{ backgroundColor: palette.background, color: palette.ink }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-[7%] border opacity-70"
        style={{ borderColor: palette.accent }}
      />
      <div
        aria-hidden="true"
        className="relative flex h-full flex-col items-center justify-between px-[15%] py-[16%] text-center"
      >
        <span className="text-[length:6cqw]" style={{ color: palette.accent }}>
          ◆
        </span>
        <span className="line-clamp-5 font-serif text-[length:10cqw] leading-[1.12]">{title}</span>
        <span className="line-clamp-2 text-[length:5.5cqw] tracking-[0.16em] uppercase opacity-80">
          {author ?? ""}
        </span>
      </div>
    </div>
  );
}
