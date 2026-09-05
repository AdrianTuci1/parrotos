/**
 * React translation of `features/dashboards/leaderboard/Leaderboard.svelte`
 * (Phase 2.3-ii: dimension top-N bar/list).
 *
 * Keep faithful to the Svelte view:
 * - Aggregation queries (sorted, totals, below-the-fold) are driven with
 *   `@tanstack/react-query` via `getQueryServiceMetricsViewAggregationQueryOptions`
 *   (the framework-agnostic runtime-client) instead of the svelte-query
 *   `createQueryServiceMetricsViewAggregation`.
 * - The Svelte `$:` reactive derivations (where filter, measures, sort, above/below
 *   the fold rows, column widths, max values) are re-expressed with `useMemo`.
 * - The Svelte `valueColumn` / `deltaColumn` width stores and the `selectedValues`
 *   store are read through the `useReadable()` bridge.
 * - The IntersectionObserver that reveals the queries once the leaderboard scrolls
 *   into view is reproduced with a ref + `useEffect`.
 *
 * Deferred (documented runtime checks, see report): the React host must provide a
 * `QueryClientProvider` so `useQuery` resolves; the scoped Svelte `<style>` blocks
 * (row hover, sticky dimension cell) are not transferred; the `in:fly` entrance
 * transitions in the header are dropped.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Readable } from "svelte/store";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { DashboardState_LeaderboardSortType } from "@rilldata/web-common/proto/gen/rill/ui/v1/dashboard_pb";
import type {
  MetricsViewSpecDimension,
  MetricsViewSpecMeasure,
  V1Expression,
  V1MetricsViewAggregationMeasure,
  V1MetricsViewAggregationResponseDataItem,
  V1TimeRange,
} from "@rilldata/web-common/runtime-client";
import {
  getQueryServiceMetricsViewAggregationQueryOptions,
  V1Operation,
} from "@rilldata/web-common/runtime-client";
import type { RuntimeClient } from "@rilldata/web-common/runtime-client/v2";
import type { DimensionThresholdFilter } from "@rilldata/web-common/features/dashboards/stores/explore-state";
import {
  getComparisonRequestMeasures,
  getURIRequestMeasure,
} from "../../dashboard-utils";
import { mergeDimensionAndMeasureFilters } from "../../filters/measure-filters/measure-filter-utils";
import { SortType } from "../../proto-state/derived-types";
import { getFiltersForOtherDimensions } from "../../selectors";
import { getMeasuresForDimensionOrLeaderboardDisplay } from "../../state-managers/selectors/dashboard-queries";
import {
  createAndExpression,
  createOrExpression,
  isExpressionUnsupported,
  sanitiseExpression,
} from "../../stores/filter-utils";
import {
  cleanUpComparisonValue,
  compareLeaderboardValues,
  getLeaderboardMaxValues,
  getSort,
  prepareLeaderboardItemData,
} from "../leaderboard-utils";
import {
  COMPARISON_COLUMN_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  deltaColumn,
  valueColumn,
} from "../leaderboard-widths";
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import LeaderboardHeader from "./LeaderboardHeader";
import LeaderboardRow from "./LeaderboardRow";
import { DelayedLoadingRows, Tooltip } from "./primitives";

const gutterWidth = 24;

export interface LeaderboardProps {
  /** React-propagated runtime client (Svelte context is unavailable in React). */
  runtimeClient: RuntimeClient;
  dimension: MetricsViewSpecDimension;
  timeRange: V1TimeRange;
  comparisonTimeRange?: V1TimeRange | undefined;
  /** Svelte store produced by `selectedDimensionValues`; read via `useReadable`. */
  selectedValues?: Readable<{ data?: string[] }> | undefined;
  whereFilter: V1Expression;
  dimensionThresholdFilters: DimensionThresholdFilter[];
  leaderboardSortByMeasureName: string;
  leaderboardMeasures: MetricsViewSpecMeasure[];
  leaderboardShowContextForAllMeasures: boolean;
  metricsViewName: string;
  sortType: SortType;
  slice?: number;
  tableWidth: number;
  sortedAscending: boolean;
  timeControlsReady: boolean;
  dimensionColumnWidth: number;
  filterExcludeMode: boolean;
  isBeingCompared: boolean;
  parentElement?: HTMLElement | undefined;
  allowExpandTable?: boolean;
  allowDimensionComparison?: boolean;
  visible?: boolean;
  formatters: Record<
    string,
    (value: number | string | null | undefined) => string | null | undefined
  >;
  tooltipFormatters: Record<
    string,
    (value: number | string | null | undefined) => string | null | undefined
  >;
  isValidPercentOfTotal: (measureName: string) => boolean;
  measureLabel: (measureName: string) => string;
  toggleDimensionValueSelection: (
    dimensionName: string,
    dimensionValue: string,
    keepPillVisible?: boolean | undefined,
    isExclusiveFilter?: boolean | undefined,
  ) => void;
  setPrimaryDimension?: (dimensionName: string) => void;
  toggleSort: (sortType: DashboardState_LeaderboardSortType) => void;
  toggleComparisonDimension?: (dimensionName: string | undefined) => void;
  // When set, the dimension column becomes resizable and the new width is
  // reported through this callback.
  onDimensionColumnResize?: ((width: number) => void) | null;
}

export default function Leaderboard({
  runtimeClient,
  dimension,
  timeRange,
  comparisonTimeRange = undefined,
  selectedValues = undefined,
  whereFilter,
  dimensionThresholdFilters,
  leaderboardSortByMeasureName,
  leaderboardMeasures,
  leaderboardShowContextForAllMeasures,
  metricsViewName,
  sortType,
  slice = 7,
  tableWidth,
  sortedAscending,
  timeControlsReady,
  dimensionColumnWidth,
  filterExcludeMode,
  isBeingCompared,
  parentElement = undefined,
  allowExpandTable = true,
  allowDimensionComparison = true,
  visible = false,
  formatters,
  tooltipFormatters,
  isValidPercentOfTotal,
  measureLabel,
  toggleDimensionValueSelection,
  setPrimaryDimension = () => {},
  toggleSort,
  toggleComparisonDimension = () => {},
  onDimensionColumnResize = null,
}: LeaderboardProps) {
  const [hovered, setHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(visible);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableHeight, setTableHeight] = useState(0);

  const queryLimit = slice + 1;
  const maxValuesToShow = slice * 2;

  const valueColumnWidth = useReadable(valueColumn);
  const deltaColumnWidth = useReadable(deltaColumn);
  const selected = useReadable(selectedValues);
  const selectedData = useMemo(() => selected?.data ?? [], [selected]);

  const { name: dimensionName = "", description = "", displayName = "", uri } = dimension;

  const leaderboardMeasureNames = useMemo(
    () => leaderboardMeasures.map((measure) => measure.name!),
    [leaderboardMeasures],
  );

  const lowerIsBetterMap = useMemo(
    () =>
      Object.fromEntries(
        leaderboardMeasures.map((measure) => [measure.name!, measure.lowerIsBetter ?? false]),
      ),
    [leaderboardMeasures],
  );

  const atLeastOneActive = Boolean(selectedData.length);

  // Reveal the queries once the leaderboard scrolls into view.
  useEffect(() => {
    if (!parentElement) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (containerRef.current) observer.unobserve(containerRef.current);
        }
      },
      { root: parentElement, rootMargin: "120px", threshold: 0 },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [parentElement]);

  // Track the table height so the resize handle spans all rows.
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const update = () => setTableHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isTimeComparisonActive = !!comparisonTimeRange;

  const measuresWithContext = useMemo(
    () =>
      new Set(
        leaderboardShowContextForAllMeasures
          ? leaderboardMeasureNames
          : [leaderboardSortByMeasureName],
      ),
    [leaderboardShowContextForAllMeasures, leaderboardMeasureNames, leaderboardSortByMeasureName],
  );

  const isComplexFilter = isExpressionUnsupported(whereFilter);
  const where = isComplexFilter
    ? whereFilter
    : sanitiseExpression(
        mergeDimensionAndMeasureFilters(
          getFiltersForOtherDimensions(whereFilter, dimensionName),
          dimensionThresholdFilters,
        ),
        undefined,
      );

  const measures = useMemo(() => {
    const baseMeasures = getMeasuresForDimensionOrLeaderboardDisplay(
      leaderboardShowContextForAllMeasures ? null : leaderboardSortByMeasureName,
      dimensionThresholdFilters,
      leaderboardMeasureNames,
    ).map((name) => ({ name }) as V1MetricsViewAggregationMeasure);

    const comparisonMeasures = comparisonTimeRange
      ? (leaderboardShowContextForAllMeasures
          ? leaderboardMeasureNames
          : [leaderboardSortByMeasureName]
        ).flatMap((name) => getComparisonRequestMeasures(name))
      : [];

    const uriMeasures = uri ? [getURIRequestMeasure(dimensionName)] : [];

    return [...baseMeasures, ...comparisonMeasures, ...uriMeasures];
  }, [
    leaderboardShowContextForAllMeasures,
    leaderboardSortByMeasureName,
    dimensionThresholdFilters,
    leaderboardMeasureNames,
    comparisonTimeRange,
    uri,
    dimensionName,
  ]);

  const sort = useMemo(
    () =>
      getSort(
        sortedAscending,
        sortType,
        leaderboardSortByMeasureName,
        dimensionName,
        !!comparisonTimeRange,
      ),
    [sortedAscending, sortType, leaderboardSortByMeasureName, dimensionName, comparisonTimeRange],
  );

  const sortedQuery = useQuery({
    ...getQueryServiceMetricsViewAggregationQueryOptions(runtimeClient, {
      metricsView: metricsViewName,
      dimensions: [{ name: dimensionName }],
      measures,
      timeRange,
      comparisonTimeRange,
      sort,
      where,
      limit: queryLimit.toString(),
      offset: "0",
    }),
    enabled: isVisible && timeControlsReady,
  });

  const totalsQuery = useQuery({
    ...getQueryServiceMetricsViewAggregationQueryOptions(runtimeClient, {
      metricsView: metricsViewName,
      measures: leaderboardMeasureNames.map((name) => ({ name })),
      where,
      timeRange,
    }),
    enabled: timeControlsReady && isVisible,
  });

  const sortedData = sortedQuery.data;
  const totalsData = totalsQuery.data;

  const leaderboardTotals = useMemo(() => {
    if (!totalsData?.data?.[0]) return {};
    return Object.fromEntries(
      leaderboardMeasureNames.map((name) => [
        name,
        (totalsData.data?.[0]?.[name] as number) ?? null,
      ]),
    );
  }, [totalsData, leaderboardMeasureNames]);

  const { aboveTheFold, belowTheFoldValues, noAvailableValues, showExpandTable } =
    useMemo(
      () =>
        prepareLeaderboardItemData(
          sortedData?.data,
          dimensionName,
          leaderboardMeasureNames,
          slice,
          selectedData ?? [],
          leaderboardTotals,
        ),
      [sortedData, dimensionName, leaderboardMeasureNames, slice, selectedData, leaderboardTotals],
    );

  const belowTheFoldDataLimit = maxValuesToShow - aboveTheFold.length;

  const belowTheFoldDataQuery = useQuery({
    ...getQueryServiceMetricsViewAggregationQueryOptions(runtimeClient, {
      metricsView: metricsViewName,
      dimensions: [{ name: dimensionName }],
      where: sanitiseExpression(
        createAndExpression(
          [
            createOrExpression(
              belowTheFoldValues.map((dimensionValue) => ({
                cond: {
                  op: V1Operation.OPERATION_EQ,
                  exprs: [{ ident: dimensionName }, { val: dimensionValue }],
                },
              })),
            ),
          ].concat(where ?? []),
        ),
        undefined,
      ),
      sort,
      timeRange,
      comparisonTimeRange,
      measures,
      limit: belowTheFoldDataLimit.toString(),
    }),
    enabled:
      !!belowTheFoldValues.length &&
      timeControlsReady &&
      isVisible &&
      belowTheFoldDataLimit > 0,
  });

  const belowTheFoldData: V1MetricsViewAggregationResponseDataItem[] =
    belowTheFoldDataQuery.data?.data?.length
      ? belowTheFoldDataQuery.data.data
      : (belowTheFoldValues
          .map((value) => ({
            [dimensionName]: value,
            [leaderboardSortByMeasureName]: null,
          }))
          .slice(0, belowTheFoldDataLimit) as V1MetricsViewAggregationResponseDataItem[]);

  const belowTheFoldRows = useMemo(
    () =>
      belowTheFoldData.map((item) =>
        cleanUpComparisonValue(
          item,
          dimensionName,
          leaderboardMeasureNames,
          leaderboardTotals,
          selectedData.findIndex((value) =>
            compareLeaderboardValues(value, item[dimensionName]),
          ) ?? -1,
        ),
      ),
    [
      belowTheFoldData,
      dimensionName,
      leaderboardMeasureNames,
      leaderboardTotals,
      selectedData,
    ],
  );

  const columnCount =
    1 +
    leaderboardMeasureNames.reduce(
      (count, measureName) =>
        count +
        1 +
        (measuresWithContext.has(measureName)
          ? (isValidPercentOfTotal(measureName) ? 1 : 0) +
            (isTimeComparisonActive ? 2 : 0)
          : 0),
      0,
    );

  // Maximum values for relative magnitude bar sizing (above + below the fold).
  const maxValues = useMemo(
    () => getLeaderboardMaxValues([...aboveTheFold, ...belowTheFoldRows], leaderboardMeasures),
    [aboveTheFold, belowTheFoldRows, leaderboardMeasures],
  );

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

  return (
    <div
      className="flex flex-col"
      aria-label={m.dashboard_dimension_leaderboard_aria({ name: dimensionName })}
      role="table"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <table
        ref={tableRef}
        style={{ width: `${tableWidth + gutterWidth}px` }}
      >
        <colgroup>
          <col data-gutter-column style={{ width: `${gutterWidth}px` }} />
          <col data-dimension-column style={{ width: `${dimensionColumnWidth}px` }} />
          {leaderboardMeasureNames.map((measureName) => (
            <MeasureCols
              key={measureName}
              measureName={measureName}
              valueColumnWidth={valueColumnWidth}
              deltaColumnWidth={deltaColumnWidth}
              isValidPercentOfTotal={isValidPercentOfTotal}
              measuresWithContext={measuresWithContext}
              isTimeComparisonActive={isTimeComparisonActive}
            />
          ))}
        </colgroup>

        <LeaderboardHeader
          allowDimensionComparison={allowDimensionComparison}
          allowExpandTable={allowExpandTable}
          hovered={hovered}
          displayName={displayName || dimensionName}
          dimensionDescription={description}
          dimensionName={dimensionName}
          isBeingCompared={isBeingCompared}
          isFetching={sortedQuery.isLoading}
          sortType={sortType}
          isValidPercentOfTotal={isValidPercentOfTotal}
          isTimeComparisonActive={isTimeComparisonActive}
          sortedAscending={sortedAscending}
          leaderboardMeasureNames={leaderboardMeasureNames}
          measuresWithContext={measuresWithContext}
          toggleSort={toggleSort}
          setPrimaryDimension={setPrimaryDimension}
          toggleComparisonDimension={toggleComparisonDimension}
          leaderboardSortByMeasureName={leaderboardSortByMeasureName}
          measureLabel={measureLabel}
          dimensionColumnWidth={dimensionColumnWidth}
          onDimensionColumnResize={onDimensionColumnResize}
          tableHeight={tableHeight}
        />

        <tbody>
          <DelayedLoadingRows
            isLoading={sortedQuery.isLoading}
            isPending={sortedQuery.isPending}
            isFetching={sortedQuery.isFetching}
            rowCount={aboveTheFold.length}
            columnCount={columnCount + 1}
          >
            {aboveTheFold.map((itemData) => (
              <LeaderboardRow
                key={itemData.dimensionValue}
                isBeingCompared={isBeingCompared}
                filterExcludeMode={filterExcludeMode}
                atLeastOneActive={atLeastOneActive}
                dimensionName={dimensionName}
                itemData={itemData}
                isValidPercentOfTotal={isValidPercentOfTotal}
                measuresWithContext={measuresWithContext}
                isTimeComparisonActive={isTimeComparisonActive}
                leaderboardMeasureNames={leaderboardMeasureNames}
                toggleDimensionValueSelection={toggleDimensionValueSelection}
                formatters={formatters}
                tooltipFormatters={tooltipFormatters}
                dimensionColumnWidth={dimensionColumnWidth}
                maxValues={maxValues}
                lowerIsBetterMap={lowerIsBetterMap}
              />
            ))}
          </DelayedLoadingRows>

          {belowTheFoldRows.map((itemData, i) => (
            <LeaderboardRow
              key={itemData.dimensionValue}
              itemData={itemData}
              dimensionName={dimensionName}
              isBeingCompared={isBeingCompared}
              filterExcludeMode={filterExcludeMode}
              atLeastOneActive={atLeastOneActive}
              isValidPercentOfTotal={isValidPercentOfTotal}
              measuresWithContext={measuresWithContext}
              isTimeComparisonActive={isTimeComparisonActive}
              leaderboardMeasureNames={leaderboardMeasureNames}
              borderTop={i === 0}
              borderBottom={i === belowTheFoldRows.length - 1}
              toggleDimensionValueSelection={toggleDimensionValueSelection}
              formatters={formatters}
              tooltipFormatters={tooltipFormatters}
              dimensionColumnWidth={dimensionColumnWidth}
              maxValues={maxValues}
              lowerIsBetterMap={lowerIsBetterMap}
            />
          ))}
        </tbody>
      </table>

      {allowExpandTable && showExpandTable ? (
        <Tooltip
          location="right"
          content={m.leaderboard_expand_tooltip()}
        >
          <button
            className="transition-color text-fg-muted table-message"
            onClick={() => setPrimaryDimension(dimensionName)}
          >
            <div className="pl-8 text-fg-muted">{m.leaderboard_expand_table()}</div>
          </button>
        </Tooltip>
      ) : noAvailableValues ? (
        <div className="table-message text-fg-muted">
          <div className="pl-8">{m.leaderboard_no_available_values()}</div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Renders the `<col>` elements for one measure, mirroring the colgroup block in
 * `Leaderboard.svelte`.
 */
function MeasureCols({
  measureName,
  valueColumnWidth,
  deltaColumnWidth,
  isValidPercentOfTotal,
  measuresWithContext,
  isTimeComparisonActive,
}: {
  measureName: string;
  valueColumnWidth: number | undefined;
  deltaColumnWidth: number | undefined;
  isValidPercentOfTotal: (measureName: string) => boolean;
  measuresWithContext: Set<string>;
  isTimeComparisonActive: boolean;
}) {
  return (
    <Fragment key={measureName}>
      <col data-measure-column style={{ width: `${valueColumnWidth ?? DEFAULT_COLUMN_WIDTH}px` }} />
      {isValidPercentOfTotal(measureName) && measuresWithContext.has(measureName) ? (
        <col
          data-percent-of-total-column
          style={{ width: `${COMPARISON_COLUMN_WIDTH}px` }}
        />
      ) : null}
      {isTimeComparisonActive && measuresWithContext.has(measureName) ? (
        <col data-absolute-change-column style={{ width: `${deltaColumnWidth ?? COMPARISON_COLUMN_WIDTH}px` }} />
      ) : null}
      {isTimeComparisonActive && measuresWithContext.has(measureName) ? (
        <col data-percent-change-column style={{ width: `${COMPARISON_COLUMN_WIDTH}px` }} />
      ) : null}
    </Fragment>
  );
}
