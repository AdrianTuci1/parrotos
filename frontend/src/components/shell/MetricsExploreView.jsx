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
import { cn } from "@/lib/utils";
import {
  resolveDataSource,
  DEFAULT_METRICS_VIEW,
} from "@/data/dataSource";
import { buildMockPivotData } from "@/data/mockPivot";
import { createMockStateManagers } from "@/data/mockStateManagers";
import {
  getMockMetricsView,
  getMockAggregationRows,
  getMockTotalRow,
  buildMockTimeSeries,
} from "@/data/mockAdapter";
import MockChart from "@/components/widgets/MockChart";
import KpiInspector from "@/components/shell/KpiInspector";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { applyMockAgentEdit } from "@/data/mockAgent";
import "@/styles/explore.css";

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
export function RuntimeMetricsExplorer({ metricsView, searchParams }) {
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
          <Select
            value={selectedDimension || dimensions[0]?.name || dimensions[0]?.column}
            onValueChange={(value) => onDimensionSelect(value)}
            aria-label="Dimension"
          >
            <SelectTrigger className="w-auto bg-card" aria-label="Dimension" />
            <SelectContent>
              {dimensions.map((dim) => (
                <SelectItem key={dim.name ?? dim.column} value={dim.name ?? dim.column}>
                  {dim.displayName || dim.name || dim.column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
export function MockMetricsExplorer({ metricsView }) {
  const measures = getMockMetricsView(metricsView)?.measures ?? [];
  const dimensions = getMockMetricsView(metricsView)?.dimensions ?? [];
  const total = getMockTotalRow();
  const [selectedDimension, setSelectedDimension] = useState(
    dimensions.find((d) => d.type !== "DIMENSION_TYPE_TIME")?.name ?? "channel",
  );
  const [rightPane, setRightPane] = useState("leaderboard");
  const [timeGrain, setTimeGrain] = useState("day");

  // Editable copy of the mock measures so the KPI inspector's edits (display name,
  // format, description, hide) reflect live on the cards.
  const [editableMeasures, setEditableMeasures] = useState(() =>
    measures.map((m) => ({
      ...m,
      sparkline: true,
      comparison: false,
      mark: "area",
    })),
  );
  const [selectedMeasureName, setSelectedMeasureName] = useState(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorWidth, setInspectorWidth] = useState(320);

  const rows = getMockAggregationRows(metricsView, { dimension: selectedDimension });
  const timeSeriesRows = buildMockTimeSeries();
  const measureNames = editableMeasures.map((m) => m.name);
  const hasTimeSeries = Boolean(getMockMetricsView(metricsView)?.timeDimension);
  const primaryMeasure = measures[0]?.name || "total_revenue";

  // Span of the mock time series (Rill's SuperPill shows the selected range).
  const mockTimeRange = useMemo(() => {
    const times = timeSeriesRows.map((r) => r.time).filter(Boolean);
    if (times.length === 0) return { start: "", end: "" };
    const sorted = [...times].sort();
    return { start: sorted[0], end: sorted[sorted.length - 1] };
  }, [timeSeriesRows]);

  // Pre-aggregate the per-channel time series into daily totals per measure so each
  // area chart renders a clean single-series line (Vega-Lite's transform aggregate
  // is finicky). This mirrors Rill's left "time series" pane (one big number + chart
  // per measure).
  const dailyByMeasure = useMemo(() => {
    const byMeasure = {};
    for (const name of measureNames) {
      const byDay = new Map();
      for (const row of timeSeriesRows) {
        byDay.set(row.time, (byDay.get(row.time) || 0) + (row[name] ?? 0));
      }
      byMeasure[name] = [...byDay.entries()].map(([time, value]) => ({
        time,
        [name]: value,
      }));
    }
    return byMeasure;
  }, [timeSeriesRows, measureNames]);

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

  // Left "time series" pane is resizable against the right sub-view pane, mirroring
  // Rill's dashboard EW resizer.
  const [leftPct, setLeftPct] = useState(46);
  const [resizing, setResizing] = useState(false);
  const startResize = (e) => {
    e.preventDefault();
    setResizing(true);
    const split = e.currentTarget.parentElement;
    const rect = split.getBoundingClientRect();
    const onMove = (ev) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(72, Math.max(28, pct)));
    };
    const onUp = () => {
      setResizing(false);
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // KPI inspector: select a measure to edit, apply display-field patches live.
  const openInspector = (measureName) => {
    setSelectedMeasureName(measureName);
    setInspectorOpen(true);
  };
  const handleInspectorChange = ({ field, value }) => {
    if (!selectedMeasureName) return;
    setEditableMeasures((prev) =>
      prev.map((m) =>
        m.name === selectedMeasureName ? { ...m, [field]: value } : m,
      ),
    );
  };

  // "Edit with AI": run the mock agent against the selected card. In Rill this routes
  // to the developer agent; here it maps prompt intents to card-field patches.
  const handleAiEdit = async (prompt) => {
    const measure = editableMeasures.find((m) => m.name === selectedMeasureName);
    if (!measure) return "Nothing to edit.";
    const { patch, message } = applyMockAgentEdit(prompt, measure);
    setEditableMeasures((prev) =>
      prev.map((m) =>
        m.name === selectedMeasureName ? { ...m, ...patch } : m,
      ),
    );
    return message;
  };

  // Independent resizer for the KPI inspector (right column), so the split resizer
  // and the inspector resizer both work.
  const startInspectorResize = (e) => {
    e.preventDefault();
    setResizing(true);
    const inspector = e.currentTarget.parentElement;
    const right = inspector.getBoundingClientRect().right;
    const onMove = (ev) => {
      const w = right - ev.clientX;
      setInspectorWidth(Math.min(460, Math.max(280, w)));
    };
    const onUp = () => {
      setResizing(false);
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{metricsView}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>demo data</span>
          {dimensions.length ? (
            <Select
              value={selectedDimension}
              onValueChange={setSelectedDimension}
              aria-label="Dimension"
            >
              <SelectTrigger className="w-auto bg-card" aria-label="Dimension" />
              <SelectContent>
                {dimensions
                  .filter((d) => d.type !== "DIMENSION_TYPE_TIME")
                  .map((dim) => (
                    <SelectItem key={dim.name} value={dim.name}>
                      {dim.displayName || dim.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
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
            timeControls={
              <MockTimeControls
                timeStart={mockTimeRange.start}
                timeEnd={mockTimeRange.end}
                timeGrain={timeGrain}
                onTimeGrainSelect={setTimeGrain}
              />
            }
          />
        </ExploreSafeBoundary>
      ) : null}

      {/* Rill-style dashboard body: left KPI pane + right sub-view pane + inspector. */}
      <div className="mock-explore-shell">
        <div className={cn("mock-explore-split", resizing && "resizing")}>
          <div className="mock-explore-left" style={{ width: `${leftPct}%` }}>
            {editableMeasures
              .filter((m) => !m.hide)
              .map((measure) => {
                const selected = measure.name === selectedMeasureName;
                return (
                  <div
                    key={measure.name}
                    className={cn("mock-kpi-card", selected && "selected")}
                    onClick={() => openInspector(measure.name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openInspector(measure.name);
                      }
                    }}
                  >
                    <div className="mock-kpi-head">
                      <span className="mock-kpi-label">
                        {measure.displayName || measure.name}
                      </span>
                      <span className="mock-kpi-edit" aria-hidden="true">
                        <EditIcon size={12} />
                      </span>
                    </div>
                    <div className="mock-kpi-value-row">
                      <span className="mock-kpi-value">
                        {formatMockValue(total[measure.name], measure)}
                      </span>
                      {measure.comparison ? (
                        <ComparisonPill series={dailyByMeasure[measure.name] ?? []} measure={measure} />
                      ) : null}
                    </div>
                    {measure.sparkline !== false ? (
                      <div className="h-44">
                        <MockChart
                          values={dailyByMeasure[measure.name] ?? []}
                          xField="time"
                          yField={measure.name}
                          mark={measure.mark || "area"}
                          xType="nominal"
                          height={168}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>

          <div
            className="mock-explore-resizer"
            onMouseDown={startResize}
            onDoubleClick={() => setLeftPct(46)}
            title="Drag to resize (double-click to reset)"
          />

          <div className="mock-explore-right" style={{ width: `${100 - leftPct}%` }}>
            <div className="sub-view-tabs">
              <button
                type="button"
                className={cn("sub-view-tab", rightPane === "leaderboard" && "active")}
                onClick={() => setRightPane("leaderboard")}
              >
                Leaderboard
              </button>
              <button
                type="button"
                className={cn("sub-view-tab", rightPane === "table" && "active")}
                onClick={() => setRightPane("table")}
              >
                Dimension table
              </button>
              <button
                type="button"
                className={cn("sub-view-tab", rightPane === "summary" && "active")}
                onClick={() => setRightPane("summary")}
              >
                Summary
              </button>
              <button
                type="button"
                className={cn("sub-view-tab", rightPane === "pivot" && "active")}
                onClick={() => setRightPane("pivot")}
              >
                Pivot
              </button>
            </div>

            {rightPane === "leaderboard" ? (
              <LeaderboardCard
                dimension={selectedDimension}
                rows={rows}
                measures={editableMeasures}
                measureNames={measureNames}
                formatMockValue={formatMockValue}
              />
            ) : rightPane === "table" ? (
              <DimensionTableCard
                dimension={selectedDimension}
                rows={rows}
                measures={editableMeasures}
                measureNames={measureNames}
              />
            ) : rightPane === "pivot" ? (
              <MockPivot
                metricsView={metricsView}
                dimensions={dimensions.filter((d) => d.type !== "DIMENSION_TYPE_TIME")}
                measures={measures}
                formatMockValue={formatMockValue}
              />
            ) : (
              <SummaryCard
                measures={editableMeasures}
                total={total}
                formatMockValue={formatMockValue}
              />
            )}
          </div>
        </div>

        <KpiInspector
          measure={editableMeasures.find((m) => m.name === selectedMeasureName)}
          open={inspectorOpen}
          width={inspectorWidth}
          onResizeStart={startInspectorResize}
          onClose={() => setInspectorOpen(false)}
          onChange={handleInspectorChange}
          onAiEdit={handleAiEdit}
        />
      </div>
    </div>
  );
}

/**
 * Rill SuperPill stand-in for the mock filter bar: the time-range pill, a time-grain
 * selector, and an "as of" timestamp. Presentational in mock mode (no live query to
 * re-bucket), but mirrors the time-controls row Rill renders above the filters.
 */
function MockTimeControls({ timeStart, timeEnd, timeGrain, onTimeGrainSelect }) {
  return (
    <div className="mock-time-controls">
      <span className="mock-time-calendar" title="Time range">
        <CalendarIcon size={16} />
      </span>
      {timeStart && timeEnd ? (
        <div className="mock-time-pill">
          <span>{timeStart}</span>
          <span className="mock-time-sep">→</span>
          <span>{timeEnd}</span>
        </div>
      ) : null}
      <div className="mock-time-grain">
        <Select
          value={timeGrain}
          onValueChange={onTimeGrainSelect}
          aria-label="Time grain"
        >
          <SelectTrigger
            aria-label="Time grain"
            className="h-auto border-none bg-transparent px-1 py-0 text-[11px] font-medium uppercase tracking-[0.04em] text-fg-secondary"
          />
          <SelectContent className="min-w-[5rem]">
            {["day", "week", "month"].map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {timeEnd ? (
        <span className="mock-time-asof">as of {timeEnd}</span>
      ) : null}
    </div>
  );
}

/** Rill `Calendar.svelte` icon stand-in. */
function CalendarIcon({ size = "16px", className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/** Edit (pencil) icon for the KPI card affordance. */
function EditIcon({ size = "16px", className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/** Day-over-day % change pill shown on a KPI card when comparison is enabled. */
function ComparisonPill({ series, measure }) {
  const last = series[series.length - 1]?.[measure.name];
  const prev = series[series.length - 2]?.[measure.name];
  if (last == null || prev == null || prev === 0) return null;
  const delta = ((last - prev) / prev) * 100;
  const up = delta >= 0;
  return (
    <span className={cn("mock-kpi-comparison", up ? "up" : "down")}>
      {up ? "▲" : "▼"}{Math.abs(delta).toFixed(1)}% vs prev
    </span>
  );
}

/** Right-pane leaderboard: the selected dimension's values ranked by measure. */
function LeaderboardCard({ dimension, rows, measures, measureNames, formatMockValue }) {
  const primary = measureNames[0];
  const max = Math.max(1, ...rows.map((r) => r[primary] ?? 0));

  return (
    <div className="mock-explore-subview-card">
      <div className="mock-explore-subview-title">
        <h3>Leaderboard</h3>
        <span>by {dimension}</span>
      </div>
      <div className="mock-table-wrap">
        <table className="mock-table">
          <thead>
            <tr>
              <th className="mock-table-rank">#</th>
              <th>{dimension}</th>
              {measureNames.map((name) => (
                <th key={name} className="mock-table-num">
                  {measures.find((m) => m.name === name)?.displayName || name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="mock-table-rank">{i + 1}</td>
                <td>
                  <div className="mock-leaderboard-cell">
                    <span className="mock-leaderboard-label">{row[dimension]}</span>
                    <span
                      className="mock-leaderboard-bar"
                      style={{ width: `${((row[primary] ?? 0) / max) * 100}%` }}
                    />
                  </div>
                </td>
                {measureNames.map((name) => (
                  <td key={name} className="mock-table-num">
                    {formatMockValue(row[name], measures.find((m) => m.name === name))}
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

/** Right-pane dimension table: a clean, bounded breakdown table. */
function DimensionTableCard({ dimension, rows, measures, measureNames }) {
  return (
    <div className="mock-explore-subview-card">
      <div className="mock-explore-subview-title">
        <h3>Dimension table</h3>
        <span>by {dimension}</span>
      </div>
      <div className="mock-table-wrap">
        <table className="mock-table">
          <thead>
            <tr>
              <th>{dimension}</th>
              {measureNames.map((name) => (
                <th key={name} className="mock-table-num">
                  {measures.find((m) => m.name === name)?.displayName || name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="mock-table-label">{row[dimension]}</td>
                {measureNames.map((name) => (
                  <td key={name} className="mock-table-num">
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

/** Right-pane summary: each measure's overall total + share of the total. */
function SummaryCard({ measures, total, formatMockValue }) {
  const visible = measures.filter((m) => !m.hide);
  const grandTotal = visible.reduce((sum, m) => sum + (total[m.name] ?? 0), 0);
  return (
    <div className="mock-explore-subview-card">
      <div className="mock-explore-subview-title">
        <h3>Summary</h3>
        <span>all measures</span>
      </div>
      <div className="mock-table-wrap">
        <table className="mock-table">
          <thead>
            <tr>
              <th>Measure</th>
              <th className="mock-table-num">Total</th>
              <th className="mock-table-num">Share</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => {
                const value = total[m.name] ?? 0;
                const share = grandTotal ? (value / grandTotal) * 100 : 0;
                return (
                  <tr key={m.name}>
                    <td className="mock-table-label">{m.displayName || m.name}</td>
                    <td className="mock-table-num">
                      {formatMockValue(value, m)}
                    </td>
                    <td className="mock-table-num">
                      <div className="mock-summary-row" style={{ gridTemplateColumns: "auto minmax(0,1fr)" }}>
                        <span className="mock-summary-value">{share.toFixed(1)}%</span>
                        <span className="mock-leaderboard-bar" style={{ width: `${share}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Right-pane pivot: row × column × measure axes driven by mock data. */
function MockPivot({ metricsView, dimensions, measures, formatMockValue }) {
  const defaultRow = dimensions[0]?.name || "channel";
  const [rowDim, setRowDim] = useState(defaultRow);
  const [colDim, setColDim] = useState("");
  const [activeMeasures, setActiveMeasures] = useState(() =>
    new Set(measures.slice(0, 1).map((m) => m.name)),
  );

  const selectedMeasures = measures.filter((m) => activeMeasures.has(m.name));
  const pivot = useMemo(
    () =>
      buildMockPivotData(
        (dimension) => getMockAggregationRows(metricsView, { dimension }),
        rowDim,
        colDim || null,
        selectedMeasures.length ? selectedMeasures : measures.slice(0, 1),
      ),
    // `getMockAggregationRows` is a stable module fn keyed on metricsView,
    // which is the only consuming dependency here.
    [metricsView, rowDim, colDim, selectedMeasures, measures],
  );

  const toggleMeasure = (name) => {
    setActiveMeasures((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <div className="mock-explore-subview-card">
      <div className="flex flex-wrap items-center gap-2 px-1 pb-2 text-xs text-muted-foreground">
        <label className="flex items-center gap-1">
          Rows
          <Select value={rowDim} onValueChange={setRowDim} aria-label="Pivot row dimension">
            <SelectTrigger className="h-7 w-auto bg-card px-2 py-0 text-xs" aria-label="Pivot row dimension" />
            <SelectContent>
              {dimensions.map((d) => (
                <SelectItem key={d.name} value={d.name}>
                  {d.displayName || d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex items-center gap-1">
          Columns
          <Select value={colDim} onValueChange={setColDim} aria-label="Pivot column dimension">
            <SelectTrigger className="h-7 w-auto bg-card px-2 py-0 text-xs" aria-label="Pivot column dimension" />
            <SelectContent>
              <SelectItem value="">Measures</SelectItem>
              {dimensions.map((d) => (
                <SelectItem key={d.name} value={d.name}>
                  {d.displayName || d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <span className="flex flex-wrap items-center gap-2">
          {measures.map((m) => (
            <label key={m.name} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={activeMeasures.has(m.name)}
                onChange={() => toggleMeasure(m.name)}
              />
              {m.displayName || m.name}
            </label>
          ))}
        </span>
      </div>
      <div className="mock-table-wrap">
        <table className="mock-table">
          <thead>
            <tr>
              <th>{dimensions.find((d) => d.name === rowDim)?.displayName || rowDim}</th>
              {pivot.columns.map((c) => (
                <th key={c.value} className="mock-table-num">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pivot.rows.map((row, i) => (
              <tr key={i}>
                <td className="mock-table-label">{row.label}</td>
                {row.cells.map((cell, j) => (
                  <td key={j} className="mock-table-num">
                    {cell == null
                      ? "—"
                      : formatMockValue(cell, pivot.columns[j].measure)}
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
