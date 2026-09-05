import type { RillTime } from "@rilldata/web-common/features/dashboards/url-state/time-ranges/RillTime";
import { SyntaxElement } from "./SyntaxElement";

/**
 * React translation of `super-pill/components/TimeRangeMenuItem.svelte`. A single range
 * option row in the time-range picker. Displays the human label and the syntax on hover.
 */
export interface TimeRangeMenuItemProps {
  rillTime: RillTime;
  timeString: string | undefined;
  onClick: (range: string) => void;
}

export function TimeRangeMenuItem({
  rillTime,
  timeString,
  onClick,
}: TimeRangeMenuItemProps) {
  const label = rillTime.getLabel();
  // If there is as of baked into the range then use it.
  const range = rillTime.asOfLabel ? rillTime.toString() : rillTime.interval.toString();
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
