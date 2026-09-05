import { useMemo } from "react";
import { readable } from "svelte/store";
import { useRuntimeClient } from "@rilldata/web-common/runtime-client/react";
import ChartContainer from "@rilldata/web-common/features/components/charts/react/ChartContainer";
import { ViewFrame } from "@/components/shell/ViewFrame";

const METRICS_VIEW = "orders_metrics";

/**
 * Minimal Explore/Dashboard view that renders real Rill charts fed from the Go
 * runtime (not mock data). Each `ExploreChart` wraps the ported React
 * `ChartContainer`, which builds the aggregation query from a chart spec and the
 * metrics-view schema, runs it over the RuntimeClient Connect transport and
 * renders a Vega-Lite chart.
 *
 * The spec + time-and-filter store are wrapped as Svelte `readable()` stores (the
 * store-based contract `ChartContainer` consumes), memoized for stable identity.
 */
export function ExploreView() {
  return (
    <ViewFrame>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Explore</h2>
            <p className="text-sm text-muted-foreground">
              Live charts from the <code className="rounded bg-muted px-1">{METRICS_VIEW}</code> metrics view
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ExploreChart
            title="Revenue by channel"
            chartType="bar_chart"
            spec={{
              metrics_view: METRICS_VIEW,
              x: { field: "channel", type: "nominal" },
              y: { field: "total_revenue", type: "quantitative" },
              isInteractive: false,
            }}
            tafs={buildStaticTafs()}
          />

          <ExploreChart
            title="Orders by channel"
            chartType="bar_chart"
            spec={{
              metrics_view: METRICS_VIEW,
              x: { field: "channel", type: "nominal" },
              y: { field: "order_count", type: "quantitative" },
              isInteractive: false,
            }}
            tafs={buildStaticTafs()}
          />

          <ExploreChart
            title="Revenue over time"
            chartType="area_chart"
            spec={{
              metrics_view: METRICS_VIEW,
              x: { field: "time", type: "temporal" },
              y: { field: "total_revenue", type: "quantitative" },
              isInteractive: false,
            }}
            tafs={buildTemporalTafs()}
          />
        </div>
      </div>
    </ViewFrame>
  );
}

/**
 * Renders a single real chart via the ported ChartContainer. `spec` is a
 * CartesianChartSpec (metrics_view + x/y/color); `tafs` is the time-and-filter
 * store shape. Both are wrapped in `readable()` so ChartContainer can subscribe.
 */
function ExploreChart({ title, chartType, spec, tafs }) {
  const runtimeClient = useRuntimeClient();

  // Stable store identities: ChartContainer subscribes to these, so a new object
  // per render would loop the subscription.
  const specStore = useMemo(() => readable(spec), [spec]);
  const tafsStore = useMemo(() => readable(tafs), [tafs]);

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between px-1">
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

/**
 * Static time-and-filter store for nominal (no time dimension) charts. With
 * `hasTimeSeries: false` the aggregation query is sent without a time range, so
 * it returns all rows (both channels).
 */
function buildStaticTafs() {
  return {
    timeRange: undefined,
    comparisonTimeRange: undefined,
    showTimeComparison: false,
    where: { cond: { op: "OPERATION_AND", exprs: [] } },
    timeGrain: undefined,
    timeRangeState: undefined,
    comparisonTimeRangeState: undefined,
    hasTimeSeries: false,
  };
}

/**
 * Time-and-filter store for the temporal chart. The demo rows are timestamped
 * 2026-01-01, so pin the range to that day and bucket at DAY grain.
 */
function buildTemporalTafs() {
  return {
    timeRange: {
      start: "2026-01-01T00:00:00Z",
      end: "2026-01-05T00:00:00Z",
      timeZone: "UTC",
    },
    comparisonTimeRange: undefined,
    showTimeComparison: false,
    where: { cond: { op: "OPERATION_AND", exprs: [] } },
    timeGrain: "TIME_GRAIN_DAY",
    timeRangeState: undefined,
    comparisonTimeRangeState: undefined,
    hasTimeSeries: true,
  };
}

export default ExploreView;
