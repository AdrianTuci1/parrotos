import { resolveDataSource } from "@/data/dataSource";
import {
  MessageContentType,
  MessageType,
  ToolName,
} from "@rilldata/web-common/features/chat/core/types";

// ═══════════════════════════════════════════════════════════════════════════
// RILL AGENT ROUTER — adapter for the product chat
// ═══════════════════════════════════════════════════════════════════════════
//
// The product chat (ChatView/ChatPanel/ChatComposer) models conversation as
// `{ role, content, toolCalls: [{ type: 'chart', chartSpec, chartType }, ...] }`.
// Rill's chat instead streams the Go runtime's `/ai/complete/stream` endpoint
// as `V1Message[]` (CALL/RESULT frames emitted by router_agent -> analyst_agent,
// with `create_chart` tools returning `{ chart_type, spec }`).
//
// This module is the bridge: it turns a product prompt into a Rill router
// request, streams the runtime completion, and translates the parsed stream
// back into the product's text + `create_chart` toolCalls (which the existing
// rillChatAdapter/ChartBlock path renders as a real chart). When the runtime's
// AI backend is unreachable/not configured, it falls back to a deterministic
// mock router that answers simple prompts with a `create_chart` call against
// the default metrics view (the .rill-demo `orders_metrics` view).
//
// Callers only need `sendToRillRouter(...)`. It returns
//   { conversationId, text, toolCalls, fromMock }
// where `toolCalls` entries are already product-shaped so ChatPanel renders
// them via RillChartStream without further transformation.

/** Default agent for the product chat (dashboards/questions -> analyst). */
export const DEFAULT_AGENT = ToolName.ANALYST_AGENT;

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

/**
 * Send one product prompt through the Rill agent router and return the parsed
 * assistant reply as product-shaped `{ text, toolCalls }`.
 *
 * @param {object} opts
 * @param {object|undefined} opts.runtimeClient  Rill RuntimeClient (from useRuntimeClient).
 * @param {string} opts.prompt                   The user's message.
 * @param {string|undefined} opts.conversationId Rill conversation to continue.
 * @param {string} [opts.agent]                  Agent to route to (analyst_agent).
 * @param {AbortSignal} [opts.signal]
 */
export async function sendToRillRouter({
  runtimeClient,
  prompt,
  conversationId,
  agent = DEFAULT_AGENT,
  signal,
}) {
  const dataSource = resolveDataSource();
  const metricsView = dataSource.defaultMetricsView;

  const canReachRuntime = Boolean(runtimeClient?.host && runtimeClient?.instanceId);

  if (canReachRuntime) {
    try {
      const result = await streamFromRuntime({
        runtimeClient,
        prompt,
        conversationId,
        agent,
        signal,
      });

      // An empty response (no text, no tool calls) usually means the AI backend
      // is not fully configured. Fall back to the deterministic mock router so
      // the user still gets a rendered chart rather than a blank reply.
      if (result.text || result.toolCalls.length > 0) {
        return result;
      }
    } catch {
      // Runtime/AI backend not reachable or no agent configured — fall through
      // to the deterministic mock router below rather than surfacing a network
      // error in the product chat.
    }
  }

  return mockRouter({ prompt, metricsView });
}

// ═══════════════════════════════════════════════
// LIVE ROUTER — runtime `/ai/complete/stream`
// ═══════════════════════════════════════════════

async function streamFromRuntime({
  runtimeClient,
  prompt,
  conversationId,
  agent,
  signal,
}) {
  const { host, instanceId } = runtimeClient;
  const jwt = typeof runtimeClient.getJwt === "function"
    ? runtimeClient.getJwt()
    : runtimeClient.jwt;

  let convId = conversationId;
  const textParts = [];
  const toolCalls = [];
  const chartCallById = new Map(); // create_chart CALL id -> product toolCall

  const body = {
    conversationId: convId || undefined,
    prompt,
    agent,
  };

  await streamCompleteEndpoint({
    host,
    instanceId,
    jwt,
    body,
    signal,
    onFrame: ({ event, data }) => {
      if (event === "error") {
        throw new Error(data || "Rill runtime completion failed");
      }

      let frame;
      try {
        frame = JSON.parse(data);
      } catch {
        return;
      }

      if (frame.conversationId) convId = frame.conversationId;

      const message = frame.message;
      if (!message || message.role === "user") return;

      const tool = message.tool;

      // router_agent RESULT messages carry the assistant's natural-language reply.
      if (tool === ToolName.ROUTER_AGENT) {
        if (message.type === MessageType.RESULT) {
          const reply = extractRouterReply(message);
          if (reply) textParts.push(reply);
        }
        return;
      }

      // create_chart -> product chart toolCall (rendered by ChartBlock).
      if (tool === ToolName.CREATE_CHART) {
        if (message.type === MessageType.CALL) {
          const toolCall = buildChartToolCall(message);
          if (toolCall) {
            chartCallById.set(message.id, toolCall);
            toolCalls.push(toolCall);
          }
        } else if (message.type === MessageType.RESULT) {
          const toolCall = chartCallById.get(message.parentId);
          if (toolCall) {
            toolCall.status = message.contentType === MessageContentType.ERROR ? "error" : "complete";
          }
        }
        return;
      }

      // Other Rill tools (run_sql, list_metrics_views, navigate, etc.) are
      // intentionally not mapped to product toolCalls — they have no product
      // renderer and are internal to the agent's reasoning.
    },
  });

  return {
    conversationId: convId,
    text: textParts.join("\n").trim(),
    toolCalls,
    fromMock: false,
  };
}

// ═══════════════════════════════════════════════
// SSE TRANSPORT — POST /v1/instances/{id}/ai/complete/stream
// ═══════════════════════════════════════════════

async function streamCompleteEndpoint({
  host,
  instanceId,
  jwt,
  body,
  signal,
  onFrame,
}) {
  const url = `${host}/v1/instances/${instanceId}/ai/complete/stream?stream=messages`;

  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Rill runtime complete failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  let event = "message";
  const dataLines = [];

  const flush = () => {
    if (dataLines.length === 0) return;
    onFrame({ event, data: dataLines.join("\n") });
    event = "message";
    dataLines.length = 0;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line. Process complete lines and keep
    // any trailing partial line in `buffer` so a `data:` body split across chunks
    // is not emitted prematurely.
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim() || "message";
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      } else if (line === "") {
        flush();
      }
    }
  }
  flush();
}

// ═══════════════════════════════════════════════
// MOCK ROUTER — deterministic fallback
// ═══════════════════════════════════════════════

/**
 * Deterministic mock agent router. Answers simple prompts with a `create_chart`
 * tool call against the default metrics view so the product chat always yields a
 * rendered chart even when no AI backend is reachable. The chart spec references
 * a real metrics view (orders_metrics) so ChartContainer can query it through the
 * live runtime when one is present.
 */
function mockRouter({ prompt, metricsView }) {
  const { dimension, measure, chartType } = pinPromptToChart(prompt);
  const title = "Revenue by " + dimension;

  const toolCall = {
    id: `mock-create-chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "chart",
    action: "create_chart",
    chartType,
    chartSpec: buildMockChartSpec({ metricsView, dimension, measure }),
    title,
    status: "complete",
  };

  return {
    conversationId: null,
    text: `Here's your chart, built from the \`${metricsView}\` metrics view. I broke revenue down by ${dimension}.`,
    toolCalls: [toolCall],
    fromMock: true,
  };
}

/** Pick a deterministic (dimension, measure, chartType) from the prompt keywords. */
function pinPromptToChart(prompt) {
  const p = (prompt || "").toLowerCase();
  if (/(revenue|sales|amount|spend)/.test(p)) {
    return { dimension: "channel", measure: "total_revenue", chartType: "bar_chart" };
  }
  if (/(count|orders|volume|transactions)/.test(p)) {
    return { dimension: "channel", measure: "order_count", chartType: "bar_chart" };
  }
  if (/(over time|trend|daily|by day)/.test(p)) {
    return { dimension: "time", measure: "total_revenue", chartType: "line_chart" };
  }
  if (/(aov|average order)/.test(p)) {
    return { dimension: "country", measure: "aov", chartType: "bar_chart" };
  }
  return { dimension: "channel", measure: "total_revenue", chartType: "bar_chart" };
}

/** Build a valid create_chart spec (metrics_view + time_range are required). */
function buildMockChartSpec({ metricsView, dimension, measure }) {
  const isTime = dimension === "time";
  return {
    metrics_view: metricsView,
    time_range: {
      start: "2026-01-01T00:00:00Z",
      end: "2026-12-31T23:59:59Z",
      time_zone: "UTC",
    },
    x: isTime
      ? { field: dimension, type: "temporal", time_grain: "TIME_GRAIN_DAY" }
      : { field: dimension, type: "nominal", sort: "-y" },
    y: { field: measure, type: "quantitative" },
    ...(isTime ? { time_grain: "TIME_GRAIN_DAY" } : {}),
  };
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

/**
 * Extract the assistant reply from a router_agent RESULT message. Its contentData
 * is JSON `{ response, agent }` (RouterAgentResult). Mirrors Rill's
 * `extractMessageText` for router_agent messages without pulling in the Svelte
 * helpers.
 */
function extractRouterReply(message) {
  const raw = message.contentData || "";
  if (message.contentType !== MessageContentType.JSON) return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed.response || raw;
  } catch {
    return raw;
  }
}

/**
 * Build a product chat `create_chart` toolCall from a Rill CALL message, whose
 * contentData is JSON `{ chart_type, spec }` (CreateChartArgs). Returns null when
 * the message is malformed.
 */
function buildChartToolCall(message) {
  let data;
  try {
    data = JSON.parse(message.contentData || "{}");
  } catch {
    return null;
  }
  if (!data?.chart_type) return null;

  return {
    id: message.id,
    type: "chart",
    action: "create_chart",
    chartType: data.chart_type,
    chartSpec: data.spec,
    title: data.message || "Chart",
    status: "pending",
  };
}
