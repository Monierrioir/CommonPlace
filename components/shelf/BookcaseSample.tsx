import type { CSSProperties } from "react";
import type { BookcaseStyleId } from "@/lib/shelf/catalogue";

/** Paints a shape with one of the shelf material variables, so samples follow the chosen material. */
function wood(variable: string): CSSProperties {
  return { fill: `var(--${variable})` };
}

const shadow: CSSProperties = { fill: "rgb(var(--deep) / 0.22)" };

/** A few books standing with their feet on `base`. */
function Books({ x, base, heights }: { x: number; base: number; heights: number[] }) {
  const colours = ["fill-burgundy", "fill-dusty", "fill-forest", "fill-ochre"];
  const width = (index: number) => (index % 2 ? 4 : 3);
  return (
    <>
      {heights.map((height, index) => {
        const left = x + heights.slice(0, index).reduce((sum, _, before) => sum + width(before) + 0.6, 0);
        return <rect key={index} x={left} y={base - height} width={width(index)} height={height} rx={0.4} className={colours[index % 4]} />;
      })}
    </>
  );
}

/** A small structural drawing of each bookcase model for the editor. */
export function BookcaseSample({ id }: { id: BookcaseStyleId }) {
  return (
    <svg viewBox="0 0 96 48" className="block h-12 w-full" aria-hidden="true">
      {id === "classic" ? (
        <>
          <rect x={16} y={7} width={64} height={34} style={wood("panel")} />
          <rect x={12} y={7} width={4} height={34} style={wood("post-2")} />
          <rect x={80} y={7} width={4} height={34} style={wood("post-3")} />
          <Books x={20} base={22} heights={[11, 12.5, 10, 12]} />
          <Books x={54} base={38.5} heights={[12, 10.5, 12.5]} />
          <rect x={16} y={22} width={64} height={2.5} style={wood("board-1")} />
          <rect x={16} y={38.5} width={64} height={2.5} style={wood("board-1")} />
          <rect x={10} y={3} width={76} height={4} rx={1} style={wood("crown-1")} />
          <rect x={10} y={41} width={76} height={4} rx={0.5} style={wood("plinth-1")} />
        </>
      ) : null}
      {id === "floating" ? (
        <>
          {[15, 29, 43].map((y) => (
            <g key={y}>
              <rect x={14} y={y + 2.5} width={68} height={2.5} style={shadow} />
              <rect x={14} y={y} width={68} height={2.5} rx={0.4} style={wood("board-1")} />
            </g>
          ))}
          <Books x={20} base={15} heights={[9, 10.5]} />
          <Books x={44} base={29} heights={[10, 9, 10.5, 9.5]} />
          <Books x={62} base={43} heights={[10.5, 9]} />
        </>
      ) : null}
      {id === "arched" ? (
        <>
          <rect x={12} y={7} width={72} height={34} style={wood("crown-2")} />
          <rect x={12} y={7} width={6} height={34} style={wood("post-2")} />
          <rect x={78} y={7} width={6} height={34} style={wood("post-3")} />
          <path d="M18 41V21A30 11.5 0 0 1 78 21V41Z" style={wood("panel")} />
          <rect x={18} y={21} width={60} height={2.5} style={wood("board-1")} />
          <Books x={24} base={38.5} heights={[12, 13, 11, 12.5]} />
          <rect x={18} y={38.5} width={60} height={2.5} style={wood("board-1")} />
          <path d="M46 7h4l-0.8 4h-2.4Z" style={wood("crown-hi")} />
          <rect x={10} y={3} width={76} height={4} rx={1} style={wood("crown-1")} />
          <rect x={10} y={41} width={76} height={4} rx={0.5} style={wood("plinth-1")} />
        </>
      ) : null}
    </svg>
  );
}
