import type { JSX } from "react";
import type { DecorationId } from "@/lib/shelf/catalogue";

/**
 * Original cosmetic objects for the bookcase, drawn in SVG and sized from --book-h so
 * they scale with the shelf. Purely decorative: callers mark them aria-hidden.
 */

const contactShadowClassName =
  "absolute -inset-x-[3px] -bottom-[2px] -z-10 h-[6px] rounded-[50%] bg-[radial-gradient(closest-side,rgb(30_18_8/0.55),transparent)]";

type ObjectProps = {
  /** Facing the other way, e.g. a bookend closing a row or a plant in the right-hand corner. */
  mirrored?: boolean;
};

function flip(mirrored: boolean | undefined): string {
  return mirrored ? "-scale-x-100" : "";
}

/** A glazed quarter-round bookend. */
function GlazedBookend({ mirrored }: ObjectProps) {
  return (
    <span className={`relative isolate block h-[calc(var(--book-h)*0.42)] w-[calc(var(--book-h)*0.15)] ${flip(mirrored)}`}>
      <span className="absolute inset-0 rounded-tl-[100%_72%] rounded-tr-[2px] bg-[linear-gradient(100deg,#557560,#3e5a46_45%,#2e4435)] shadow-[inset_-1px_0_0_rgb(0_0_0/0.25)]" />
      <span className="absolute top-[34%] bottom-[10%] left-[22%] w-[14%] rounded-full bg-white/15" />
      <span className={contactShadowClassName} />
    </span>
  );
}

/** A small leafy plant in a terracotta pot. */
function PottedPlant({ mirrored }: ObjectProps) {
  return (
    <span className={`relative isolate block ${flip(mirrored)}`}>
      <svg viewBox="0 0 64 96" className="block h-[calc(var(--book-h)*0.6)] w-[calc(var(--book-h)*0.4)]" focusable="false">
        <path d="M32 60C19 51 11 35 13 18c10 8 18 22 19 42z" fill="#3e5a46" />
        <path d="M32 60c13-10 21-25 19-43-10 9-18 23-19 43z" fill="#4f6a52" />
        <path d="M32 61c-4-18-2-38 5-55 4 18 2 37-5 55z" fill="#5f7d5e" />
        <path d="M31 62C19 60 8 53 2 42c12 0 24 7 29 20z" fill="#4f6a52" />
        <path d="M33 62c12-2 23-9 29-20-12 0-24 7-29 20z" fill="#3e5a46" />
        <path d="M15 64h34l-4 32H19z" fill="#a4552f" />
        <path d="M15 64h34l-.6 5H15.6z" fill="#000" fillOpacity="0.14" />
        <rect x="11" y="58" width="42" height="8" rx="1.5" fill="#8f4726" />
        <path d="M20 70h3l-2 24h-2z" fill="#fff" fillOpacity="0.12" />
      </svg>
      <span className={contactShadowClassName} />
    </span>
  );
}

/**
 * A pothos in a cream pot whose vines spill over the top edge and hang down the outside
 * of the bookcase's side post — never across the books.
 */
function TrailingPlant({ mirrored }: ObjectProps) {
  return (
    <span className={`relative isolate block ${flip(mirrored)}`}>
      <svg viewBox="0 0 60 64" className="relative z-10 block h-[calc(var(--book-h)*0.42)] w-[calc(var(--book-h)*0.39)]" focusable="false">
        <path d="M30 34c-6-10-15-13-22-11 4 7 12 11 22 11z" fill="#4f6a52" />
        <path d="M30 34c5-11 14-15 22-13-4 8-12 12-22 13z" fill="#3e5a46" />
        <path d="M29 35c-3-12 0-22 7-28 2 10-1 20-7 28z" fill="#5f7d5e" />
        <path d="M31 36c7-6 15-7 21-4-5 5-13 6-21 4z" fill="#5f7d5e" />
        <path d="M13 36h34l-3.5 26a2 2 0 0 1-2 1.8H18.5a2 2 0 0 1-2-1.8z" fill="#e8dcc4" />
        <path d="M13 36h34l-.5 4H13.5z" fill="#000" fillOpacity="0.1" />
        <path d="M18 42c4 1 8 1 12 0s8-1 12 0" fill="none" stroke="#b98a45" strokeWidth="1.2" strokeOpacity="0.6" />
        <path d="M19 45h2l-1.5 15h-1.5z" fill="#fff" fillOpacity="0.35" />
      </svg>
      {/* The trailing vine hangs from the pot's rim, out over the corner of the bookcase. */}
      <svg
        viewBox="0 0 24 120"
        className="absolute top-[calc(var(--book-h)*0.2)] -left-[calc(var(--book-h)*0.15)] z-20 h-[calc(var(--book-h)*1.05)] w-[calc(var(--book-h)*0.21)]"
        focusable="false"
      >
        <path d="M18 2C8 18 6 38 10 58s2 38-4 58" fill="none" stroke="#3e5a46" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M18 4c-3 12 0 26 3 40" fill="none" stroke="#4f6a52" strokeWidth="1.1" strokeLinecap="round" />
        {[
          [12, 16, -30],
          [7, 30, 25],
          [11, 44, -20],
          [20, 38, 35],
          [9, 60, 30],
          [12, 74, -25],
          [8, 90, 20],
          [5, 106, -15],
        ].map(([x, y, angle], index) => (
          <path
            key={index}
            d="M0 0c3-4 8-4 9 0-1 4-6 5-9 0z"
            transform={`translate(${x} ${y}) rotate(${angle})`}
            fill={index % 2 ? "#4f6a52" : "#5f7d5e"}
          />
        ))}
      </svg>
      <span className={contactShadowClassName} />
    </span>
  );
}

/** A cream pillar candle in a small brass dish. */
function Candle() {
  return (
    <span className="relative isolate block">
      <svg viewBox="0 0 36 72" className="block h-[calc(var(--book-h)*0.4)] w-[calc(var(--book-h)*0.2)]" focusable="false">
        <ellipse cx="18" cy="14" rx="10" ry="12" fill="#ffd699" fillOpacity="0.28" />
        <g className="origin-[18px_20px] motion-safe:animate-flicker">
          <path d="M18 7c3 4 4.5 7 4.5 9.5A4.5 4.5 0 0 1 18 21a4.5 4.5 0 0 1-4.5-4.5C13.5 14 15 11 18 7z" fill="#f2b55a" />
          <path d="M18 12c1.6 2.2 2.3 3.6 2.3 4.9a2.3 2.3 0 0 1-4.6 0c0-1.3.7-2.7 2.3-4.9z" fill="#fff3d6" />
        </g>
        <path d="M18 20.5v4" stroke="#3a2a1c" strokeWidth="1" />
        <path d="M9 26c0-1.5 4-2.5 9-2.5s9 1 9 2.5v34H9z" fill="#f3ead6" />
        <path d="M9 26c0-1.5 4-2.5 9-2.5s9 1 9 2.5c-2 1.2-5 1.6-9 1.6s-7-.4-9-1.6z" fill="#fbf6ea" />
        <path d="M24 28c1 2 .8 5-.4 7" fill="none" stroke="#e5d8bd" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M11 28v30" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.5" />
        <path d="M27 28v32" stroke="#000" strokeOpacity="0.07" strokeWidth="3" />
        <path d="M3 60h30l-2.5 7h-25z" fill="#b98a45" />
        <path d="M3 60h30l-.6 1.6H3.6z" fill="#e2bf7e" />
      </svg>
      <span className={contactShadowClassName} />
    </span>
  );
}

/** A speckled stoneware vase holding a single dried stem. */
function CeramicVase({ mirrored }: ObjectProps) {
  return (
    <span className={`relative isolate block ${flip(mirrored)}`}>
      <svg viewBox="0 0 44 96" className="block h-[calc(var(--book-h)*0.54)] w-[calc(var(--book-h)*0.25)]" focusable="false">
        <path d="M22 50C21 34 17 20 10 6" fill="none" stroke="#8f7a55" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M22 48c2-14 6-26 13-36" fill="none" stroke="#8f7a55" strokeWidth="1" strokeLinecap="round" />
        {[
          [10, 7],
          [13, 13],
          [15, 19],
          [34, 13],
          [31, 18],
          [29, 24],
        ].map(([x, y], index) => (
          <ellipse key={index} cx={x} cy={y} rx="2.4" ry="1.3" transform={`rotate(${index < 3 ? -40 : 40} ${x} ${y})`} fill="#c9a86a" />
        ))}
        <path
          d="M16 44h12v4c0 3 8 8 8 22 0 12-6 22-14 22S8 82 8 70c0-14 8-19 8-22z"
          fill="#9aa894"
        />
        <path d="M16 44h12v2.5H16z" fill="#000" fillOpacity="0.15" />
        <path d="M12 60c-2 6-2 16 2 24" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M34 66c0 10-4 18-10 22" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="4" strokeLinecap="round" />
        {[
          [18, 58],
          [26, 64],
          [14, 72],
          [22, 78],
          [30, 74],
          [20, 86],
          [27, 54],
        ].map(([x, y], index) => (
          <circle key={index} cx={x} cy={y} r="0.8" fill="#4d5b49" fillOpacity="0.55" />
        ))}
      </svg>
      <span className={contactShadowClassName} />
    </span>
  );
}

/** A small landscape print in a thin wooden frame, leaning back against the wall. */
function FramedPrint({ mirrored }: ObjectProps) {
  return (
    <span className={`relative isolate block ${flip(mirrored)}`}>
      <span className="block origin-bottom -rotate-[3deg] shadow-[3px_4px_8px_-3px_rgb(30_18_8/0.45)]">
        <svg viewBox="0 0 80 100" className="block h-[calc(var(--book-h)*0.62)] w-[calc(var(--book-h)*0.5)]" focusable="false">
          <rect width="80" height="100" rx="1" fill="#6a4329" />
          <rect x="2" y="2" width="76" height="96" fill="none" stroke="#946141" strokeWidth="1" />
          <rect x="7" y="7" width="66" height="86" fill="#f4ecdc" />
          <rect x="15" y="15" width="50" height="62" fill="#e9dcc2" />
          <circle cx="51" cy="31" r="6" fill="#d8b27a" />
          <path d="M15 56c8-6 14-8 21-5s12 1 17-4 9-5 12-3v33H15z" fill="#9aa894" />
          <path d="M15 64c10-4 18-3 26 0s15 3 24-1v14H15z" fill="#5d7890" fillOpacity="0.75" />
          <path d="M15 70c12-2 22 0 30 2s14 1 20-1v6H15z" fill="#3e5a46" fillOpacity="0.85" />
          <path d="M34 84h12" stroke="#b9a988" strokeWidth="0.8" />
          <path d="M7 7h30L7 45z" fill="#fff" fillOpacity="0.14" />
        </svg>
      </span>
      <span className={contactShadowClassName} />
    </span>
  );
}

/** Two cloth notebooks and a bundle of letters tied with string. */
function PaperStack({ mirrored }: ObjectProps) {
  return (
    <span className={`relative isolate block ${flip(mirrored)}`}>
      <svg viewBox="0 0 90 44" className="block h-[calc(var(--book-h)*0.24)] w-[calc(var(--book-h)*0.49)]" focusable="false">
        <path d="M6 12.5 78 10l2 7.5-72 2.4z" fill="#f4ecdc" />
        <path d="M6 12.5 78 10l.6 2.3L6.8 14.8z" fill="#fff" fillOpacity="0.6" />
        <path d="M8 16.2l70.5-2.3M8.4 18l70.6-2.3" stroke="#d8c9aa" strokeWidth="0.7" />
        <path d="M44 11v8.5" stroke="#8f4726" strokeWidth="1.3" />
        <path d="M40.5 9.5c2-2.5 5-2.5 7 0" fill="none" stroke="#8f4726" strokeWidth="1.1" />
        <rect x="3" y="20" width="80" height="10" rx="1" fill="#5d7890" />
        <rect x="3" y="20" width="80" height="2" rx="1" fill="#fff" fillOpacity="0.14" />
        <rect x="76" y="21" width="5" height="8" fill="#e8dcc4" />
        <rect x="9" y="30" width="76" height="11" rx="1" fill="#7b2d37" />
        <rect x="9" y="30" width="76" height="2" rx="1" fill="#fff" fillOpacity="0.12" />
        <rect x="11" y="31" width="4" height="9" fill="#e8dcc4" />
        <path d="M60 30v11" stroke="#d8b27a" strokeWidth="1.2" />
      </svg>
      <span className={contactShadowClassName} />
    </span>
  );
}

const objects: Record<DecorationId, (props: ObjectProps) => JSX.Element> = {
  "glazed-bookend": GlazedBookend,
  "potted-plant": PottedPlant,
  "trailing-plant": TrailingPlant,
  candle: Candle,
  "ceramic-vase": CeramicVase,
  "framed-print": FramedPrint,
  "paper-stack": PaperStack,
};

export function ShelfObject({ id, mirrored }: { id: DecorationId; mirrored?: boolean }) {
  const Component = objects[id];
  return <Component mirrored={mirrored} />;
}
