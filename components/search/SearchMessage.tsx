import type { ReactNode } from "react";

type SearchMessageProps = {
  title: string;
  children?: ReactNode;
  tone?: "quiet" | "error";
};

export function SearchMessage({ title, children, tone = "quiet" }: SearchMessageProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`max-w-xl border-l-2 py-1 pl-5 ${tone === "error" ? "border-burgundy/70" : "border-line"}`}
    >
      <p className="font-serif text-xl leading-snug text-ink sm:text-2xl">{title}</p>
      {children ? <div className="mt-2 text-base leading-relaxed text-ink-soft">{children}</div> : null}
    </div>
  );
}
