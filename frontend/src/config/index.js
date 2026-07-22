export const config = {
  devMode: import.meta.env.VITE_DEV_MODE !== "false",
  apiBaseUrl: import.meta.env.VITE_API_URL || "/api/v1",
  prometheusUrl: import.meta.env.VITE_PROMETHEUS_URL || "http://localhost:9090",
};
