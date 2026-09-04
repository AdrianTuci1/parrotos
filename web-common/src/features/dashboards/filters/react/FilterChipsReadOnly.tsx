import { useMemo } from "react";
import type {
  MetricsViewSpecDimension,
  MetricsViewSpecMeasure,
  V1Expression,
  V1TimeRange,
} from "@rilldata/web-common/runtime-client";
import type { DimensionThresholdFilter } from "@rilldata/web-common/features/dashboards/stores/explore-state";
import { getMapFromArray } from "@rilldata/web-common/lib/arrayUtils";
import { getRangeLabel } from "@rilldata/web-common/features/dashboards/time-controls/new-time-controls";
import { getComparisonLabel } from "@rilldata/web-common/lib/time/comparisons";
import { getDimensionFilters } from "@rilldata/web-common/features/dashboards/state-managers/selectors/dimension-filters";
import { getMeasureFilters } from "@rilldata/web-common/features/dashboards/state-managers/selectors/measure-filters";
import { DimensionFilterMode } from "@rilldata/web-common/features/dashboards/filters/dimension-filters/constants";

const chipBase =
  "inline-flex items-center gap-x-1.5 h-7 px-2.5 rounded-full border border-border " +
  "bg-bg-secondary text-xs text-fg-primary whitespace-nowrap";

export interface FilterChipsReadOnlyProps {
  metricsViewNames: string[];
  dimensions: MetricsViewSpecDimension[];
  measures: MetricsViewSpecMeasure[];
  filters: V1Expression | undefined;
  dimensionsWithInlistFilter: string[];
  dimensionThresholdFilters: DimensionThresholdFilter[];
  displayTimeRange: V1TimeRange | undefined;
  displayComparisonTimeRange?: V1TimeRange | undefined;
  queryTimeStart?: string | undefined;
  queryTimeEnd?: string | undefined;
  hasBoldTimeRange?: boolean;
  chipLayout?: "wrap" | "scroll";
}

/**
 * React translation of `FilterChipsReadOnly.svelte`. Renders the read-only chip strip
 * used on chart headers: time range + dimension chips + measure chips.
 *
 * Read-only by design (display only). The interactive dimension/measure dropdowns and
 * the `panel/filter-bar` mutations are a later increment; here we render the active
 * filters from the given expression and threshold state.
 */
export default function FilterChipsReadOnly({
  metricsViewNames,
  dimensions,
  measures,
  filters,
  dimensionsWithInlistFilter,
  dimensionThresholdFilters,
  displayTimeRange,
  displayComparisonTimeRange,
  hasBoldTimeRange = false,
  chipLayout = "wrap",
}: FilterChipsReadOnlyProps) {
  const dimensionIdMap = useMemo(
    () => getMapFromArray(dimensions, (d) => d.name as string),
    [dimensions],
  );
  const dimensionFilters = useMemo(
    () =>
      getDimensionFilters(
        dimensionIdMap,
        filters,
        dimensionsWithInlistFilter,
        metricsViewNames[0],
      ),
    [dimensionIdMap, filters, dimensionsWithInlistFilter, metricsViewNames],
  );

  const measureIdMap = useMemo(
    () => getMapFromArray(measures, (m) => m.name as string),
    [measures],
  );
  const measureFilters = useMemo(
    () => getMeasureFilters(measureIdMap, dimensionThresholdFilters),
    [measureIdMap, dimensionThresholdFilters],
  );

  return (
    <div
      className={`relative flex flex-row items-center gap-x-2 gap-y-2 w-full max-w-full ${
        chipLayout === "scroll"
          ? "overflow-x-auto whitespace-nowrap overscroll-x-contain pr-2 scrollbar-none"
          : "flex-wrap"
      }`}
      aria-label="Read only filter chips"
    >
      {displayTimeRange ? (
        <TimeRangeReadOnly
          timeRange={displayTimeRange}
          comparisonTimeRange={displayComparisonTimeRange}
          hasBoldTimeRange={hasBoldTimeRange}
        />
      ) : null}

      {dimensionFilters.map((filterData) => {
        const dimension = filterData.dimensions.get(metricsViewNames[0]);
        if (!dimension) return null;
        const label =
          dimension.displayName ||
          dimension.name ||
          dimension.column ||
          "Unnamed Dimension";
        const values = filterData.selectedValues ?? [];
        const mode =
          filterData.mode === DimensionFilterMode.Contains
            ? `~${filterData.inputText ?? ""}`
            : values.join(", ");
        return (
          <span key={filterData.name} className={chipBase}>
            <span className="text-fg-secondary">{label}:</span>
            {filterData.isInclude === false ? <span className="text-fg-secondary">not</span> : null}
            <span className="max-w-[18rem] truncate">
              {mode || (filterData.isInclude === false ? "" : "…")}
            </span>
          </span>
        );
      })}

      {measureFilters.map(({ name, label, dimensionName }) => (
        <span key={name} className={chipBase}>
          <span className="text-fg-secondary">{label || name}</span>
          {dimensionName ? (
            <span className="text-fg-secondary">
              by {dimensionName}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

/** React translation of `TimeRangeReadOnly.svelte` (chip + comparison chip). */
export function TimeRangeReadOnly({
  timeRange,
  comparisonTimeRange,
  hasBoldTimeRange = false,
}: {
  timeRange: V1TimeRange;
  comparisonTimeRange?: V1TimeRange | undefined;
  hasBoldTimeRange?: boolean;
}) {
  const selectedLabel = getRangeLabel(timeRange.isoDuration ?? timeRange.expression);
  const showRange =
    selectedLabel === "Custom" ||
    selectedLabel?.startsWith("-") ||
    !isNaN(Number(selectedLabel?.[0]));

  return (
    <span className={chipBase}>
      <span className="font-bold">{showRange ? "Custom" : selectedLabel}</span>
      {comparisonTimeRange ? (
        <span className="text-fg-secondary">
          vs{" "}
          <span className={hasBoldTimeRange ? "font-bold" : ""}>
            {getComparisonLabel(comparisonTimeRange)}
          </span>
        </span>
      ) : null}
    </span>
  );
}
