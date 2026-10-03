import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  footer: ReactNode;
};

/** Shared frame for login and signup: an editorial heading above a single sheet of paper. */
export function AuthLayout({ eyebrow, title, intro, children, footer }: AuthLayoutProps) {
  return (
    <Container className="pt-10 sm:pt-16">
      <div className="mx-auto w-full max-w-[26rem]">
        <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-muted uppercase">{eyebrow}</p>
        <h1 className="mt-2 font-serif text-[2rem] leading-[1.1] tracking-[-0.015em] text-ink sm:text-[2.5rem]">
          {title}
        </h1>
        <p className="mt-3 font-serif text-lg leading-snug text-ink-muted italic">{intro}</p>

        <div className="relative mt-8 rounded-sm border border-line bg-cream px-5 pt-7 pb-6 shadow-paper sm:px-8 sm:pt-9 sm:pb-8">
          <span
            aria-hidden="true"
            className="absolute -top-1.5 right-7 h-12 w-3.5 bg-burgundy shadow-[0_2px_3px_rgb(42_29_21/0.25)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_80%,0_100%)]"
          />
          {children}
        </div>

        <div className="mt-6 text-sm text-ink-soft">{footer}</div>
      </div>
    </Container>
  );
}
