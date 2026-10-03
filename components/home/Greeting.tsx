type GreetingProps = {
  name: string;
  salutation?: string;
};

export function Greeting({ name, salutation = "Good evening" }: GreetingProps) {
  return (
    <section aria-labelledby="greeting-heading">
      <h1
        id="greeting-heading"
        className="font-serif text-[2rem] leading-[1.1] tracking-[-0.015em] text-ink sm:text-[2.5rem] lg:text-[2.75rem]"
      >
        {salutation}, <em className="text-burgundy">{name}.</em>
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
        A quiet corner for everything you’re reading, watching, and discovering.
      </p>
    </section>
  );
}
