import { SectionHeading } from "@/components/ui/SectionHeading";
import { TextLink } from "@/components/ui/TextLink";
import type { ClubSummary } from "@/types/club";

function monogram(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}

type ClubsPreviewProps = {
  clubs: ClubSummary[];
  className?: string;
};

export function ClubsPreview({ clubs, className = "" }: ClubsPreviewProps) {
  return (
    <section aria-labelledby="clubs-heading" className={className}>
      <SectionHeading
        id="clubs-heading"
        eyebrow="Reading together"
        title="Your clubs"
        action={<TextLink href="/clubs">All clubs</TextLink>}
      />
      <ul className="divide-y divide-line">
        {clubs.map((club) => (
          <li key={club.id}>
            <ClubRow club={club} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClubRow({ club }: { club: ClubSummary }) {
  return (
    <article className="flex items-center gap-4 py-5 sm:gap-5">
      <span
        aria-hidden="true"
        className="relative flex size-12 shrink-0 items-center justify-center rounded-full font-serif text-base text-cream italic"
        style={{ backgroundColor: club.emblemColor }}
      >
        <span className="absolute inset-[3px] rounded-full border border-cream/35" />
        {monogram(club.name)}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-lg leading-snug text-ink">{club.name}</h3>
        <p className="mt-0.5 text-sm text-ink-soft">
          Currently reading <cite className="text-ink italic">{club.currentBookTitle}</cite>
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <span aria-hidden="true" className="flex -space-x-1.5">
          {club.memberInitials.map((initial, index) => (
            <span
              key={`${initial}-${index}`}
              className="flex size-6 items-center justify-center rounded-full border border-paper bg-parchment text-[0.625rem] font-semibold text-ink-soft"
            >
              {initial}
            </span>
          ))}
        </span>
        <span className="text-xs text-ink-muted tabular-nums">{club.readerCount} readers</span>
      </div>
    </article>
  );
}
