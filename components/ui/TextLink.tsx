import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

type TextLinkProps = {
  href: string;
  children: ReactNode;
};

export function TextLink({ href, children }: TextLinkProps) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink decoration-line decoration-1 underline-offset-[6px] transition-colors hover:text-burgundy hover:underline hover:decoration-burgundy/40 active:translate-y-px"
    >
      {children}
      <Icon
        name="arrow"
        className="size-4 transition-transform duration-300 ease-gentle motion-safe:group-hover:translate-x-1"
      />
    </Link>
  );
}
