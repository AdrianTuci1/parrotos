import { config } from "@/config";
import {
  DEFAULT_METRICS_VIEW,
  getMockMetricsView,
  getMockMetricsViewResource,
  getMockAggregationRows,
  MOCK_METRICS_VIEWS,
} from "./mockAdapter";

/**
 * Single source of truth for how the BI UI receives its data.
 *
 * The product can run in one of two modes:
 *   - `runtime` — a Rill runtime_url is configured (VITE_RILL_RUNTIME_URL /
 *     VITE_RUNTIME_HOST, or the local dev fallback). The app-root provider mounts
 *     the Rill RuntimeClientProvider + a TanStack React QueryClientProvider, and
 *     the UI queries a real metrics view (`orders_metrics`) over the Go Connect
 *     transport.
 *   - `mock` — no runtime_url is configured. The dashboard and chat areas import
 *     the clearly-named mock adapter (`./mockAdapter`) to render from local mock
 *     metrics-view schemas and sample rows.
 *
 * Everything converges on this module so there is one place that decides which
 * host/instance/metrics-view to target and what the mock fallback looks like.
 */

// Local dev escape hatch: when Rill is run directly with `rill start` the runtime
// is reachable at localhost:9009 on the `default` instance. Point production at a
// real runtime via VITE_RILL_RUNTIME_URL / VITE_RILL_RUNTIME_INSTANCE_ID.
const DEV_RUNTIME_HOST = "http://localhost:9009";
const DEV_RUNTIME_INSTANCE_ID = "default";

/** Resolve the runtime connection settings. */
export function resolveRuntimeConfig() {
  const host = config.runtimeUrl || (config.devMode ? DEV_RUNTIME_HOST : "");
  const instanceId =
    config.runtimeInstanceId || (config.devMode ? DEV_RUNTIME_INSTANCE_ID : "default");

  return {
    enabled: Boolean(host),
    host,
    instanceId,
    jwt: config.runtimeJwt || undefined,
    defaultMetricsView: config.defaultMetricsView || DEFAULT_METRICS_VIEW,
  };
}

/**
 * Resolve the effective data source.
 * Returns `{ mode, ...runtime }` where `mode === "runtime"` when a runtime_url is
 * configured, otherwise `{ mode: "mock" }`. Handy for components that need to know
 * whether to hit the live runtime or the mock adapter.
 */
export function resolveDataSource() {
  const runtime = resolveRuntimeConfig();

  if (runtime.enabled) {
    return {
      mode: "runtime",
      ...runtime,
      metricsViews: MOCK_METRICS_VIEWS,
    };
  }

  return {
    mode: "mock",
    host: "",
    instanceId: "",
    jwt: undefined,
    defaultMetricsView: runtime.defaultMetricsView,
    metricsViews: MOCK_METRICS_VIEWS,
  };
}

/** The default metrics view targeted by the runtime path. */
export { DEFAULT_METRICS_VIEW };
export {
  getMockMetricsView,
  getMockMetricsViewResource,
  getMockAggregationRows,
  MOCK_METRICS_VIEWS,
};
