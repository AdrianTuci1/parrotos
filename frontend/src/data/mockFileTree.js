// Shared sample project file tree consumed by both FilesView and ParrotSidebar so the
// two surfaces stay consistent when no live runtime is reachable (mock / local dev
// without a running Parrot instance). It mirrors the `Directory` shape produced by
// `@statsparrot/web-common/features/file-explorer/react/transform-file-list`.
export const SAMPLE_TREE = {
  name: "",
  path: "/",
  directories: [
    {
      name: "models",
      path: "/models",
      directories: [],
      files: ["orders.sql", "users.sql"],
    },
    {
      name: "sources",
      path: "/sources",
      directories: [],
      files: ["adwords.csv", "shopify.csv"],
    },
    {
      name: "metrics",
      path: "/metrics",
      directories: [],
      files: ["orders_metrics.yaml"],
    },
  ],
  files: ["statsparrot.yaml"],
};
