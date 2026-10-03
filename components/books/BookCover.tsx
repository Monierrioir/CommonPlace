import type { CoverDesign } from "@/types/book";

type BookCoverProps = {
  title: string;
  author: string;
  design: CoverDesign;
};

/**
 * A temporary, CSS-drawn physical book: cover, page block and ribbon.
 * Purely decorative — surrounding UI is responsible for the accessible title.
 */
export function BookCover({ title, author, design }: BookCoverProps) {
  return (
    <div aria-hidden="true" className="relative aspect-[2/3] w-full">
      <span
        className="absolute top-2 left-[64%] h-[calc(100%+0.5rem)] w-[6%] min-w-1.5 [clip-path:polygon(0_0,100%_0,100%_100%,50%_calc(100%-6px),0_100%)]"
        style={{ backgroundColor: design.ribbon }}
      />
      <span className="book-pages absolute inset-y-[3px] -right-[5px] w-[6px] rounded-r-[2px]" />
      <div
        className="@container relative h-full overflow-hidden rounded-l-[2px] rounded-r-[4px] shadow-book transition-shadow duration-500 ease-gentle group-hover:shadow-book-lifted"
        style={{ backgroundColor: design.background, color: design.ink }}
      >
        <CoverArtwork title={title} author={author} design={design} />
        <span className="cover-sheen pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}

function CoverArtwork({ title, author, design }: BookCoverProps) {
  switch (design.motif) {
    case "frame":
      return (
        <>
          <span className="absolute inset-[8%] border" style={{ borderColor: design.accent }} />
          <span
            className="absolute inset-[10.5%] border opacity-60"
            style={{ borderColor: design.accent }}
          />
          <div className="relative flex h-full flex-col items-center justify-center px-[17%] text-center">
            <span className="text-[length:7cqw]" style={{ color: design.accent }}>
              ◆
            </span>
            <span className="mt-[5cqw] font-serif text-[length:9cqw] leading-[1.1] tracking-[0.05em] uppercase">
              {title}
            </span>
            <span className="my-[6cqw] h-px w-[20cqw]" style={{ backgroundColor: design.accent }} />
            <span className="text-[length:5cqw] tracking-[0.2em] uppercase opacity-85">{author}</span>
          </div>
        </>
      );

    case "dunes":
      return (
        <>
          <span
            className="absolute top-[36%] right-[14%] size-[24cqw] rounded-full"
            style={{ backgroundColor: design.accent }}
          />
          <span
            className="absolute top-[60%] -left-[25%] h-[60%] w-[95%] rounded-[50%] opacity-15"
            style={{ backgroundColor: design.ink }}
          />
          <span
            className="absolute top-[68%] -right-[35%] h-[60%] w-[115%] rounded-[50%] opacity-25"
            style={{ backgroundColor: design.ink }}
          />
          <span
            className="absolute top-[80%] -left-[15%] h-[50%] w-[135%] rounded-[50%] opacity-40"
            style={{ backgroundColor: design.ink }}
          />
          <div className="relative flex flex-col gap-[3cqw] px-[12%] pt-[14%]">
            <span className="font-serif text-[length:19cqw] leading-none tracking-[0.18em] uppercase">
              {title}
            </span>
            <span className="text-[length:5cqw] tracking-[0.25em] uppercase opacity-80">{author}</span>
          </div>
        </>
      );

    case "dome":
      return (
        <div className="relative flex h-full flex-col items-center px-[12%] pt-[16%] text-center">
          <span className="size-[5cqw] rounded-full border-[1.5px] border-current" />
          <span className="relative flex h-[46cqw] w-[44cqw] items-end justify-center rounded-t-full border-[1.5px] border-b-0 border-current">
            <span className="mb-[3cqw] flex flex-col items-center">
              <span className="size-[6cqw] rounded-full bg-burgundy" />
              <span className="h-[12cqw] w-px bg-current opacity-70" />
            </span>
          </span>
          <span className="h-[1.5px] w-[58cqw] bg-current" />
          <span className="mt-auto mb-[14%] flex flex-col items-center gap-[3cqw]">
            <span className="font-serif text-[length:11cqw] leading-[1.05] italic">{title}</span>
            <span className="text-[length:5cqw] tracking-[0.22em] uppercase opacity-80">{author}</span>
          </span>
        </div>
      );
  }
}
