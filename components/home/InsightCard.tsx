import { Icon } from "@/components/ui/Icon";

type InsightCardProps = {
  message: string;
  basis: string;
  className?: string;
};

export function InsightCard({ message, basis, className = "" }: InsightCardProps) {
  return (
    <section aria-labelledby="insight-heading" className={`pt-3 ${className}`}>
      <div className="paper-lined relative -rotate-[0.6deg] px-6 pt-8 pb-6 transition-transform duration-500 ease-gentle motion-safe:hover:rotate-0 sm:px-8">
        <span
          aria-hidden="true"
          className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3 bg-dusty/25"
        />
        <h2
          id="insight-heading"
          className="flex items-center gap-2 font-serif text-lg text-burgundy italic"
        >
          <Icon name="sparkle" className="size-4 text-ochre" />
          I noticed something…
        </h2>
        <p className="mt-3 font-serif text-[1.375rem] leading-snug text-ink sm:text-2xl">{message}</p>
        <p className="mt-6 border-t border-dashed border-line pt-3 text-xs text-ink-muted">{basis}</p>
      </div>
    </section>
  );
}
