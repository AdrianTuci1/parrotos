import { Interval, DateTime } from "luxon";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";

/**
 * React translation of `super-pill/new-time-dropdown/PrimaryRangeTooltip.svelte`. The
 * tooltip showing the time string and the resolved start/end date-time for the primary
 * (currently selected) range.
 */
export interface PrimaryRangeTooltipProps {
  timeString: string | undefined;
  interval: Interval<true>;
  timeDimensionLabel?: string | undefined;
  timeDimensionDescription?: string | undefined;
}

export function PrimaryRangeTooltip({
  timeString,
  interval,
  timeDimensionLabel,
  timeDimensionDescription,
}: PrimaryRangeTooltipProps) {
  function format(date: DateTime) {
    return date.toLocaleString({
      ...DateTime.DATETIME_HUGE_WITH_SECONDS,
      fractionalSecondDigits: date.millisecond > 0 ? 3 : undefined,
      second: date.second > 0 ? "numeric" : undefined,
    });
  }

  return (
    <div className="flex-col flex items-center gap-y-0 p-3">
      {timeDimensionLabel ? (
        <div className="flex flex-col items-center mb-1">
          <span className="font-bold text-fg-inverse">{timeDimensionLabel}</span>
          {timeDimensionDescription ? (
            <span className="text-fg-inverse/70 text-center max-w-64">
              {timeDimensionDescription}
            </span>
          ) : null}
        </div>
      ) : null}
      <span className="font-semibold italic mb-1">{timeString}</span>
      {interval.isValid ? (
        <>
          <span>{format(interval.start)}</span>
          <span>{m.dashboard_to()}</span>
          <span>{format(interval.end)}</span>
        </>
      ) : (
        <span className="text-fg-secondary">{m.dashboard_invalid_time_range()}</span>
      )}
    </div>
  );
}
