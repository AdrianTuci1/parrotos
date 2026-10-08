import type { ParrotTime } from "@statsparrot/web-common/features/dashboards/url-state/time-ranges/ParrotTime";
import { SyntaxElement } from "./SyntaxElement";

/**
 * React translation of `super-pill/components/TimeRangeMenuItem.svelte`. A single range
 * option row in the time-range picker. Displays the human label and the syntax on hover.
 */
export interface TimeRangeMenuItemProps {
  statsparrotTime: ParrotTime;
  timeString: string | undefined;
  onClick: (range: string) => void;
}

export function TimeRangeMenuItem({
  statsparrotTime,
  timeString,
  onClick,
}: TimeRangeMenuItemProps) {
  const label = statsparrotTime.getLabel();
  // If there is as of baked into the range then use it.
  const range = statsparrotTime.asOfLabel ? statsparrotTime.toString() : statsparrotTime.interval.toString();
  const selected = !!timeString?.startsWith(range);

  return (
    <button
      type="button"
      role="menuitem"
      className={`group truncate h-7 p-2 text-popover-foreground justify-between overflow-hidden hover:bg-popover-accent rounded-sm w-full select-none flex items-center ${
        selected ? "font-bold" : ""
      }`}
      onClick={() => onClick(range)}
    >
      {label}

      {range ? (
        <div className="sr-only group-hover:not-sr-only">
          <SyntaxElement range={range} />
        </div>
      ) : null}
    </button>
  );
}
