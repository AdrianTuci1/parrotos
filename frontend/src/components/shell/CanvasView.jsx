import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/react";
import { getRuntimeServiceListResourcesQueryOptions } from "@statsparrot/web-common/runtime-client";
import { useQuery } from "@tanstack/react-query";
import { ViewFrame } from "@/components/shell/ViewFrame";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { DEFAULT_METRICS_VIEW, MOCK_METRICS_VIEWS } from "@/data/dataSource";
import { useAppStore } from "@/stores/useAppStore";

/**
 * Parrot-style `/canvas` artifact view.
 *
 * With a `:name` it renders the interactive canvas editor (select / edit / add /
 * remove / reorder / resize cards, persisted to localStorage in mock mode). Without
 * one it lists the project's canvases (falling back to the registered metrics views
 * when no runtime data is present) and links through to `/canvas/:name`.
 */
export function CanvasView() {
  const { name } = useParams();
  const navigate = useNavigate();
  const runtimeClient = useRuntimeClient();
  const { currentOrganization, currentWorkspace } = useAppStore();

  const oSlug = currentOrganization?.slug || currentOrganization?.id;
  const pSlug = currentWorkspace?.slug || currentWorkspace?.id;

  const canvasesQuery = useQuery(
    getRuntimeServiceListResourcesQueryOptions(runtimeClient, {}, {
      query: {
        retry: false,
        select: (data) =>
          (data.resources ?? []).filter((res) => res.canvas),
      },
    }),
  );

  const canvases = useMemo(() => {
    const fromRuntime = (canvasesQuery.data ?? []).map(
      (res) => res.meta?.name?.name,
    );
    if (fromRuntime.length > 0) return fromRuntime;
    return Object.keys(MOCK_METRICS_VIEWS);
  }, [canvasesQuery.data]);

  if (name) {
    return <CanvasEditor canvasName={name} />;
  }

  return (
    <ViewFrame
      title="Canvas"
      description="Select a canvas to open the interactive editor."
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
                : "Open canvas editor"}
            </p>
          </button>
        ))}
      </div>
    </ViewFrame>
  );
}

export default CanvasView;
