import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { readable } from "svelte/store";
import { useRuntimeClient } from "@rilldata/web-common/runtime-client/react";
import { createRuntimeServiceListResources } from "@rilldata/web-common/runtime-client";
import ChartContainer from "@rilldata/web-common/features/components/charts/react/ChartContainer";
import { ViewFrame } from "@/components/shell/ViewFrame";
import { DEFAULT_METRICS_VIEW, MOCK_METRICS_VIEWS } from "@/data/dataSource";
import { useAppStore } from "@/stores/useAppStore";

/**
 * Rill-style `/dashboard` artifact view.
 *
 * With a `:name` it renders a real Rill dashboard (charts fed from the runtime
 * metrics view named `name`). Without one it lists the project's dashboards
 * (Explore/Canvas resources from the runtime, falling back to the registered mock
 * metrics views) and links through to the per-artifact `/dashboard/:name` route.
 */
export function DashboardView() {
  const { name } = useParams();
  const navigate = useNavigate();
  const runtimeClient = useRuntimeClient();
  const { currentOrganization, currentWorkspace } = useAppStore();

  const oSlug = currentOrganization?.slug || currentOrganization?.id;
  const pSlug = currentWorkspace?.slug || currentWorkspace?.id;

  const dashboardsQuery = createRuntimeServiceListResources(runtimeClient, {}, {
    query: {
      select: (data) =>
        (data.resources ?? []).filter((res) => res.canvas || res.explore),
    },
  });

  const dashboards = useMemo(() => {
    const fromRuntime = (dashboardsQuery.data ?? []).map(
      (res) => res.meta?.name?.name,
    );
    if (fromRuntime.length > 0) return fromRuntime;
    // Mock/local fallback: the product's registered metrics views.
    return Object.keys(MOCK_METRICS_VIEWS);
  }, [dashboardsQuery.data]);

  if (name) {
    return <DashboardDetail metricsView={name} />;
  }

  return (
    <ViewFrame
      title="Dashboards"
      description="Select a dashboard to open it at its artifact URL."
      maxWidthClassName="full-width"
    >
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((dashboardName) => (
          <button
            key={dashboardName}
            onClick={() => navigate(`/app/${oSlug}/${pSlug}/dashboard/${dashboardName}`)}
            className="rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/5"
          >
            <h3 className="text-sm font-medium">{dashboardName}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Live charts from the {dashboardName} metrics view
            </p>
          </button>
        ))}
      </div>
    </ViewFrame>
  );
}

/**
 * Renders a compact real dashboard for a specific metrics view. Each chart is a
 * ported `ChartContainer` fed by the runtime client, mirroring `ExploreView`.
 */
function DashboardDetail({ metricsView }) {
  const runtimeClient = useRuntimeClient();
  const viewName = metricsView || DEFAULT_METRICS_VIEW;

  return (
    <ViewFrame
      title={viewName}
      description={`Live dashboard for the ${viewName} metrics view.`}
      className="full-width"
    >
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <DashboardChart
          title="Revenue by channel"
          chartType="bar_chart"
          metricsView={viewName}
          spec={{
            metrics_view: viewName,
            x: { field: "channel", type: "nominal" },
            y: { field: "total_revenue", type: "quantitative" },
            isInteractive: false,
          }}
          tafs={buildStaticTafs()}
        />
        <DashboardChart
          title="Orders by channel"
          chartType="bar_chart"
          metricsView={viewName}
          spec={{
            metrics_view: viewName,
            x: { field: "channel", type: "nominal" },
            y: { field: "order_count", type: "quantitative" },
            isInteractive: false,
          }}
          tafs={buildStaticTafs()}
        />
      </div>
    </ViewFrame>
  );
}

function DashboardChart({ title, chartType, spec, tafs }) {
  const runtimeClient = useRuntimeClient();
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

export default DashboardView;
