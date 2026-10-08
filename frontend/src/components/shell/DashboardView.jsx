import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/react";
import { getRuntimeServiceListResourcesQueryOptions } from "@statsparrot/web-common/runtime-client";
import { useQuery } from "@tanstack/react-query";
import { StateManagersProvider } from "@statsparrot/web-common/features/dashboards/state-managers/react";
import { ViewFrame } from "@/components/shell/ViewFrame";
import {
  DEFAULT_METRICS_VIEW,
  MOCK_METRICS_VIEWS,
  getMockMetricsView,
  resolveDataSource,
} from "@/data/dataSource";
import { useAppStore } from "@/stores/useAppStore";
import { MockMetricsExplorer, RuntimeMetricsExplorer } from "@/components/shell/MetricsExploreView";

/**
 * Parrot-style `/dashboard` artifact view.
 *
 * With a `:name` it renders a real Parrot dashboard (charts fed from the runtime
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

  const dashboardsQuery = useQuery(
    getRuntimeServiceListResourcesQueryOptions(runtimeClient, {}, {
      query: {
        // Fail fast when no Parrot runtime is reachable so the mock list renders
        // instead of retrying a connection-refused request in the background.
        retry: false,
        select: (data) =>
          (data.resources ?? []).filter((res) => res.canvas || res.explore),
      },
    }),
  );

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
        {dashboards.map((dashboardName) => {
          const view = getMockMetricsView(dashboardName);
          const measureCount = view?.measures?.length ?? 0;
          const dimensionCount = (view?.dimensions ?? []).filter(
            (d) => d.type !== "DIMENSION_TYPE_TIME",
          ).length;
          return (
            <button
              key={dashboardName}
              onClick={() => navigate(`/app/${oSlug}/${pSlug}/dashboard/${dashboardName}`)}
              className="group flex flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/5"
            >
              <div className="flex items-center justify-between">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                  dashboard
                </span>
                <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </div>
              <h3 className="mt-2 text-sm font-medium">{dashboardName}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {measureCount} measure{measureCount === 1 ? "" : "s"} ·{" "}
                {dimensionCount} dimension{dimensionCount === 1 ? "" : "s"}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {(view?.measures ?? []).slice(0, 3).map((m) => (
                  <span
                    key={m.name}
                    className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {m.displayName || m.name}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </ViewFrame>
  );
}

/**
 * Renders a real dashboard for a specific metrics view by reusing the same
 * explorer surface that powers the Explore route (filters, KPI cards, charts,
 * leaderboard / dimension table / pivot). In runtime mode the live explorer is
 * used; otherwise the mock explorer keeps the dashboard populated without a
 * running Parrot runtime.
 */
function DashboardDetail({ metricsView }) {
  const viewName = metricsView || DEFAULT_METRICS_VIEW;
  const dataSource = resolveDataSource();
  const [searchParams] = useSearchParams();

  if (dataSource.mode === "runtime") {
    return (
      <ViewFrame
        title={viewName}
        description={`Live dashboard for the ${viewName} metrics view.`}
        className="full-width"
      >
        <StateManagersProvider metricsViewName={viewName} exploreName={viewName}>
          <RuntimeMetricsExplorer metricsView={viewName} searchParams={searchParams} />
        </StateManagersProvider>
      </ViewFrame>
    );
  }

  return (
    <ViewFrame
      title={viewName}
      description={`Live dashboard for the ${viewName} metrics view.`}
      className="full-width"
    >
      <MockMetricsExplorer metricsView={viewName} />
    </ViewFrame>
  );
}

export default DashboardView;
