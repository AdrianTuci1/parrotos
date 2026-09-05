import {
  MetricsViewSpecDimensionType,
  MetricsViewSpecMeasureType,
} from "@rilldata/web-common/runtime-client";

/**
 * Mock metrics-view adapter.
 *
 * This is the single source of truth for the mock BI data path. It exposes:
 *   - a `orders_metrics` metrics-view schema (measures / dimensions / timeDimension),
 *   - the `V1MetricsView` resource shape that `MetricsViewSelectors` and the React
 *     leaf components (`MeasureBigNumber`, `Leaderboard`, `DimensionTable`, etc.)
 *     consume to resolve measures/dimensions, and
 *   - mock aggregation row generators so the dashboard and chat areas can render
 *     sample charts when no live Rill runtime is reachable.
 *
 * Import this from the dashboard (widget) and chat (chart) areas. Prefer the
 * live runtime path (see `./dataSource.js`) when a runtime_url is configured.
 */

/** Default metrics view used across the product (matches Rill's sample project). */
export const DEFAULT_METRICS_VIEW = "orders_metrics";

const ORDERS_METRICS_VIEW = {
  timeDimension: "time",
  measures: [
    {
      name: "total_revenue",
      displayName: "Total Revenue",
      expression: "sum(revenue)",
      type: MetricsViewSpecMeasureType.MEASURE_TYPE_SIMPLE,
      formatPreset: "currency",
    },
    {
      name: "order_count",
      displayName: "Order Count",
      expression: "count(*)",
      type: MetricsViewSpecMeasureType.MEASURE_TYPE_SIMPLE,
    },
    {
      name: "aov",
      displayName: "Avg Order Value",
      expression: "sum(revenue) / count(*)",
      type: MetricsViewSpecMeasureType.MEASURE_TYPE_DERIVED,
      formatPreset: "currency",
    },
  ],
  dimensions: [
    { name: "channel", type: MetricsViewSpecDimensionType.DIMENSION_TYPE_CATEGORICAL },
    { name: "country", type: MetricsViewSpecDimensionType.DIMENSION_TYPE_CATEGORICAL },
    { name: "customer", type: MetricsViewSpecDimensionType.DIMENSION_TYPE_CATEGORICAL },
    { name: "time", type: MetricsViewSpecDimensionType.DIMENSION_TYPE_TIME },
  ],
};

/** Register of mock metrics-view schemas keyed by metrics-view name. */
export const MOCK_METRICS_VIEWS = {
  [DEFAULT_METRICS_VIEW]: ORDERS_METRICS_VIEW,
};

/**
 * Return the mock `V1MetricsViewSpec` for a metrics-view name, or `null` when the
 * metrics view is not part of the mock set. Mirrors what a live runtime would
 * return from `state.validSpec`.
 */
export function getMockMetricsView(metricsViewName = DEFAULT_METRICS_VIEW) {
  return MOCK_METRICS_VIEWS[metricsViewName] || null;
}

/**
 * Return the `V1MetricsView` resource shape consumed by `MetricsViewSelectors`
 * (and therefore by `ChartContainer`). Shape matches the runtime resource:
 * `{ meta.name, metricsView.state.validSpec }`.
 */
export function getMockMetricsViewResource(metricsViewName = DEFAULT_METRICS_VIEW) {
  const spec = getMockMetricsView(metricsViewName);
  if (!spec) return undefined;
  return {
    meta: { name: { kind: "MetricsView", name: metricsViewName } },
    metricsView: { state: { validSpec: spec } },
  };
}

// ─── Mock aggregation rows ────────────────────────────────────────────────────

/** Sample rows keyed by dimension; parallel to Rill's sample orders project. */
const MOCK_ROWS = {
  channel: [
    { channel: "Online", total_revenue: 68240, order_count: 1180, aov: 57.83 },
    { channel: "Retail", total_revenue: 27950, order_count: 324, aov: 86.27 },
    { channel: "Partner", total_revenue: 15140, order_count: 210, aov: 72.1 },
  ],
  country: [
    { country: "US", total_revenue: 62440, order_count: 1041, aov: 59.98 },
    { country: "DE", total_revenue: 24810, order_count: 412, aov: 60.22 },
    { country: "GB", total_revenue: 17320, order_count: 287, aov: 60.35 },
    { country: "FR", total_revenue: 9760, order_count: 181, aov: 53.92 },
  ],
  customer: [
    { customer: "Acme", total_revenue: 31240, order_count: 232, aov: 134.66 },
    { customer: "Globex", total_revenue: 20490, order_count: 187, aov: 109.57 },
    { customer: "Initech", total_revenue: 15830, order_count: 141, aov: 112.27 },
    { customer: "Umbrella", total_revenue: 9980, order_count: 92, aov: 108.48 },
  ],
};

const TIME_SERIES_START = Date.UTC(2026, 0, 1); // 2026-01-01
const TIME_SERIES_DAYS = 5;
const CHANNEL_WEIGHTS = { Online: 0.6, Retail: 0.25, Partner: 0.15 };

/**
 * Produce mock `MetricsViewAggregationResponse.data` rows for a dimension,
 * matching the measures declared in the metrics view. Used by the chart and
 * dashboard mock paths to render sample data without a live runtime.
 */
export function getMockAggregationRows(metricsViewName, options = {}) {
  const { dimension = "channel" } = options;
  if (dimension === "time") {
    return buildMockTimeSeries();
  }
  return MOCK_ROWS[dimension] || MOCK_ROWS.channel;
}

/**
 * Produce mock time-series rows bucketed per day for the temporal charts
 * (e.g. the Explore "Revenue over time" chart). Rows are keyed on the metrics
 * view's time dimension (`time`) with a per-channel revenue split.
 */
export function buildMockTimeSeries() {
  const rows = [];
  for (let day = 0; day < TIME_SERIES_DAYS; day += 1) {
    const iso = new Date(TIME_SERIES_START + day * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const dayRevenue = 10000 + day * 1500;
    const dayOrders = 180 + day * 18;
    for (const [channel, weight] of Object.entries(CHANNEL_WEIGHTS)) {
      rows.push({
        time: iso,
        channel,
        total_revenue: Math.round(dayRevenue * weight),
        order_count: Math.round(dayOrders * weight),
        aov: Number((dayRevenue / dayOrders).toFixed(2)),
      });
    }
  }
  return rows;
}

/**
 * Produce a single-row (no dimension) aggregation response, e.g. for the big
 * number / metric tile: totals across the whole metrics view.
 */
export function getMockTotalRow() {
  return { total_revenue: 111330, order_count: 1714, aov: 64.95 };
}
