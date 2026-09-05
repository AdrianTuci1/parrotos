import { prettyFormatTimeRange } from "@rilldata/web-common/lib/time/ranges/formatter";
import { V1TimeGrain } from "@rilldata/web-common/runtime-client";
import type { Interval } from "luxon";
import { useMemo } from "react";

/**
 * React translation of `super-pill/components/RangeDisplay.svelte`. Formats a Luxon
 * interval for human-readable display. Reuses `prettyFormatTimeRange` verbatim.
 */
export interface RangeDisplayProps {
  interval: Interval | undefined;
  timeGrain?: V1TimeGrain;
  abbreviation?: string | undefined;
}

export function RangeDisplay({
  interval,
  timeGrain = V1TimeGrain.TIME_GRAIN_UNSPECIFIED,
  abbreviation,
}: RangeDisplayProps) {
  const formattedInterval = useMemo(
    () => prettyFormatTimeRange(interval, timeGrain),
    [interval, timeGrain],
  );

  return (
    <div className="flex gap-x-1 whitespace-nowrap truncate">
      <span className="line-clamp-1 text-left">
        {interval?.isValid ? (
          <>
            {formattedInterval}
            {abbreviation ? abbreviation : null}
          </>
        ) : (
          "Invalid Interval"
        )}
      </span>
    </div>
  );
}
