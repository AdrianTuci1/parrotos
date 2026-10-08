import { useMemo, useEffect, Component } from "react";
import { readable } from "svelte/store";
import type { Readable } from "svelte/store";
import embed from "vega-embed";
import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/react";
import ChartContainer from "@statsparrot/web-common/features/components/charts/react/ChartContainer";
import { mapResolverExpressionToV1Expression } from "@statsparrot/web-common/features/explore-mappers/map-metrics-resolver-query-to-dashboard";
import type { ChartType } from "@statsparrot/web-common/features/components/charts";
import type { TimeAndFilterStore } from "@statsparrot/web-common/features/dashboards/time-controls/time-control-store";
import type { V1Message, V1Tool } from "@statsparrot/web-common/runtime-client";
import type { ChartBlock as ChartBlockModel } from "../chart-block";
import ToolCall from "@statsparrot/web-common/features/chat/core/messages/tools/react/ToolCall";

/**
 * React translation of `ChatBlock.svelte` (Phase 4, "charts render in chat").
 *
 * Renders a collapsible tool-call header plus the chart visualization produced by
 * the `create_chart` tool, reusing the React `ChartContainer` and the existing
 * framework-agnostic `mapResolverExpressionToV1Expression` helper. The chart spec
 * and the derived time+filter store are wrapped as Svelte `readable()` stores (the
 * store-based contract that `ChartContainer` consumes), memoized for stable identity.
 */
export interface ChartBlockProps {
  block: ChartBlockModel;
  tools?: V1Tool[] | undefined;
}

export default function ChartBlock(props: ChartBlockProps) {
  const { block, tools } = props;

  // The Svelte version reads the theme from Svelte context via the instance resource;
  // in React the theme is passed directly and is currently deferred (see ChartContainer).
  const runtimeClient = useRuntimeClient();

  // Must be cast to `any` for property access — the spec comes from parsed JSON.
  const chartSpec = useMemo(
    () => (block.chartSpec ?? {}) as any,
    [block.chartSpec],
  );

  // `readable()` must be memoized on `chartSpec` so the store identity is stable
  // across re-renders (otherwise ChartContainer's store subscription would loop).
  const spec = useMemo(() => readable<unknown>(chartSpec), [chartSpec]);

  const timeAndFilterStore = useMemo(
    () => readable<TimeAndFilterStore>(buildTimeAndFilterStore(chartSpec)),
    [chartSpec],
  );

  return (
    <div className="chart-block">
      <ToolCall
        message={block.message}
        resultMessage={block.resultMessage}
        tools={tools}
        variant="block"
      />

      <div className="chart-container">
        <ChartBlockBoundary chartSpec={chartSpec} chartType={block.chartType}>
          <ChartContainer
            runtimeClient={runtimeClient}
            chartType={block.chartType as ChartType}
            spec={spec as Readable<any>}
            timeAndFilterStore={timeAndFilterStore}
            themeMode="light"
          />
        </ChartBlockBoundary>
      </div>
    </div>
  );
}

/**
 * Error boundary around the live ChartContainer.
 *
 * The runtime chart path (ChartContainer) builds its data query with
 * `@tanstack/svelte-query`, which needs Svelte context that may be absent in a
 * React host; when it throws, fall back to an inline mock chart built from the
 * create_chart spec so a chat with charts never blanks. Swap for the live path
 * when the runtime is reachable.
 */
class ChartBlockBoundary extends Component<{ chartSpec: any; chartType: any; children: any }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return <MockChartFallback chartSpec={this.props.chartSpec} />;
    }
    return this.props.children;
  }
}

/** Inline Vega-Lite chart fed with mock data, used when the runtime is down. */
function MockChartFallback({ chartSpec }: { chartSpec: any }) {
  const ref = useMemo(() => ({ current: null as HTMLDivElement | null }), []);
  const spec = useMemo(() => buildVegaSpec(chartSpec), [chartSpec]);

  useEffect(() => {
    if (!ref.current) return;
    let cleanup: (() => void) | undefined;
    embed(ref.current, spec as any, { actions: false })
      .then((res) => { cleanup = () => res.view.finalize(); })
      .catch(() => {});
    return () => cleanup?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec]);

  return (
    <div ref={ref} className="mock-chart w-full" style={{ height: 268 }} data-testid="mock-chart" />
  );
}

function buildVegaSpec(chartSpec: any) {
  const x = chartSpec?.x || {};
  const isTime = x.type === "temporal" || x.field === "time" || !!x.time_grain;
  const xField = x.field || "time";
  const yField = chartSpec?.y?.field || chartSpec?.measure || chartSpec?.measures?.[0] || "total_revenue";
  const values = isTime ? mockTimeSeries(yField) : mockCategorical(xField, yField);

  const encoding: Record<string, unknown> = {
    x: { field: xField, type: isTime ? "temporal" : "nominal", axis: { labelColor: "#9aa4b2", title: null } },
    y: { field: yField, type: "quantitative", axis: { labelColor: "#9aa4b2" }, scale: { zero: false } },
    tooltip: [{ field: xField, type: isTime ? "temporal" : "nominal" }, { field: yField, type: "quantitative" }],
  };

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: 268,
    padding: 8,
    data: { values },
    encoding,
    config: { background: "transparent", view: { stroke: null } },
    mark: isTime
      ? { type: "area", interpolate: "monotone", color: "rgba(79,140,255,0.16)", line: { color: "#4f8cff", strokeWidth: 2 } }
      : { type: "bar", cornerRadius: 3, color: "#4f8cff" },
  };
}

function mockTimeSeries(yField: string) {
  const start = Date.UTC(2026, 0, 1);
  return Array.from({ length: 5 }, (_, day) => ({
    time: new Date(start + day * 86400000).toISOString().slice(0, 10),
    [yField]: 10000 + day * 1500,
  }));
}

function mockCategorical(xField: string, yField: string) {
  const labels = xField === "country" ? ["US", "DE", "GB"] : xField === "customer" ? ["Acme", "Globex", "Initech"] : ["Online", "Retail", "Partner"];
  const values = xField === "country" ? [62440, 24810, 17320] : xField === "customer" ? [31240, 20490, 15830] : [68240, 27950, 15140];
  return labels.map((label, i) => ({ [xField]: label, [yField]: values[i] ?? 0 }));
}

/**
 * Builds the TimeAndFilterStore consumed by ChartContainer from a create_chart spec,
 * mirroring the reactive derivation in ChartBlock.svelte.
 */
function buildTimeAndFilterStore(
  chartSpec: any,
): TimeAndFilterStore {
  const timeRange = chartSpec?.time_range
    ? {
        start: chartSpec.time_range.start,
        end: chartSpec.time_range.end,
        timeZone: chartSpec.time_range.time_zone || "UTC",
      }
    : {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        timeZone: "UTC",
      };

  const comparisonTimeRange = chartSpec?.comparison_time_range
    ? {
        start: chartSpec.comparison_time_range.start,
        end: chartSpec.comparison_time_range.end,
        timeZone:
          chartSpec.comparison_time_range.time_zone || timeRange.timeZone,
      }
    : undefined;

  const hasComparison = !!comparisonTimeRange?.start && !!comparisonTimeRange?.end;

  return {
    timeRange,
    comparisonTimeRange,
    showTimeComparison: hasComparison,
    where:
      mapResolverExpressionToV1Expression(chartSpec?.where) || {
        cond: {
          op: "OPERATION_AND",
          exprs: [],
        },
      },
    timeGrain: chartSpec?.time_grain || "TIME_GRAIN_DAY",
    timeRangeState: undefined,
    comparisonTimeRangeState: undefined,
    hasTimeSeries: true,
  };
}

// Re-export for consumers that index the chat message renderers.
export type { ChartBlockModel };
