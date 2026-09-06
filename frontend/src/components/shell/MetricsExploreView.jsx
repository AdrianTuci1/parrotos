import { Component, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { readable } from "svelte/store";
import { useQuery } from "@tanstack/react-query";
import { useRuntimeClient } from "@rilldata/web-common/runtime-client/react";
import {
  StateManagersProvider,
  useStateManagers,
  useRillExploreState,
} from "@rilldata/web-common/features/dashboards/state-managers/react";
import { Filters } from "@rilldata/web-common/features/dashboards/filters/react";
import {
  getQueryServiceMetricsViewTimeRangeQueryOptions,
  getQueryServiceMetricsViewAggregationQueryOptions,
  V1TimeGrain,
} from "@rilldata/web-common/runtime-client";
import ChartContainer from "@rilldata/web-common/features/components/charts/react/ChartContainer";
import MeasureBigNumber from "@rilldata/web-common/features/dashboards/big-number/react/MeasureBigNumber";
import TimeGrainSelector from "@rilldata/web-common/features/dashboards/time-controls/react/TimeGrainSelector";
import Leaderboard from "@rilldata/web-common/features/dashboards/leaderboard/react/Leaderboard";
import DimensionTable from "@rilldata/web-common/features/dashboards/dimension-table/react/DimensionTable";
import { MetricsViewSelectors } from "@rilldata/web-common/features/metrics-views/metrics-view-selectors";
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import { SortType } from "@rilldata/web-common/features/dashboards/proto-state/derived-types";
import { createMeasureValueFormatter } from "@rilldata/web-common/lib/number-formatting/format-measure-value";
import { prepareDimensionTableRows } from "@rilldata/web-common/features/dashboards/dimension-table/dimension-table-utils";
import { ViewFrame } from "@/components/shell/ViewFrame";
import {
  resolveDataSource,
  DEFAULT_METRICS_VIEW,
} from "@/data/dataSource";
import { createMockStateManagers } from "@/data/mockStateManagers";
import {
  getMockMetricsView,
  getMockAggregationRows,
  getMockTotalRow,
  buildMockTimeSeries,
} from "@/data/mockAdapter";
import MockChart from "@/components/widgets/MockChart";

/**
 * React Metrics Explorer / Dashboard.
 *
 * Composes the already-ported Rill React leaf widgets (MeasureBigNumber, Chart /
 * RillChart via ChartContainer, TimeGrainSelector, Leaderboard, DimensionTable) into a
 * single metrics-explorer surface and feeds them from the product data layer.
 *
 * Two modes (see data/dataSource.js):
 *   - `runtime` — a Rill runtime_url is resolved (e.g. the local `rill start` at
 *     localhost:9009). The app-root RuntimeClientProvider + QueryClientProvider are
 *     already mounted (AppDataProvider), so this view queries a REAL metrics view over
 *     the Go Connect transport. The leaf widgets run their own queries against the
 *     runtimeClient passed down from `useRuntimeClient()`.
 *   - `mock` — no runtime_url. The view renders from the mock adapter (mockAdapter.js)
 *     so it stays populated in demo/production-without-runtime.
 *
 * The `name` URL segment selects the metrics view; it defaults to the product-configured
 * `DEFAULT_METRICS_VIEW` (orders_metrics).
 */

const EMPTY_WHERE = { cond: { op: "OPERATION_AND", exprs: [] } };

export function MetricsExploreView() {
  const { name } = useParams();
  const [searchParams] = useSearchParams();
  const metricsView = name || DEFAULT_METRICS_VIEW;
  const dataSource = resolveDataSource();

  return (
    <ViewFrame
      title="Explore"
      description={`Metrics explorer for the \`${metricsView}\` metrics view`}
      maxWidthClassName="full-width"
    >
      {dataSource.mode === "runtime" ? (
        <StateManagersProvider
          metricsViewName={metricsView}
          exploreName={metricsView}
        >
          <RuntimeMetricsExplorer
            metricsView={metricsView}
            searchParams={searchParams}
          />
        </StateManagersProvider>
      ) : (
        <MockMetricsExplorer metricsView={metricsView} />
      )}
    </ViewFrame>
  );
}

/**
 * Live runtime explorer. All widgets query the real metrics view through the runtime
 * client; this component only wires their shared state (time range, grain, filters).
 */
function RuntimeMetricsExplorer({ metricsView, searchParams }) {
  const runtimeClient = useRuntimeClient();
  const runtimeHost = resolveDataSource().host;
  const stateManagers = useStateManagers();
  const { timeRanges } = useRillExploreState({
    exploreName: metricsView,
    metricsViewName: metricsView,
    searchParams,
  });
  const dashboard = useReadable(stateManagers.dashboardStore);
  const whereFilter = dashboard?.whereFilter ?? EMPTY_WHERE;

  // ── Metrics view schema (measures / dimensions / time-dimension) ─────────
  const selectors = useMemo(
    () => new MetricsViewSelectors(runtimeClient),
    [runtimeClient],
  );
  const measuresStore = useMemo(
    () => selectors.getMeasuresForMetricView(metricsView),
    [selectors, metricsView],
  );
  const dimensionsStore = useMemo(
    () => selectors.getDimensionsForMetricView(metricsView),
    [selectors, metricsView],
  );
  const mvSpecStore = useMemo(
    () => selectors.getMetricsViewFromName(metricsView),
    [selectors, metricsView],
  );
  const measures = useReadable(measuresStore) ?? [];
  const dimensions = useReadable(dimensionsStore) ?? [];
  const mvSpec = useReadable(mvSpecStore);
  const spec = mvSpec?.metricsView;
  const timeDimension = spec?.timeDimension;
  const minTimeGrain = spec?.smallestTimeGrain;
  const hasTimeSeries = Boolean(timeDimension);

  // ── Time range (default = the metrics view's full data range) ────────────
  const timeRangeQuery = useQuery({
    ...getQueryServiceMetricsViewTimeRangeQueryOptions(runtimeClient, {
      metricsViewName: metricsView,
    }),
    enabled: hasTimeSeries,
  });
  const timeRangeSummary = timeRangeQuery.data?.timeRangeSummary;
  const timeStart = timeRangeSummary?.min;
  const timeEnd = timeRangeSummary?.max;

  // ── Shared explorer state ────────────────────────────────────────────────
  const [selectedTimeGrain, setSelectedTimeGrain] = useState(
    minTimeGrain || V1TimeGrain.TIME_GRAIN_DAY,
  );
  const [selectedDimension, setSelectedDimension] = useState(
    dimensions[0]?.name ?? dimensions[0]?.column,
  );

  const ready =
    Boolean(metricsView) &&
    measures.length > 0 &&
    (hasTimeSeries ? Boolean(timeStart && timeEnd) : true);

  const leaderboardSortByMeasureName = measures[0]?.name;
  const activeDimension =
    dimensions.find((d) => (d.name ?? d.column) === selectedDimension) ??
    dimensions[0];

  // Stable store identities for ChartContainer subscriptions.
  const tafs = useMemo(
    () => ({
      timeRange:
        hasTimeSeries && timeStart && timeEnd
          ? { start: timeStart, end: timeEnd, timeZone: "UTC" }
          : undefined,
      comparisonTimeRange: undefined,
      showTimeComparison: false,
      where: whereFilter,
      timeGrain: selectedTimeGrain,
      timeRangeState: undefined,
      comparisonTimeRangeState: undefined,
      hasTimeSeries,
    }),
    [hasTimeSeries, timeStart, timeEnd, selectedTimeGrain, whereFilter],
  );

  if (!ready) {
    // The runtime did not resolve this metrics view (missing / not yet reconciled).
    // Degrade to the mock adapter so the explorer is never blank, and surface why.
    return (
      <div className="flex flex-col gap-2 p-4">
        <div className="rounded border border-amber-300/40 bg-amber-300/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          The metrics view <code className="rounded bg-muted px-1">{metricsView}</code>{" "}
          could not be loaded from the Rill runtime
          {runtimeHost ? ` at ${runtimeHost}` : ""}. Showing demo data instead.
        </div>
        <MockMetricsExplorer metricsView={metricsView} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Filters
        metricsViewName={metricsView}
        hasTimeSeries={hasTimeSeries}
        timeRanges={timeRanges}
        stateManagers={stateManagers}
      />

      <MetricsHeader
        metricsView={metricsView}
        measures={measures}
        dimensions={dimensions}
        selectedDimension={selectedDimension}
        hasTimeSeries={hasTimeSeries}
        timeStart={timeStart}
        timeEnd={timeEnd}
        minTimeGrain={minTimeGrain}
        selectedTimeGrain={selectedTimeGrain}
        onTimeGrainSelect={setSelectedTimeGrain}
        onDimensionSelect={setSelectedDimension}
      />

      <KpiRow
        runtimeClient={runtimeClient}
        metricsView={metricsView}
        measures={measures}
        timeDimension={timeDimension}
        timeStart={timeStart}
        timeEnd={timeEnd}
        ready={ready}
        hasTimeSeries={hasTimeSeries}
        where={whereFilter}
      />

      <ChartGrid
        runtimeClient={runtimeClient}
        metricsView={metricsView}
        measures={measures}
        dimensions={dimensions}
        tafsValue={tafs}
        hasTimeSeries={hasTimeSeries}
        timeDimension={timeDimension}
      />

      {activeDimension ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LeaderboardPanel
            runtimeClient={runtimeClient}
            metricsView={metricsView}
            measures={measures}
            dimension={activeDimension}
            timeStart={timeStart}
            timeEnd={timeEnd}
            timeDimension={timeDimension}
            leaderboardSortByMeasureName={leaderboardSortByMeasureName}
            ready={ready}
            hasTimeSeries={hasTimeSeries}
            where={whereFilter}
          />
          <DimensionTablePanel
            runtimeClient={runtimeClient}
            metricsView={metricsView}
            measures={measures}
            dimension={activeDimension}
            timeStart={timeStart}
            timeEnd={timeEnd}
            timeDimension={timeDimension}
            leaderboardSortByMeasureName={leaderboardSortByMeasureName}
            ready={ready}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Header row: title, metrics-view chip, time-grain selector, dimension selector. */
function MetricsHeader({
  metricsView,
  measures,
  dimensions,
  selectedDimension,
  hasTimeSeries,
  timeStart,
  timeEnd,
  minTimeGrain,
  selectedTimeGrain,
  onTimeGrainSelect,
  onDimensionSelect,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{metricsView}</span>
        {hasTimeSeries ? (
          <TimeGrainSelector
            activeTimeGrain={selectedTimeGrain}
            timeStart={timeStart}
            timeEnd={timeEnd}
            minTimeGrain={minTimeGrain}
            onTimeGrainSelect={onTimeGrainSelect}
          />
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {dimensions.length > 0 ? (
          <select
            className="rounded border bg-card px-2 py-1 text-sm"
            value={selectedDimension || dimensions[0]?.name || dimensions[0]?.column}
            onChange={(e) => onDimensionSelect(e.target.value)}
            aria-label="Dimension"
          >
            {dimensions.map((dim) => (
              <option key={dim.name ?? dim.column} value={dim.name ?? dim.column}>
                {dim.displayName || dim.name || dim.column}
              </option>
            ))}
          </select>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {measures.length} measure{measures.length === 1 ? "" : "s"} ·{" "}
          {dimensions.length} dimension{dimensions.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

/** KPI row of MeasureBigNumber cards (one per measure). */
function KpiRow({
  runtimeClient,
  metricsView,
  measures,
  timeDimension,
  timeStart,
  timeEnd,
  ready,
  hasTimeSeries,
  where,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {measures.map((measure) => (
        <MeasureBigNumber
          key={measure.name}
          runtimeClient={runtimeClient}
          measure={measure}
          metricsViewName={metricsView}
          where={where}
          timeDimension={timeDimension}
          timeStart={timeStart}
          timeEnd={timeEnd}
          withTimeseries={hasTimeSeries}
          ready={ready}
        />
      ))}
    </div>
  );
}

/**
 * Chart grid: a temporal chart (over the metrics-view time dimension) plus one
 * bar chart per dimension. Reuses the ported ChartContainer which drives vega-embed.
 */
function ChartGrid({
  runtimeClient,
  metricsView,
  measures,
  dimensions,
  tafsValue,
  hasTimeSeries,
  timeDimension,
}) {
  const primaryMeasure = measures[0];

  // Compute all hooks before any conditional return so hook order is stable.
  const specMemo = useMemo(() => {
    if (hasTimeSeries && primaryMeasure && timeDimension) {
      return {
        metrics_view: metricsView,
        x: { field: timeDimension, type: "temporal" },
        y: { field: primaryMeasure.name, type: "quantitative" },
        isInteractive: false,
      };
    }
    return null;
  }, [hasTimeSeries, primaryMeasure, timeDimension, metricsView]);

  const timeSeriesTafs = useMemo(
    () => (hasTimeSeries ? readable(tafsValue) : undefined),
    [tafsValue, hasTimeSeries],
  );

  const nonTimeSeriesTafs = useMemo(
    () => readable({ ...tafsValue, hasTimeSeries: false }),
    [tafsValue],
  );

  if (!primaryMeasure) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {hasTimeSeries && specMemo ? (
        <ExploreChart
          runtimeClient={runtimeClient}
          title={`${primaryMeasure.displayName || primaryMeasure.name} over time`}
          chartType="area_chart"
          spec={specMemo}
          tafs={timeSeriesTafs}
        />
      ) : null}
      {dimensions.slice(0, 2).map((dim) => (
        <ExploreChart
          key={dim.name ?? dim.column}
          runtimeClient={runtimeClient}
          title={`${primaryMeasure.displayName || primaryMeasure.name} by ${
            dim.displayName || dim.name || dim.column
          }`}
          chartType="bar_chart"
          spec={{
            metrics_view: metricsView,
            x: { field: dim.name ?? dim.column, type: "nominal" },
            y: { field: primaryMeasure.name, type: "quantitative" },
            isInteractive: false,
          }}
          tafs={nonTimeSeriesTafs}
        />
      ))}
    </div>
  );
}

/** A single chart tile wrapping the ported ChartContainer. */
function ExploreChart({ runtimeClient, title, chartType, spec, tafs }) {
  const specStore = useMemo(() => readable(spec), [spec]);
  const tafsStore = useMemo(() => readable(tafs), [tafs]);

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="mb-2 px-1">
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="h-72">
        <ChartContainer
          runtimeClient={runtimeClient}
          chartType={chartType}
          spec={specStore}
          timeAndFilterStore={tafsStore}
          themeMode="light"
        />
      </div>
    </div>
  );
}

/** Leaderboard panel (self-contained: runs its own aggregation + totals queries). */
function LeaderboardPanel({
  runtimeClient,
  metricsView,
  measures,
  dimension,
  timeStart,
  timeEnd,
  timeDimension,
  leaderboardSortByMeasureName,
  ready,
  hasTimeSeries,
  where,
}) {
  const formatters = useMemo(
    () =>
      Object.fromEntries(
        measures.map((m) => [m.name, createMeasureValueFormatter(m)]),
      ),
    [measures],
  );

  const measureLabel = useMemo(
    () => (name) => measures.find((m) => m.name === name)?.displayName || name,
    [measures],
  );

  const isValidPercentOfTotal = useMemo(
    () => (name) => {
      const measure = measures.find((m) => m.name === name);
      return Boolean(measure?.validPercentOfTotal) || false;
    },
    [measures],
  );

  const timeRange =
    hasTimeSeries && timeStart && timeEnd
      ? { start: timeStart, end: timeEnd, timeDimension }
      : undefined;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-medium">Leaderboard</h3>
      <Leaderboard
        runtimeClient={runtimeClient}
        dimension={dimension}
        timeRange={timeRange}
        whereFilter={where}
        dimensionThresholdFilters={[]}
        leaderboardSortByMeasureName={leaderboardSortByMeasureName}
        leaderboardMeasures={measures}
        leaderboardShowContextForAllMeasures={false}
        metricsViewName={metricsView}
        sortType={SortType.VALUE}
        slice={7}
        tableWidth={620}
        sortedAscending={false}
        timeControlsReady={ready}
        dimensionColumnWidth={180}
        filterExcludeMode={false}
        isBeingCompared={false}
        formatters={formatters}
        tooltipFormatters={formatters}
        isValidPercentOfTotal={isValidPercentOfTotal}
        measureLabel={measureLabel}
        toggleDimensionValueSelection={() => {}}
        toggleSort={() => {}}
      />
    </div>
  );
}

/**
 * Dimension table panel. Unlike the leaderboard, DimensionTable is presentational:
 * it receives pre-built rows/columns, so this panel runs a single aggregation query
 * and prepares them with the framework-agnostic dimension-table utils.
 */
function DimensionTablePanel({
  runtimeClient,
  metricsView,
  measures,
  dimension,
  timeStart,
  timeEnd,
  timeDimension,
  leaderboardSortByMeasureName,
  ready,
  where,
}) {
  const dimensionName = dimension.name ?? dimension.column;

  const aggQuery = useQuery({
    ...getQueryServiceMetricsViewAggregationQueryOptions(runtimeClient, {
      metricsView: metricsView,
      dimensions: [{ name: dimensionName }],
      measures: measurementsFromNames(measures),
      where,
      timeRange: timeStart && timeEnd ? { start: timeStart, end: timeEnd, timeDimension } : undefined,
      sort: [{ name: leaderboardSortByMeasureName, desc: true }],
      limit: "50",
    }),
    enabled: ready && measures.length > 0 && !!dimensionName,
  });

  const rows = useMemo(() => {
    const data = aggQuery.data?.data ?? [];
    return prepareDimensionTableRows(
      data,
      measures,
      leaderboardSortByMeasureName,
      dimensionName,
      false,
      false,
      0,
    );
  }, [aggQuery.data, measures, leaderboardSortByMeasureName, dimensionName]);

  const columns = useMemo(
    () => [
      {
        name: dimensionName,
        type: "VARCHAR",
        label: dimension.displayName || dimension.name || dimension.column,
        enableResize: true,
      },
      ...measures.map((m) => ({
        name: m.name,
        type: "INT",
        label: m.displayName || m.expression,
        format: m.formatPreset,
        tooltipFormatter: createMeasureValueFormatter(m),
      })),
    ],
    [dimensionName, dimension, measures],
  );

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-medium">Dimension table</h3>
      <div className="h-96">
        <DimensionTable
          rows={rows}
          columns={columns}
          dimensionName={dimensionName}
          isFetching={aggQuery.isFetching}
        />
      </div>
    </div>
  );
}

function measurementsFromNames(measures) {
  return measures.map((m) => ({ name: m.name }));
}

/**
 * Mock explorer — rendered when no Rill runtime_url is configured. Renders the same
 * explorer surface from the mock adapter (mockAdapter.js) so it stays populated in
 * demo / runtime-less environments.
 */
function MockMetricsExplorer({ metricsView }) {
  const measures = getMockMetricsView(metricsView)?.measures ?? [];
  const dimensions = getMockMetricsView(metricsView)?.dimensions ?? [];
  const total = getMockTotalRow();
  const [selectedDimension, setSelectedDimension] = useState(
    dimensions.find((d) => d.type !== "DIMENSION_TYPE_TIME")?.name ?? "channel",
  );

  const rows = getMockAggregationRows(metricsView, { dimension: selectedDimension });
  const timeSeriesRows = buildMockTimeSeries();
  // Pre-aggregate the per-channel time series into daily totals so the area chart
  // renders a clean single-series series (Vega-Lite's transform aggregate is finicky).
  const primaryMeasure = measures[0]?.name || "total_revenue";
  const dailyTotals = useMemo(() => {
    const byDay = new Map();
    for (const row of timeSeriesRows) {
      byDay.set(row.time, (byDay.get(row.time) || 0) + (row[primaryMeasure] ?? 0));
    }
    return [...byDay.entries()].map(([time, value]) => ({
      time,
      [primaryMeasure]: value,
    }));
  }, [timeSeriesRows, primaryMeasure]);
  const measureNames = measures.map((m) => m.name);
  const hasTimeSeries = Boolean(getMockMetricsView(metricsView)?.timeDimension);
  const formatMockValue = (value, measure) => {
    if (value == null) return "—";
    const preset = measure?.formatPreset;
    if (preset === "currency") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(value);
    }
    if (preset === "percent") return `${value}%`;
    return new Intl.NumberFormat("en-US").format(value);
  };
  // The Faza-1 filter grid is driven by a StateManagers. Without a runtime we build
  // one from the mock adapter; if it cannot be built for this metrics view, skip the
  // bar entirely rather than break the demo.
  const mockStateManagers = useMemo(() => {
    try {
      return createMockStateManagers(metricsView);
    } catch {
      return null;
    }
  }, [metricsView]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{metricsView}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>demo data</span>
          {dimensions.length ? (
            <select
              className="rounded border bg-card px-2 py-1 text-sm"
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              aria-label="Dimension"
            >
              {dimensions
                .filter((d) => d.type !== "DIMENSION_TYPE_TIME")
                .map((dim) => (
                  <option key={dim.name} value={dim.name}>
                    {dim.displayName || dim.name}
                  </option>
                ))}
            </select>
          ) : null}
        </div>
      </div>

      {mockStateManagers ? (
        <ExploreSafeBoundary>
          <Filters
            metricsViewName={metricsView}
            hasTimeSeries={hasTimeSeries}
            timeRanges={[]}
            stateManagers={mockStateManagers}
          />
        </ExploreSafeBoundary>
      ) : null}

      {/* Big-number cards (Rill-style measures container) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {measures.map((measure) => (
          <div
            key={measure.name}
            className="flex flex-col rounded-lg border bg-card p-4 shadow-sm"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {measure.displayName || measure.name}
            </span>
            <span className="mt-1 text-2xl font-semibold tabular-nums">
              {formatMockValue(total[measure.name], measure)}
            </span>
          </div>
        ))}
      </div>

      {/* Chart cards (mock data via vega-lite; real runtime path uses ChartContainer) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-medium">
            {(measures[0]?.displayName || measures[0]?.name || "Metric")} over time
          </h3>
          <div className="h-56">
            <MockChart
              values={dailyTotals}
              xField="time"
              yField={primaryMeasure}
              mark="area"
              xType="nominal"
            />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-medium">
            {(measures[0]?.displayName || measures[0]?.name || "Metric")} by {selectedDimension}
          </h3>
          <div className="h-56">
            <MockChart
              values={rows}
              xField={selectedDimension}
              yField={measures[0]?.name || "total_revenue"}
              mark="bar"
            />
          </div>
        </div>
      </div>

      {/* Dimension breakdown table */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-medium">
          {measureNames[0] || "Metric"} by {selectedDimension}
        </h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-1.5 pr-2 text-xs font-medium uppercase tracking-wide">
                {selectedDimension}
              </th>
              {measureNames.map((name) => (
                <th
                  key={name}
                  className="py-1.5 pr-2 text-right text-xs font-medium uppercase tracking-wide"
                >
                  {measures.find((m) => m.name === name)?.displayName || name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-1.5 pr-2 font-medium">{row[selectedDimension]}</td>
                {measureNames.map((name) => (
                  <td key={name} className="py-1.5 pr-2 text-right tabular-nums">
                    {row[name] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Error boundary so the mock explorer's filter grid degrades gracefully: if the mock
 * StateManagers or the shared Filters bar throw, the base mock view (KPI + table) still
 * renders instead of blanking the whole explorer.
 */
class ExploreSafeBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export default MetricsExploreView;
