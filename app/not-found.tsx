import { Container } from "@/components/ui/Container";
import { TextLink } from "@/components/ui/TextLink";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-start pt-16 sm:pt-24">
      <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-muted uppercase">
        Not shelved yet
      </p>
      <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">
        This room isn’t open yet.
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-ink-soft">
        We’re still arranging the furniture here. Your reading room is ready whenever you are.
      </p>
      <div className="mt-4">
        <TextLink href="/">Back to your reading room</TextLink>
      </div>
    </Container>
  );
}
