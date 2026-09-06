import { useMemo, Component } from "react";
import { BarChart3 } from "lucide-react";
import { Messages } from "@rilldata/web-common/features/chat/core/messages/react";
import { toRillChartMessages, isChartToolCall, resolveChartToolCall } from "./rillChatAdapter";
import MockChart from "@/components/widgets/MockChart";
import {
  getMockAggregationRows,
  buildMockTimeSeries,
} from "@/data/mockAdapter";

/**
 * RillChartStream — renders the chart portion of a product chat message.
 *
 * Maps the store's `toolCalls` onto the Rill `V1Message[]` shape (via
 * `rillChatAdapter`) and renders it with the ported `Messages` renderer, which
 * routes each `create_chart` call through `ChartBlock` (collapsible tool-call
 * header + live chart). Non-chart tool calls are not handled here — the product
 * keeps rendering those through its own dispatcher, so composer/tool behavior
 * is preserved. Returns `null` when the message has no chart tool calls.
 *
 * The ported Rill `ChartContainer` (used by `ChartBlock`) builds its data query
 * with `@tanstack/svelte-query`, which needs a Svelte component context that
 * does not exist in this React host. So the live chart path crashes here. We
 * wrap it in an error boundary and fall back to mock charts (mockAdapter) so a
 * chat with charts never blanks the app, while the real runtime path stays
 * intact for when `ChartContainer` is properly ported to React Query.
 */
export function RillChartStream({ message, metricsView }) {
  const messages = useMemo(
    () => toRillChartMessages(message, { metricsView }),
    [message, metricsView],
  );

  if (messages.length === 0) return null;

  return (
    <div className="chat-rill-chart-blocks">
      <ChartBoundary message={message} metricsView={metricsView}>
        <Messages messages={messages} />
      </ChartBoundary>
    </div>
  );
}

/**
 * Error boundary: if the real runtime chart renderer throws (current React
 * host), render mock charts for the message's chart tool-calls instead.
 */
class ChartBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <MockChatCharts message={this.props.message} metricsView={this.props.metricsView} />;
    }
    return this.props.children;
  }
}

/** Mock chart cards rendered when the runtime chart path is unavailable. */
function MockChatCharts({ message, metricsView }) {
  const tools = (message?.toolCalls || []).filter(isChartToolCall);
  if (tools.length === 0) return null;

  return (
    <>
      {tools.map((tool, i) => (
        <MockChatChart key={tool.id || `chart-${i}`} tool={tool} metricsView={metricsView} />
      ))}
    </>
  );
}

/** One mock chart card derived from a `create_chart` tool-call spec. */
function MockChatChart({ tool, metricsView }) {
  const { chartType, chartSpec } = resolveChartToolCall(tool, { metricsView });
  const mv = chartSpec.metrics_view || metricsView;
  const primaryMeasure = chartSpec.y?.field;
  const xField = chartSpec.x?.field;
  const xType = chartSpec.x?.type;
  const title = tool.title || tool.question || "Chart";

  let values;
  let mark;
  let markField;
  let markType;
  if (xType === "temporal") {
    // Pre-aggregate the per-channel time series into daily totals so the area
    // chart renders a clean single-series series (matches the mock explorer).
    const byDay = new Map();
    for (const row of buildMockTimeSeries()) {
      byDay.set(row.time, (byDay.get(row.time) || 0) + (row[primaryMeasure] ?? 0));
    }
    values = [...byDay.entries()].map(([time, value]) => ({ time, [primaryMeasure]: value }));
    mark = chartType === "line_chart" ? "line" : "area";
    markField = "time";
    markType = "nominal";
  } else {
    values = getMockAggregationRows(mv, { dimension: xField });
    mark = "bar";
    markField = xField;
    markType = "nominal";
  }

  return (
    <div className="chat-embedded-widget">
      <div className="chat-embedded-widget-header">
        <BarChart3 size={14} />
        <span>{title}</span>
      </div>
      <div className="h-72">
        <MockChart
          values={values}
          xField={markField}
          yField={primaryMeasure}
          mark={mark}
          xType={markType}
          height={288}
        />
      </div>
    </div>
  );
}
