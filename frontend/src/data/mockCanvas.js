import {
  DEFAULT_METRICS_VIEW,
  getMockAggregationRows,
  buildMockTimeSeries,
  getMockTotalRow,
} from "@/data/mockAdapter";
import { applyMockAgentEdit } from "@/data/mockAgent";

/**
 * Mock canvas model + helpers.
 *
 * Rill canvases are YAML files (`dashboards/<name>.yaml`) whose `rows` tree holds
 * components (each an item with a width and a renderer spec). Without a live Rill
 * runtime / file system we keep an equivalent model in memory and persist it to
 * localStorage, so the interactive canvas builder is fully usable in mock mode.
 *
 * Model shape (kept close to Rill's YAML so a later swap to the real file layer is
 * mechanical). A row is either a plain row or a tab group, matching Rill's
 * `V1CanvasRow` where `items` and `tabGroup` are mutually exclusive:
 *   { rows: [ row ] }
 *   row =
 *     { id, kind:'row', height, items: [{ id, type, width, spec, yamlPath }] }
 *   | { id, kind:'tabgroup', name, activeTab,
 *       tabs: [{ id, name, displayName, rows: [plain row] }] }
 * A tab's rows are always plain rows (never a nested tab group), exactly as in Rill.
 * where `spec` holds the per-renderer properties (metrics_view, measures, x/y/color,
 * mark, title, description, etc.) matching the Rill `inputParams()` contract.
 */

export const CANVAS_TYPES = [
  "kpi_grid",
  "line",
  "bar",
  "area",
  "leaderboard",
  "pivot",
  "table",
  "markdown",
  "image",
];

export const COLUMN_COUNT = 12;
export const MIN_WIDTH = 3;
export const MAX_ITEMS_PER_ROW = 4;
export const DEFAULT_ROW_HEIGHT = 320;
export const MIN_ROW_HEIGHT = 120;

const STORAGE_PREFIX = "sentry-canvas:";

/** Stable id generator for components/rows (short, like Rill's `generateId`). */
function genId(prefix = "c") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function titleFor(type) {
  switch (type) {
    case "kpi_grid":
      return "Key metrics";
    case "line":
      return "Revenue over time";
    case "bar":
      return "Revenue by channel";
    case "area":
      return "Revenue trend";
    case "leaderboard":
      return "Top customers";
    case "pivot":
      return "Breakdown";
    case "table":
      return "Data table";
    case "markdown":
      return "Note";
    case "image":
      return "Image";
    default:
      return "Card";
  }
}

/**
 * A default renderer spec for a freshly-added component of `type`, matching the
 * Rill `inputParams` keys so the editor / AI patch layer can target them directly.
 */
export function blankSpec(type, { metricsView = DEFAULT_METRICS_VIEW } = {}) {
  const base = {
    metrics_view: metricsView,
    title: titleFor(type),
    description: "",
    show_description_as_tooltip: false,
  };
  switch (type) {
    case "kpi_grid":
      return {
        ...base,
        measures: ["total_revenue"],
        sparkline: true,
        comparison: false,
        mark: "area",
        formatPreset: "currency",
      };
    case "line":
    case "bar":
    case "area":
      return {
        ...base,
        x: { field: "time", type: "temporal", time_grain: "TIME_GRAIN_DAY" },
        y: { field: "total_revenue", type: "quantitative" },
        mark: type,
        sparkline: true,
      };
    case "leaderboard":
      return {
        ...base,
        measures: ["total_revenue"],
        dimensions: ["channel"],
        num_rows: 5,
      };
    case "pivot":
    case "table":
      return {
        ...base,
        columns: ["channel", "total_revenue", "order_count", "aov"],
        hide_totals_row: false,
      };
    case "markdown":
      return {
        content: "## Insights\n\nAdd a note, headline, or callout to this canvas.",
        alignment: "left",
        apply_formatting: true,
      };
    case "image":
      return {
        url: "https://picsum.photos/seed/rillcanvas/800/300",
        alignment: "center",
      };
    default:
      return { ...base };
  }
}

/** Build an item object for a component type within a given row. */
export function makeItem(type, width = 6, { metricsView, parentRow } = {}) {
  return {
    id: genId(),
    type,
    width,
    spec: blankSpec(type, { metricsView }),
    yamlPath: parentRow ? [...parentRow, "items"] : undefined,
  };
}

/** Seed canvas model: a KPI grid row, a line + bar row, a leaderboard + markdown row. */
export function defaultCanvas(name) {
  const row1 = { id: genId("r"), kind: "row", height: 180, items: [makeItem("kpi_grid", 12)] };
  const row2 = {
    id: genId("r"),
    kind: "row",
    height: DEFAULT_ROW_HEIGHT,
    items: [makeItem("line", 7), makeItem("bar", 5)],
  };
  const row3 = {
    id: genId("r"),
    kind: "row",
    height: DEFAULT_ROW_HEIGHT,
    items: [makeItem("leaderboard", 6), makeItem("markdown", 6)],
  };
  return { name, rows: [row1, row2, row3] };
}

/** Build a plain row container holding one item of `type`. */
export function makeRow(type, height = 300) {
  return { id: genId("r"), kind: "row", height, items: [makeItem(type, 12)] };
}

/** Build a tab within a tab group; a tab's rows are plain rows only (Rill parity). */
export function makeTab(index = 0) {
  const displayName = `Tab ${index + 1}`;
  return {
    id: genId("t"),
    name: displayName.toLowerCase().replace(/\s+/g, "-"),
    displayName,
    rows: [],
  };
}

/** Build a new tab group containing a single empty tab. */
export function makeTabGroup(index = 1) {
  const tabs = [makeTab(0)];
  return {
    id: genId("g"),
    kind: "tabgroup",
    name: `group-${index}`,
    activeTab: tabs[0].id,
    tabs,
  };
}

/** Normalize a saved (or freshly built) rows tree to the canonical model shape. */
function normalizeTab(tab, i) {
  if (!tab || typeof tab !== "object") return makeTab(i);
  return {
    id: tab.id || genId("t"),
    name: tab.name || `tab-${i + 1}`,
    displayName: tab.displayName || tab.name || `Tab ${i + 1}`,
    rows: normalizeRows(tab.rows),
  };
}

function normalizeRows(rows) {
  return (rows || []).map((row, i) => {
    if (Array.isArray(row.tabs) || row.kind === "tabgroup") {
      const tabs = (row.tabs || []).map(normalizeTab);
      return {
        id: row.id || genId("g"),
        kind: "tabgroup",
        name: row.name || `group-${i + 1}`,
        activeTab: row.activeTab || (tabs[0] && tabs[0].id),
        tabs,
      };
    }
    return {
      id: row.id || genId("r"),
      kind: "row",
      height: row.height ?? DEFAULT_ROW_HEIGHT,
      items: (row.items || []).map((it) => ({ ...it, id: it.id || genId() })),
    };
  });
}

/** Ensure a parsed model object (from storage or a runtime YAML blob) matches shape. */
export function normalizeCanvasModel(parsed) {
  if (!parsed || !Array.isArray(parsed.rows)) return parsed;
  return { ...parsed, rows: normalizeRows(parsed.rows) };
}

export function loadCanvas(name) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${name}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeCanvasModel(parsed);
    }
  } catch {
    // Ignore malformed storage; fall back to the seed.
  }
  return defaultCanvas(name);
}

export function saveCanvas(name, model) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${name}`, JSON.stringify(model));
  } catch {
    // Quota/storage errors are non-fatal for the mock builder.
  }
}

// ─── Per-card render helpers ────────────────────────────────────────────────

/** Dimensions available in the mock metrics view (for editor selectors). */
export function mockDimensions() {
  return ["channel", "country", "customer", "time"];
}

/** Measures available in the mock metrics view (for editor selectors). */
export function mockMeasures() {
  return ["total_revenue", "order_count", "aov"];
}

/**
 * Resolve the MockChart props for a chart/KPI/leaderboard card spec so the card
 * renders real mock data (time series when x is temporal, categorical rows otherwise).
 */
export function getCardData(spec) {
  const metricsView = spec?.metrics_view || DEFAULT_METRICS_VIEW;
  const x = spec?.x || {};
  const isTime = x.type === "temporal" || x.field === "time";
  let values;
  let xField;
  let xType;
  if (isTime) {
    values = buildMockTimeSeries();
    xField = "time";
    xType = "temporal";
  } else {
    const dim = x.field || "channel";
    values = getMockAggregationRows(metricsView, { dimension: dim });
    xField = dim;
    xType = "nominal";
  }
  const yField = (spec?.y && spec.y.field) || (spec?.measures && spec.measures[0]) || "total_revenue";
  return {
    values,
    xField,
    yField,
    xType,
    colorField: spec?.color && spec.color.field ? spec.color.field : isTime ? "channel" : undefined,
    mark: spec?.mark || "area",
  };
}

/** Big-number value for a KPI card (from the mock totals row). */
export function getKpiValue(measure = "total_revenue") {
  return getMockTotalRow()[measure];
}

/** Format a numeric value using a Rill-style formatPreset shorthand. */
export function formatCanvasValue(value, formatPreset) {
  if (value == null) return "—";
  switch (formatPreset) {
    case "currency":
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
    case "percent":
      return `${Number(value).toFixed(1)}%`;
    case "number":
      return new Intl.NumberFormat("en-US").format(value);
    default:
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  }
}

/**
 * Apply the "Edit with AI" prompt to a card spec via the shared mock intent
 * interpreter, returning `{ patch, message }`. The interpreter targets card-field
 * keys (mark / sparkline / comparison / formatPreset / displayName / description)
 * so `updateComponent(spec, patch)` can merge them directly.
 */
export function applyAiToSpec(prompt, spec = {}) {
  return applyMockAgentEdit(prompt, {
    ...spec,
    displayName: spec.displayName || spec.title || "",
  });
}
