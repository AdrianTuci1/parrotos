import { useEffect, useRef, useState } from "react";
import { TIME_COMPARISON } from "@rilldata/web-common/lib/time/config";
import {
  type DashboardTimeControls,
  TimeComparisonOption,
} from "@rilldata/web-common/lib/time/types";
import { DateTime, Interval } from "luxon";
import { V1TimeGrain } from "@rilldata/web-common/runtime-client";
import { V1TimeGrainToDateTimeUnit } from "@rilldata/web-common/lib/time/new-grains";
import { getComparisonInterval } from "@rilldata/web-common/lib/time/comparisons";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { CaretDownIcon } from "../../super-pill/new-time-dropdown/react/icons";
import { RangeDisplay } from "../../super-pill/new-time-dropdown/react/RangeDisplay";
import { CalendarPlusDateInput } from "../../super-pill/new-time-dropdown/react/CalendarPlusDateInput";

type Option = {
  name: TimeComparisonOption;
  key: number;
  start: Date;
  end: Date;
};

/**
 * React translation of `super-pill/components/Comparison.svelte`. The comparison-range
 * selector: a dropdown of comparison options (contiguous / day / week / month / …
 * plus a custom date range). Reuses `getComparisonInterval` and
 * `TIME_COMPARISON` verbatim.
 */
export interface ComparisonProps {
  currentInterval: Interval<true>;
  timeComparisonOptionsState: Option[];
  showComparison: boolean | undefined;
  selectedComparison: DashboardTimeControls | undefined;
  zone: string;
  disabled: boolean;
  showFullRange: boolean;
  minDate?: DateTime | undefined;
  maxDate?: DateTime | undefined;
  onSelectComparisonRange: (name: string, start: Date, end: Date) => void;
  allowCustomTimeRange?: boolean;
  minTimeGrain: V1TimeGrain | undefined;
  timeGrain: V1TimeGrain | undefined;
  side?: "top" | "right" | "bottom" | "left";
}

export function Comparison({
  currentInterval,
  timeComparisonOptionsState,
  showComparison,
  selectedComparison,
  zone,
  disabled,
  showFullRange,
  minDate,
  maxDate,
  onSelectComparisonRange,
  allowCustomTimeRange = true,
  minTimeGrain,
  timeGrain,
  side = "bottom",
}: ComparisonProps) {
  const [open, setOpen] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const interval = selectedComparison?.start
    ? Interval.fromDateTimes(
        DateTime.fromJSDate(selectedComparison.start).setZone(zone),
        DateTime.fromJSDate(selectedComparison.end).setZone(zone),
      )
    : undefined;

  const comparisonOption =
    (selectedComparison?.name as TimeComparisonOption | undefined) || null;
  const firstOption = timeComparisonOptionsState[0];
  const label =
    TIME_COMPARISON[comparisonOption ?? firstOption?.name]?.label ??
    m.time_custom_range();

  const selectedLabel =
    comparisonOption ?? firstOption?.name ?? m.time_custom_range();

  // Dropdown placement relative to the trigger (Svelte `DropdownMenu.Content {side}`).
  const popoverPosition =
    side === "right"
      ? "left-full top-0 ml-1"
      : side === "left"
        ? "right-full top-0 mr-1"
        : side === "top"
          ? "bottom-full left-0 mb-1"
          : "top-full left-0 mt-1";

  // Close on outside click / Escape (Svelte DropdownMenu behavior).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function applyRange(range: Interval<true>) {
    onSelectComparisonRange(
      TimeComparisonOption.CUSTOM,
      range.start.toJSDate(),
      range.end.toJSDate(),
    );
  }

  function onCompareRangeSelect(comparisonOption: TimeComparisonOption) {
    if (currentInterval.isValid && currentInterval.start && currentInterval.end) {
      const comparisonTimeRange = getComparisonInterval(
        currentInterval,
        comparisonOption,
        zone,
      );

      if (!comparisonTimeRange) {
        return;
      }

      onSelectComparisonRange(
        comparisonOption,
        comparisonTimeRange.start.toJSDate(),
        comparisonTimeRange.end.toJSDate(),
      );
    }
  }

  const selectorShouldShow =
    comparisonOption === TimeComparisonOption.CUSTOM && showComparison;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        aria-disabled={disabled}
        aria-label={m.dashboard_select_time_comparison_aria()}
        onClick={() => setOpen((o) => !o)}
      >
        <div className={`gap-x-2 flex ${!showComparison ? "opacity-50" : ""}`}>
          {!timeComparisonOptionsState.length && !showComparison ? (
            <p>{m.time_no_comparison_period()}</p>
          ) : (
            <div className="flex items-center gap-x-1">
              <b className="line-clamp-1">{label}</b>
              {interval?.isValid && showFullRange ? (
                <RangeDisplay interval={interval} timeGrain={timeGrain} />
              ) : null}
            </div>
          )}
        </div>
        <span
          className={`flex-none transition-transform ${open ? "-rotate-180" : ""} ${
            !showComparison ? "opacity-50" : ""
          }`}
        >
          <CaretDownIcon />
        </span>
      </button>

      {open ? (
        <div className={`absolute z-50 ${popoverPosition} w-fit rounded-md border bg-popover p-0 overflow-hidden shadow-md`}>
          <div className="flex">
            <div className="flex flex-col border-r w-48 p-1">
              {timeComparisonOptionsState.map((option) => {
                const preset = TIME_COMPARISON[option.name];
                const selected = selectedLabel === option.name;
                return (
                  <div key={option.name}>
                    <button
                      type="button"
                      className="flex gap-x-2 w-full relative select-none items-center rounded-sm py-1.5 px-2 text-xs outline-none hover:bg-popover-accent"
                      onClick={() => {
                        onCompareRangeSelect(option.name);
                        setOpen(false);
                      }}
                    >
                      <span className={selected ? "font-bold" : ""}>
                        {preset?.label || option.name}
                      </span>
                    </button>
                    {option.name === TimeComparisonOption.CONTIGUOUS &&
                    timeComparisonOptionsState.length > 2 ? (
                      <div className="h-px w-full bg-gray-200 my-1" />
                    ) : null}
                  </div>
                );
              })}
              {allowCustomTimeRange ? (
                <>
                  {timeComparisonOptionsState.length ? (
                    <div className="h-px w-full bg-gray-200 my-1" />
                  ) : null}

                  <button
                    type="button"
                    data-range="custom"
                    className="flex gap-x-2 w-full relative select-none items-center rounded-sm py-1.5 px-2 text-xs outline-none hover:bg-popover-accent"
                    onClick={() => setShowSelector((s) => !s)}
                  >
                    <span
                      className={
                        comparisonOption === TimeComparisonOption.CUSTOM &&
                        showComparison
                          ? "font-bold"
                          : ""
                      }
                    >
                      {m.time_custom()}
                    </span>
                  </button>
                </>
              ) : null}
            </div>

            {(selectorShouldShow || showSelector) ? (
              <div className="bg-surface-background flex flex-col w-60 p-3">
                {!interval || interval?.isValid ? (
                  <CalendarPlusDateInput
                    minTimeGrain={
                      V1TimeGrainToDateTimeUnit[
                        minTimeGrain ?? V1TimeGrain.TIME_GRAIN_MINUTE
                      ]
                    }
                    maxDate={maxDate}
                    minDate={minDate}
                    interval={interval}
                    zone={zone}
                    onApply={applyRange}
                    closeMenu={() => setOpen(false)}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
