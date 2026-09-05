import { useCallback, useMemo, type ReactNode } from "react";
import type { StateManagers } from "@rilldata/web-common/features/dashboards/state-managers/state-managers";
import type { DashboardStateSync } from "@rilldata/web-common/features/dashboards/state-managers/loaders/DashboardStateSync";
import { applyDimensionInListMode as applyDimensionInListModeDirectly } from "@rilldata/web-common/features/dashboards/state-managers/actions/dimension-filters";
import { useTimeControlStore } from "@rilldata/web-common/features/dashboards/time-controls/time-control-store";
import { getMapFromArray } from "@rilldata/web-common/lib/arrayUtils";
import { isExpressionUnsupported } from "@rilldata/web-common/features/dashboards/stores/filter-utils";
import { isUrlTooLong } from "@rilldata/web-common/features/dashboards/url-state/url-length-limits";
import { convertExpressionToFilterParam } from "@rilldata/web-common/features/dashboards/url-state/filters/converters";
import type { MeasureFilterEntry } from "@rilldata/web-common/features/dashboards/filters/measure-filters/measure-filter-entry";
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import type {
  V1ExploreTimeRange,
  V1Expression,
} from "@rilldata/web-common/runtime-client";
import type { RuntimeClient } from "@rilldata/web-common/runtime-client/v2";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { DimensionFilter } from "../dimension-filters/react";
import { MeasureFilter } from "../measure-filters/react";
import FilterButton from "./FilterButton";

/** the height of a row of chips */
const ROW_HEIGHT = "26px";

export interface FiltersProps {
  readOnly?: boolean;
  timeRanges: V1ExploreTimeRange[];
  metricsViewName: string;
  hasTimeSeries: boolean;
  /**
   * The `StateManagers` object that `Filters.svelte` reads from Svelte context
   * (`getStateManagers()`). Passed as a prop because Svelte context is unavailable in
   * React. The framework-agnostic selectors/actions/stores are reused verbatim.
   */
  stateManagers: StateManagers;
  /** Runtime client; defaults to `stateManagers.runtimeClient`. */
  runtimeClient?: RuntimeClient;
  /** Svelte-context `DashboardStateSync` (optional; guards the URL-too-long check). */
  dashboardStateSync?: DashboardStateSync | null;
  /**
   * The time-controls row (`SuperPill`, `ComparisonPill`, "as of" timestamp). Those
   * Svelte components are not ported to React yet, so the host may inject a rendered
   * node here. When omitted the time-series row is skipped.
   */
  timeControls?: ReactNode;
}

/**
 * React translation of `Filters.svelte` (Phase 2.2b-iii): the dashboard filter bar.
 *
 * Composes the already-ported React `DimensionFilter` / `MeasureFilter` chips, the
 * `FilterButton` add-filter menu, and the clear-all button. Reuses the
 * framework-agnostic state-manager selectors/actions and the `useReadable()` bridge for
 * the Svelte store values. The `isExpressionUnsupported` / URL-too-long guards are
 * copied verbatim from the Svelte source. The time-controls row is deferred to the
 * injected `timeControls` node.
 */
export default function Filters({
  readOnly = false,
  metricsViewName,
  hasTimeSeries,
  stateManagers,
  runtimeClient = stateManagers.runtimeClient,
  dashboardStateSync = null,
  timeControls,
}: FiltersProps) {
  const { actions, selectors } = stateManagers;

  // ── Store subscriptions (Svelte `$:` store reads) ─────────────────────────
  const dashboard = useReadable(stateManagers.dashboardStore);
  const timeControlsStore = useTimeControlStore(stateManagers);
  const timeControlsValue = useReadable(timeControlsStore);

  const { timeStart, timeEnd, ready: timeControlsReady } =
    timeControlsValue ?? {};

  const whereFilter = dashboard?.whereFilter;
  const selectedTimeDimension = dashboard?.selectedTimeDimension;

  // hasFilter only checks for complete filters and excludes temporary ones
  const getDimensionFilterItems = useReadable(
    selectors.dimensionFilters.getDimensionFilterItems,
  );
  const getAllDimensionFilterItems = useReadable(
    selectors.dimensionFilters.getAllDimensionFilterItems,
  );
  const getMeasureFilterItems = useReadable(
    selectors.measureFilters.getMeasureFilterItems,
  );
  const getAllMeasureFilterItems = useReadable(
    selectors.measureFilters.getAllMeasureFilterItems,
  );

  const dimensions = useReadable(selectors.dimensions.allDimensions) ?? [];
  const measures = useReadable(selectors.measures.allMeasures) ?? [];

  const dimensionIdMap = useMemo(
    () =>
      getMapFromArray(
        dimensions,
        (dimension) => (dimension.name || dimension.column) as string,
      ),
    [dimensions],
  );
  const measureIdMap = useMemo(
    () => getMapFromArray(measures, (measure) => measure.name as string),
    [measures],
  );

  const currentDimensionFilters = useMemo(
    () => (getDimensionFilterItems ? getDimensionFilterItems(dimensionIdMap) : []),
    [getDimensionFilterItems, dimensionIdMap],
  );
  const currentMeasureFilters = useMemo(
    () => (getMeasureFilterItems ? getMeasureFilterItems(measureIdMap) : []),
    [getMeasureFilterItems, measureIdMap],
  );

  const allDimensionFilters = useMemo(
    () =>
      getAllDimensionFilterItems
        ? getAllDimensionFilterItems(currentDimensionFilters, dimensionIdMap)
        : [],
    [getAllDimensionFilterItems, currentDimensionFilters, dimensionIdMap],
  );
  const allMeasureFilters = useMemo(
    () =>
      getAllMeasureFilterItems
        ? getAllMeasureFilterItems(currentMeasureFilters, measureIdMap)
        : [],
    [getAllMeasureFilterItems, currentMeasureFilters, measureIdMap],
  );

  const hasFilters =
    currentDimensionFilters.length > 0 || currentMeasureFilters.length > 0;

  const isComplexFilter = whereFilter
    ? isExpressionUnsupported(whereFilter)
    : false;

  const dimensionFilterExpressionMap = useMemo(
    () =>
      new Map<string, V1Expression>(
        whereFilter ? [[metricsViewName, whereFilter]] : [],
      ),
    [metricsViewName, whereFilter],
  );

  const filteredSimpleMeasuresFn = useReadable(
    selectors.measures.filteredSimpleMeasures,
  );
  const filteredSimpleMeasures = filteredSimpleMeasuresFn?.() ?? [];
  const dimensionHasFilter =
    useReadable(selectors.dimensionFilters.dimensionHasFilter) ?? (() => false);
  const measureHasFilter =
    useReadable(selectors.measureFilters.measureHasFilter) ?? (() => false);

  // ── Action wrappers (adapt `StateManagerActions` to the React port props) ──
  const {
    dimensionsFilter,
    measuresFilter,
    filters,
  } = actions;

  const handleRemoveDimensionFilter = useCallback(
    async (name: string, _metricsViewNames: string[]) => {
      dimensionsFilter.removeDimensionFilter(name);
    },
    [dimensionsFilter],
  );
  const handleToggleDimensionFilterMode = useCallback(
    async (name: string, _metricsViewNames: string[]) => {
      dimensionsFilter.toggleDimensionFilterMode(name);
    },
    [dimensionsFilter],
  );
  const handleToggleDimensionValueSelections = useCallback(
    async (
      name: string,
      values: string[],
      _metricsViewNames: string[],
      keepPillVisible?: boolean,
      isExclusiveFilter?: boolean,
      exclude?: boolean,
    ) => {
      dimensionsFilter.toggleMultipleDimensionValueSelections(
        name,
        values,
        keepPillVisible ?? true,
        isExclusiveFilter,
        exclude,
      );
    },
    [dimensionsFilter],
  );
  const handleApplyDimensionInListMode = useCallback(
    async (name: string, values: string[], _metricsViewNames: string[]) => {
      dimensionsFilter.applyDimensionInListMode(name, values);
    },
    [dimensionsFilter],
  );
  const handleApplyDimensionContainsMode = useCallback(
    async (name: string, searchText: string, _metricsViewNames: string[]) => {
      dimensionsFilter.applyDimensionContainsMode(name, searchText);
    },
    [dimensionsFilter],
  );

  const handleMeasureFilterApply = useCallback(
    (
      dimension: string,
      measureName: string,
      oldDimension: string,
      filter: MeasureFilterEntry,
    ) => {
      if (oldDimension && oldDimension !== dimension) {
        measuresFilter.removeMeasureFilter(oldDimension, measureName);
      }
      measuresFilter.setMeasureFilter(dimension, filter);
    },
    [measuresFilter],
  );

  const handleSetTemporaryFilterName = useCallback(
    (name: string) => filters.setTemporaryFilterName(name),
    [filters],
  );
  const handleClearAllFilters = useCallback(
    () => filters.clearAllFilters(),
    [filters],
  );

  const isUrlTooLongAfterInListFilter = useCallback(
    (dimensionName: string, values: string[]) => {
      if (!dashboardStateSync || !dashboard) return false;

      const exploreState = structuredClone(dashboard);
      applyDimensionInListModeDirectly(
        { dashboard: exploreState },
        dimensionName,
        values,
      );
      const url = dashboardStateSync.getUrlForExploreState(exploreState);
      return isUrlTooLong(url);
    },
    [dashboardStateSync, dashboard],
  );

  return (
    <div className="flex flex-col gap-y-2 size-full">
      {hasTimeSeries ? timeControls ?? null : null}

      <div className="relative flex flex-row gap-x-2 gap-y-2 items-start">
        {!readOnly ? (
          <FilterIcon
            size="16px"
            className="text-fg-secondary flex-none mt-[5px]"
          />
        ) : null}

        <div className="relative flex flex-row flex-wrap gap-x-2 gap-y-2">
          {isComplexFilter && whereFilter ? (
            <AdvancedFilterChip advancedFilter={whereFilter} />
          ) : !allDimensionFilters.length && !allMeasureFilters.length ? (
            <div
              className="text-fg-muted grid ml-1 items-center"
              style={{ minHeight: ROW_HEIGHT }}
            >
              {m.dashboard_no_filters_selected()}
            </div>
          ) : (
            <>
              {allDimensionFilters.map((filterData) => (
                <div key={filterData.name}>
                  <DimensionFilter
                    client={runtimeClient}
                    expressionMap={dimensionFilterExpressionMap}
                    filterData={filterData}
                    readOnly={readOnly}
                    timeStart={timeStart}
                    timeEnd={timeEnd}
                    timeDimension={selectedTimeDimension}
                    timeControlsReady={timeControlsReady}
                    removeDimensionFilter={handleRemoveDimensionFilter}
                    toggleDimensionFilterMode={
                      handleToggleDimensionFilterMode
                    }
                    toggleDimensionValueSelections={
                      handleToggleDimensionValueSelections
                    }
                    applyDimensionInListMode={
                      handleApplyDimensionInListMode
                    }
                    applyDimensionContainsMode={
                      handleApplyDimensionContainsMode
                    }
                    isUrlTooLongAfterInListFilter={(values) =>
                      isUrlTooLongAfterInListFilter(filterData.name, values)
                    }
                  />
                </div>
              ))}
              {allMeasureFilters.map((filterData) => (
                <div key={filterData.name}>
                  <MeasureFilter
                    filterData={filterData}
                    allDimensions={dimensions}
                    onRemove={() =>
                      measuresFilter.removeMeasureFilter(
                        filterData.dimensionName,
                        filterData.name,
                      )
                    }
                    onApply={({ dimension, oldDimension, filter }) =>
                      handleMeasureFilterApply(
                        dimension,
                        filterData.name,
                        oldDimension,
                        filter,
                      )
                    }
                  />
                </div>
              ))}
            </>
          )}

          {!readOnly ? (
            <>
              <FilterButton
                allDimensions={dimensions}
                filteredSimpleMeasures={filteredSimpleMeasures}
                dimensionHasFilter={dimensionHasFilter}
                measureHasFilter={measureHasFilter}
                setTemporaryFilterName={handleSetTemporaryFilterName}
              />
              {/* if filters are present, place a chip at the end of the flex container
                  that enables clearing all filters */}
              {hasFilters ? (
                <button
                  type="button"
                  className="flex flex-none text-center items-center justify-center text-xs leading-snug font-normal text-fg-muted p-0 hover:text-primary-700 active:text-primary-800"
                  onClick={handleClearAllFilters}
                >
                  {m.dashboard_clear_filters()}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** React translation of `AdvancedFilter.svelte` (complex-filter pill). */
function AdvancedFilterChip({ advancedFilter }: { advancedFilter: V1Expression }) {
  const filterText = convertExpressionToFilterParam(advancedFilter);
  return (
    <div
      className="flex flex-none px-2 py-[3px] max-h-[26px] border bg-surface-subtle border-gray-200 text-fg-primary rounded-2xl"
      title={m.filter_advanced_warning()}
    >
      <span className="font-bold mr-1">{m.filter_advanced_beta()}</span>
      <span>{filterText}</span>
    </div>
  );
}

/** React stand-in for the `Filter.svelte` icon. */
function FilterIcon({
  size = "16px",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Filter Icon"
    >
      <path
        d="M9.18756 13.1251L5.37982 8.625H18.6204L14.8126 13.1251V19.8751C14.8126 20.4731 14.3462 20.9621 13.7573 20.998L9.18756 17.6556V13.1251Z"
        fill="currentColor"
      />
      <path
        d="M10.8751 12.507V18.8899L9.18758 17.6556V13.1251L3.26619 6.12713C3.09432 5.924 3 5.66652 3 5.40044V4.12501C3 3.50369 3.50369 3 4.12501 3H19.8752C20.4966 3 21.0002 3.50369 21.0002 4.12501V5.40044C21.0002 5.66652 20.9059 5.924 20.734 6.12713L14.8127 13.1251V19.8752C14.8127 20.4731 14.3462 20.9621 13.7574 20.9981L13.1251 20.5356V12.507L19.3127 5.19438V4.68752H4.68752V5.19438L10.8751 12.507Z"
        fill="currentColor"
      />
    </svg>
  );
}
