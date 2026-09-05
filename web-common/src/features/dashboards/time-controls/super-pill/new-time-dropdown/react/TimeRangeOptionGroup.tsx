import { useMemo } from "react";
import type { RillTime } from "@rilldata/web-common/features/dashboards/url-state/time-ranges/RillTime";
import { TimeRangeMenuItem } from "./TimeRangeMenuItem";

/**
 * React translation of `super-pill/new-time-dropdown/TimeRangeOptionGroup.svelte`.
 * Filters the given range options by the current search and renders them as menu items
 * separated by a divider line.
 */
export interface TimeRangeOptionGroupProps {
  filter: string;
  options: RillTime[];
  timeString?: string | undefined;
  hideDivider?: boolean;
  onClick: (range: string) => void;
}

export function TimeRangeOptionGroup({
  filter,
  options,
  timeString,
  hideDivider = false,
  onClick,
}: TimeRangeOptionGroupProps) {
  const filtered = useMemo(
    () =>
      options.filter((option) => {
        return (
          option.interval
            .toString()
            .toLowerCase()
            .includes(filter.toLowerCase()) ||
          option.getLabel().toLowerCase().includes(filter.toLowerCase())
        );
      }),
    [options, filter],
  );

  if (!filtered.length) return null;

  return (
    <div className="w-full h-fit px-1">
      {hideDivider ? (
        <div className="h-px w-full bg-border my-1"></div>
      ) : null}
      {filtered.map((option, i) => (
        <TimeRangeMenuItem key={i} rillTime={option} timeString={timeString} onClick={onClick} />
      ))}
      {!hideDivider ? <div className="h-px w-full bg-border my-1"></div> : null}
    </div>
  );
}
