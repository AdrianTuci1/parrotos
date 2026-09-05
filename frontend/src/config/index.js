export const config = {
  devMode: import.meta.env.VITE_DEV_MODE !== "false",
  apiBaseUrl: import.meta.env.VITE_API_URL || "/api/v1",
  prometheusUrl: import.meta.env.VITE_PROMETHEUS_URL || "http://localhost:9090",
  // Rill runtime wiring (single source of truth for env reads; see data/dataSource.js
  // for the dev-mode defaults applied on top of these raw values).
  runtimeUrl: import.meta.env.VITE_RILL_RUNTIME_URL || import.meta.env.VITE_RUNTIME_HOST || "",
  runtimeInstanceId: import.meta.env.VITE_RILL_INSTANCE_ID || import.meta.env.VITE_RUNTIME_INSTANCE_ID || "default",
  runtimeJwt: import.meta.env.VITE_RILL_RUNTIME_JWT || "",
  defaultMetricsView: import.meta.env.VITE_RILL_DEFAULT_METRICS_VIEW || "orders_metrics",
};
