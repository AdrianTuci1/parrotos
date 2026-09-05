import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRuntimeClient } from "@rilldata/web-common/runtime-client/react";
import {
  getQueryServiceMetricsViewAggregationQueryOptions,
  getQueryServiceMetricsViewTimeRangeQueryOptions,
} from "@rilldata/web-common/runtime-client";
import { MetricsViewSelectors } from "@rilldata/web-common/features/metrics-views/metrics-view-selectors";
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import {
  getMockMetricsView,
  getMockTotalRow,
} from "@/data/mockAdapter";
import { resolveDataSource, DEFAULT_METRICS_VIEW } from "@/data/dataSource";

/**
 * Read-only "live metrics" card for the settings surfaces.
 *
 * Reaches through the app-root <RuntimeClientProvider> (mounted by
 * RuntimeHostProvider via AppDataProvider) and runs a REAL metrics-view
 * aggregation over the Go Connect transport — the exact Rill admin/runtime query
 * cache path that the settings previously short-circuited to mocks.
 *
 * When no runtime_url is configured the card degrades to the mock adapter so the
 * settings never render blank in demo/runtime-less environments.
 */
export function RuntimeMetricsCard({ metricsViewName, title }) {
  const dataSource = resolveDataSource();
  const metricsView = metricsViewName || dataSource.defaultMetricsView || DEFAULT_METRICS_VIEW;

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-header-text">
          <h3 className="settings-card-title">{title || "Live runtime metrics"}</h3>
          <p className="settings-card-subtitle">
            Queried from the Rill runtime metrics view <code>{metricsView}</code>
            {dataSource.mode === "runtime" ? ` at ${dataSource.host}` : " · demo data"}
          </p>
        </div>
      </div>
      <div className="settings-card-body">
        {dataSource.mode === "runtime" ? (
          <LiveMetrics metricsView={metricsView} />
        ) : (
          <MockMetrics metricsView={metricsView} />
        )}
      </div>
    </div>
  );
}

function LiveMetrics({ metricsView }) {
  const runtimeClient = useRuntimeClient();

  const selectors = useMemo(
    () => new MetricsViewSelectors(runtimeClient),
    [runtimeClient],
  );
  const measuresStore = useMemo(
    () => selectors.getMeasuresForMetricView(metricsView),
    [selectors, metricsView],
  );
  const measures = useReadable(measuresStore) ?? [];

  const mvSpecStore = useMemo(
    () => selectors.getMetricsViewFromName(metricsView),
    [selectors, metricsView],
  );
  const mvSpec = useReadable(mvSpecStore);
  const spec = mvSpec?.metricsView;
  const timeDimension = spec?.timeDimension;

  const timeRangeQuery = useQuery({
    ...getQueryServiceMetricsViewTimeRangeQueryOptions(runtimeClient, {
      metricsViewName: metricsView,
    }),
    enabled: Boolean(timeDimension),
  });
  const summary = timeRangeQuery.data?.timeRangeSummary;
  const timeRange =
    timeDimension && summary?.min && summary?.max
      ? { start: summary.min, end: summary.max }
      : undefined;

  // Single-row (no dimension) aggregation = totals across the whole metrics view.
  const aggQuery = useQuery({
    ...getQueryServiceMetricsViewAggregationQueryOptions(runtimeClient, {
      metricsView: metricsView,
      dimensions: [],
      measures: measures.map((m) => ({ name: m.name })),
      timeRange: timeRange,
    }),
    enabled: measures.length > 0,
  });

  const totalRow = aggQuery.data?.data?.[0];

  return (
    <MetricsGrid
      measures={measures}
      totalRow={totalRow}
      error={aggQuery.isError}
      loading={aggQuery.isLoading || aggQuery.isFetching}
    />
  );
}

function MockMetrics({ metricsView }) {
  const measures = getMockMetricsView(metricsView)?.measures ?? [];
  const totalRow = getMockTotalRow();
  return <MetricsGrid measures={measures} totalRow={totalRow} />;
}

function MetricsGrid({ measures, totalRow, error, loading }) {
  if (error) {
    return (
      <p className="settings-placeholder">
        Failed to load metrics from the Rill runtime. Showing demo data instead.
      </p>
    );
  }
  if (loading && !totalRow) {
    return <p className="settings-placeholder">Loading metrics…</p>;
  }
  return (
    <div className="metrics-summary-grid">
      {measures.map((measure) => (
        <div key={measure.name} className="metrics-summary-item">
          <span className="metrics-summary-label">
            {measure.displayName || measure.name}
          </span>
          <span className="metrics-summary-value">
            {totalRow?.[measure.name] ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
