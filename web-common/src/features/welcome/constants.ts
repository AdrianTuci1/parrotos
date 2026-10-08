export const EMPTY_PROJECT_TITLE = "Untitled Parrot Project";

export const EXAMPLES = [
  {
    name: "statsparrot-cost-monitoring",
    title: "Cost Monitoring",
    description: "Monitoring cloud infrastructure",
    image: "/img/welcome-bg-cost-monitoring.png",
    firstFile: "/dashboards/margin_scorecard.yaml",
    connector: "duckdb",
  },
  {
    name: "statsparrot-openrtb-prog-ads",
    title: "OpenRTB Programmatic Ads",
    description: "Real-time Bidding (RTB) advertising",
    image: "/img/welcome-bg-openrtb.png",
    firstFile: "/dashboards/auction_explore.yaml",
    connector: "duckdb",
  },
  {
    name: "statsparrot-github-analytics",
    title: "GitHub Analytics",
    description: "A Git project's commit activity",
    image: "/img/welcome-bg-github-analytics.png",
    firstFile: "/dashboards/clickhouse_commits_explore.yaml",
    connector: "clickhouse",
  },
];
