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
 * Rill-style `/canvas` artifact view.
 *
 * With a `:name` it renders the canvas artifact (real charts fed from the metrics
 * view the canvas builds on). Without one it lists the project's canvases from the
 * runtime and links through to `/canvas/:name`. When no runtime data is present
 * (mock/local) the listing falls back to the registered metrics views so the route
 * still resolves.
 */
export function CanvasView() {
  const { name } = useParams();
  const navigate = useNavigate();
  const runtimeClient = useRuntimeClient();
  const { currentOrganization, currentWorkspace } = useAppStore();

  const oSlug = currentOrganization?.slug || currentOrganization?.id;
  const pSlug = currentWorkspace?.slug || currentWorkspace?.id;

  const canvasesQuery = createRuntimeServiceListResources(runtimeClient, {}, {
    query: {
      select: (data) =>
        (data.resources ?? []).filter((res) => res.canvas),
    },
  });

  const canvases = useMemo(() => {
    const fromRuntime = (canvasesQuery.data ?? []).map(
      (res) => res.meta?.name?.name,
    );
    if (fromRuntime.length > 0) return fromRuntime;
    return Object.keys(MOCK_METRICS_VIEWS);
  }, [canvasesQuery.data]);

  if (name) {
    return <CanvasDetail canvasName={name} />;
  }

  return (
    <ViewFrame
      title="Canvas"
      description="Select a canvas to open it at its artifact URL."
      maxWidthClassName="full-width"
    >
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {canvases.map((canvasName) => (
          <button
            key={canvasName}
            onClick={() => navigate(`/app/${oSlug}/${pSlug}/canvas/${canvasName}`)}
            className="rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/5"
          >
            <h3 className="text-sm font-medium">{canvasName}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {canvasName === "orders_metrics"
                ? "Dashboard-style canvas for the orders metrics view"
                : "Open canvas artifact"}
            </p>
          </button>
        ))}
      </div>
    </ViewFrame>
  );
}

/** Renders a real canvas artifact: charts fed from the runtime metrics view. */
function CanvasDetail({ canvasName }) {
  const runtimeClient = useRuntimeClient();
  const metricsView = canvasName || DEFAULT_METRICS_VIEW;

  return (
    <ViewFrame title={canvasName} description={`Canvas artifact ${canvasName}.`} className="full-width">
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <CanvasChart
          title="Revenue over time"
          chartType="area_chart"
          metricsView={metricsView}
          spec={{
            metrics_view: metricsView,
            x: { field: "time", type: "temporal" },
            y: { field: "total_revenue", type: "quantitative" },
            isInteractive: false,
          }}
          tafs={buildTemporalTafs()}
        />
        <CanvasChart
          title="Revenue by channel"
          chartType="bar_chart"
          metricsView={metricsView}
          spec={{
            metrics_view: metricsView,
            x: { field: "channel", type: "nominal" },
            y: { field: "total_revenue", type: "quantitative" },
            isInteractive: false,
          }}
          tafs={buildStaticTafs()}
        />
      </div>
    </ViewFrame>
  );
}

function CanvasChart({ title, chartType, spec, tafs }) {
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

export default CanvasView;
