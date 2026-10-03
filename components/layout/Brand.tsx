import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function Brand() {
  return (
    <Link
      href="/"
      className="group inline-flex min-h-11 items-center gap-2.5 text-ink"
      aria-label={`${siteConfig.name}, home`}
    >
      <span
        aria-hidden="true"
        className="h-5 w-3 bg-burgundy transition-transform duration-300 ease-gentle [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)] motion-safe:group-hover:translate-y-0.5"
      />
      <span className="font-serif text-xl tracking-[-0.01em] [font-variation-settings:'SOFT'_100]">
        {siteConfig.name}
      </span>
    </Link>
  );
}
