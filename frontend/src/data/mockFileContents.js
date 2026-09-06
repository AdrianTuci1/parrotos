// Mock project file contents, keyed by the same paths used in the sample file tree
// (see ./mockFileTree.js). The product has no live Rill runtime in mock mode, so the
// `/files/{path}` route renders these instead of a CodeMirror-backed editor. Contents
// mirror Rill's sample `orders` project so the file viewer looks realistic.

export const MOCK_FILE_CONTENTS = {
  "/rill.yaml": `version: 1

# Project metadata for the demo orders project.
title: "orders"

# Local development uses DuckDB; a real deployment overrides these via env.
connector: duckdb`,
  "/models/orders.sql": `-- Raw orders fact table.
-- One row per order line, with a channel dimension and a revenue measure.
create table orders as
  select
    'o-' || cast(seq as varchar) as order_id,
    customer,
    channel,
    country,
    cast(ts as timestamp)           as ts,
    cast(revenue as double)         as revenue
  from read_csv_auto('./sources/orders.csv');
`,
  "/models/users.sql": `-- Customers dimension derived from the orders source.
create table users as
  select distinct
    customer,
    country,
    signup_ts
  from read_csv_auto('./sources/users.csv');
`,
  "/sources/adwords.csv": "campaign,clicks,spend,date\na,brand,120,2026-01-01\na,brand,135,2026-01-02\na,generic,88,2026-01-03\nb,brand,142,2026-01-04\nb,generic,95,2026-01-05\n",
  "/sources/shopify.csv": "order_id,customer,channel,country,revenue\no-1,Acme,Online,US,124.5\no-2,Globex,Retail,DE,88\no-3,Initech,Partner,GB,72.1\no-4,Umbrella,Online,US,301.2\n",
  "/metrics/orders_metrics.yaml": `type: metrics_view
model: orders
timeseries: ts

dimensions:
  - name: channel
  - name: country
  - name: customer

measures:
  - name: total_revenue
    expression: sum(revenue)
    format_preset: currency
  - name: order_count
    expression: count(*)
  - name: aov
    expression: sum(revenue) / count(*)
    format_preset: currency
`,
};

/** Resolve the mock content for a file path, or undefined when unknown. */
export function getMockFileContent(filePath) {
  return MOCK_FILE_CONTENTS[filePath] ?? MOCK_FILE_CONTENTS[normalizePath(filePath)];
}

/** Normalize leading slashes so `/models/orders.sql` and `models/orders.sql` match. */
function normalizePath(filePath) {
  if (!filePath) return "";
  return filePath.startsWith("/") ? filePath : `/${filePath}`;
}
