export const EMPTY_PROJECT_TITLE = "Untitled Parrot Project";

export const EXAMPLES = [
  {
    name: "statsparrot-cost-monitoring",
    title: "Cost Monitoring",
    description: "Monitoring cloud infrastructure",
    image: "/img/welcome-bg-cost-monitoring.png",
    firstFile: "/dashboards/cost_overview.yaml",
    connector: "duckdb",
  },
  {
    name: "statsparrot-github-analytics",
    title: "GitHub Analytics",
    description: "A Git project's commit activity",
    image: "/img/welcome-bg-github-analytics.png",
    firstFile: "/dashboards/github_overview.yaml",
    connector: "duckdb",
  },
  {
    name: "statsparrot-retail-demo",
    title: "Retail Orders Demo",
    description: "Revenue and orders by sales channel",
    image: "/img/welcome-bg-cost-monitoring.png",
    firstFile: "/dashboards/orders_overview.yaml",
    connector: "duckdb",
  },
];
