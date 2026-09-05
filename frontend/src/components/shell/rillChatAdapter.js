import { createChartBlock } from "@rilldata/web-common/features/chat/core/messages/chart/chart-block";

/**
 * Message-render adapter: product chat toolCalls -> Rill chart block model.
 *
 * The product chat stream is shaped like:
 *   { id, role, content, toolCalls: [{ id, type, chartSpec, chartType, ... }] }
 * while the Rill React port (`@rilldata/web-common/features/chat`) expects
 * `V1Message[]` with `contentData: { chart_type, spec }` plus a correlated
 * `resultMessage` (see `createChartBlock`). This module maps the store's tool
 * calls onto that Rill model so the ported `Messages` / `ChartBlock` renderers
 * can be fed directly.
 */

const CREATE_CHART_TOOL = "create_chart";

/** Detect whether a product tool-call represents a Rill `create_chart` intent. */
export function isChartToolCall(tool) {
  return Boolean(tool) && (tool.type === "chart" || tool.action === "create_chart");
}

/**
 * Resolve the create_chart arguments from a product tool-call, tolerating the
 * several shapes the product layer emits (chartSpec vs spec; chartType vs
 * chart_type vs config.chart_type). If the chart spec lacks a `metrics_view`
 * it is populated with `metricsView`, so the chart queries a real metrics view
 * through the runtime data layer.
 */
export function resolveChartToolCall(tool, { metricsView } = {}) {
  const chartType =
    tool.chartType || tool.chart_type || tool.config?.chart_type || "bar_chart";
  const raw = tool.chartSpec || tool.spec || {};
  let chartSpec = raw;
  if (typeof chartSpec === "string") {
    try {
      chartSpec = JSON.parse(chartSpec);
    } catch {
      chartSpec = {};
    }
  }
  chartSpec = { ...chartSpec };
  if (metricsView && !chartSpec.metrics_view) {
    chartSpec.metrics_view = metricsView;
  }
  return { chartType, chartSpec };
}

/**
 * Build the Rill `V1Message` CALL/RESULT pair for a chart tool-call.
 * Returns `{ message, resultMessage }`, or `null` when the tool-call is not a
 * chart. Both messages are shaped so `Messages`/`ChartMessage`/`ChartBlock`
 * consume them via the framework-agnostic `createChartBlock` parser.
 */
export function toRillChartMessagePair(tool, opts = {}) {
  if (!isChartToolCall(tool)) return null;

  const { chartType, chartSpec } = resolveChartToolCall(tool, opts);
  const id =
    tool.id ||
    `chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const message = {
    id,
    parentId: "",
    role: "assistant",
    type: "call",
    tool: CREATE_CHART_TOOL,
    contentType: "json",
    contentData: JSON.stringify({ chart_type: chartType, spec: chartSpec }),
  };

  const resultMessage = {
    id: `${id}-result`,
    parentId: id,
    role: "assistant",
    type: "result",
    tool: CREATE_CHART_TOOL,
    contentType: "json",
    contentData: JSON.stringify({
      ok: true,
      message: tool.title || tool.question || "Generated chart",
    }),
  };

  return { message, resultMessage };
}

/**
 * Build the parsed Rill `ChartBlock` model for a chart tool-call (or null).
 * This is the direct bridge from the store's toolCalls to `ChartBlockModel`.
 */
export function toChartBlock(tool, opts = {}) {
  const pair = toRillChartMessagePair(tool, opts);
  if (!pair) return null;
  return createChartBlock(pair.message, pair.resultMessage);
}

/**
 * Build a flat Rill `V1Message[]` (CALL + RESULT pairs) for every chart tool-call
 * in a product chat message, so `<Messages>` renders them as chart blocks.
 */
export function toRillChartMessages(chatMessage, opts = {}) {
  const toolCalls = chatMessage?.toolCalls || [];
  const messages = [];
  for (const tool of toolCalls) {
    const pair = toRillChartMessagePair(tool, opts);
    if (pair) messages.push(pair.message, pair.resultMessage);
  }
  return messages;
}
