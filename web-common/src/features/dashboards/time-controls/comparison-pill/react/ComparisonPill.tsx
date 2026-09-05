import { useMemo } from "react";
import type { StateManagers } from "@rilldata/web-common/features/dashboards/state-managers/state-managers";
import {
  TimeComparisonOption,
  TimeRangePreset,
  type DashboardTimeControls,
  type TimeRange,
} from "@rilldata/web-common/lib/time/types";
import { DateTime, Interval } from "luxon";
import { SortType } from "@rilldata/web-common/features/dashboards/proto-state/derived-types";
import type { V1MetricsViewSpec, V1TimeGrain } from "@rilldata/web-common/runtime-client";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { metricsExplorerStore } from "@rilldata/web-common/features/dashboards/stores/dashboard-stores";
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import { Comparison } from "./Comparison";

/**
 * React translation of `time-controls/comparison-pill/ComparisonPill.svelte`. The
 * time-comparison toggle plus the comparison-range selector in the filter bar.
 *
 * The Svelte `getStateManagers()` context is replaced by the `stateManagers` prop; the
 * `metricsExplorerStore` actions and the `timeRangeSelectors`/`sorting` selectors are
 * reused verbatim via the `useReadable()` bridge.
 */
export interface ComparisonPillProps {
  allTimeRange: TimeRange;
  selectedTimeRange: DashboardTimeControls | undefined;
  showTimeComparison: boolean;
  minTimeGrain: V1TimeGrain | undefined;
  selectedComparisonTimeRange: DashboardTimeControls | undefined;
  stateManagers: StateManagers;
}

export default function ComparisonPill({
  allTimeRange,
  selectedTimeRange,
  showTimeComparison,
  minTimeGrain,
  selectedComparisonTimeRange,
  stateManagers,
}: ComparisonPillProps) {
  const {
    selectors: {
      timeRangeSelectors: { timeComparisonOptionsState },
      sorting: { sortType },
    },
    actions: {
      sorting: { toggleSort },
    },
  } = stateManagers;

  const exploreName = useReadable(stateManagers.exploreName);
  const exploreState = useReadable(stateManagers.dashboardStore);
  const metricsViewSpec = useReadable(stateManagers.validSpecStore);
  const timeComparisonOptionsStateValue = useReadable(
    timeComparisonOptionsState,
  );
  const sortTypeValue = useReadable(sortType);

  const activeTimeZone = exploreState?.selectedTimezone;

  const interval = useMemo(() => {
    if (selectedTimeRange) {
      return Interval.fromDateTimes(
        DateTime.fromJSDate(selectedTimeRange.start).setZone(activeTimeZone),
        DateTime.fromJSDate(selectedTimeRange.end).setZone(activeTimeZone),
      );
    }
    return Interval.fromDateTimes(allTimeRange.start, allTimeRange.end);
  }, [selectedTimeRange, allTimeRange, activeTimeZone]);

  const metricsViewSpecValue = (metricsViewSpec?.data?.metricsView ??
    {}) as V1MetricsViewSpec;

  const activeTimeGrain = selectedTimeRange?.interval;

  function onSelectComparisonRange(
    name: TimeComparisonOption,
    start: Date,
    end: Date,
  ) {
    if (!exploreName) return;
    metricsExplorerStore.setSelectedComparisonRange(
      exploreName,
      { name, start, end },
      metricsViewSpecValue,
    );
  }

  const disabled =
    selectedTimeRange?.name === TimeRangePreset.ALL_TIME || undefined;

  function handleToggle() {
    if (!exploreName) return;
    metricsExplorerStore.displayTimeComparison(exploreName, !showTimeComparison);

    if (
      (showTimeComparison &&
        (sortTypeValue === SortType.DELTA_PERCENT ||
          sortTypeValue === SortType.DELTA_ABSOLUTE)) ||
      (!showTimeComparison && sortTypeValue === SortType.PERCENT)
    ) {
      toggleSort(SortType.VALUE);
    }
  }

  return (
    <div
      className="flex w-fit h-7 rounded-full overflow-hidden select-none"
      title={
        disabled && "Comparison not available when viewing all time range"
      }
    >
      <button
        disabled={disabled}
        className="flex gap-x-1.5 cursor-pointer"
        onClick={handleToggle}
        aria-label={m.dashboard_toggle_time_comparison_aria()}
      >
        <div className="pointer-events-none flex items-center gap-x-1.5">
          <span
            role="switch"
            aria-checked={showTimeComparison}
            className={`relative inline-flex h-5 w-9 items-center rounded-full ${
              showTimeComparison ? "bg-primary-600" : "bg-gray-300"
            } ${disabled ? "opacity-50" : ""}`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                showTimeComparison ? "translate-x-4" : "translate-x-1"
              }`}
            />
          </span>

          <label className="font-normal text-xs cursor-pointer">
            <span className={disabled ? "opacity-50" : ""}>
              {m.time_comparing()}
            </span>
          </label>
        </div>
      </button>

      {activeTimeGrain && interval.isValid ? (
        <Comparison
          maxDate={DateTime.fromJSDate(allTimeRange.end)}
          minDate={DateTime.fromJSDate(allTimeRange.start)}
          timeComparisonOptionsState={timeComparisonOptionsStateValue ?? []}
          minTimeGrain={minTimeGrain}
          timeGrain={activeTimeGrain}
          selectedComparison={selectedComparisonTimeRange}
          showComparison={showTimeComparison}
          currentInterval={interval}
          zone={activeTimeZone ?? "UTC"}
          showFullRange={true}
          onSelectComparisonRange={onSelectComparisonRange}
          disabled={disabled ?? false}
        />
      ) : null}
    </div>
  );
}
