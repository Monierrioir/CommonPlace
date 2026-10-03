import { resultsGridClassName } from "./results-grid";

const placeholderHeights = ["78%", "86%", "72%", "82%", "76%", "88%", "74%", "80%", "84%", "70%"];

export function SearchResultsSkeleton() {
  return (
    <div role="status">
      <p className="font-serif text-sm text-ink-muted italic">Searching the shelves…</p>
      <ul aria-hidden="true" className={`mt-8 ${resultsGridClassName}`}>
        {placeholderHeights.map((height, index) => (
          <li key={index}>
            <div className="flex aspect-[2/3] items-end justify-center px-3 sm:px-4">
              <div
                className="w-[90%] rounded-r-[4px] bg-parchment motion-safe:animate-pulse"
                style={{ height }}
              />
            </div>
            <div className="shelf-plank h-2" />
            <div className="shelf-lip h-1" />
            <div className="space-y-2 px-3 pt-4 sm:px-4">
              <div className="h-4 w-4/5 bg-parchment" />
              <div className="h-3 w-1/2 bg-parchment/80" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
