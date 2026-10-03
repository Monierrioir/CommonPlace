type ReadingProgressProps = {
  title: string;
  progress: number;
  color: string;
};

export function ReadingProgress({ title, progress, color }: ReadingProgressProps) {
  const value = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-ink-muted">
        <span>Progress</span>
        <span className="font-medium text-ink tabular-nums">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`Reading progress for ${title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="mt-1.5 h-[3px] w-full overflow-hidden bg-line/70"
      >
        <div
          className="h-full transition-[width] duration-700 ease-gentle"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
