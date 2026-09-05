import { useMemo } from "react";
import { readable } from "svelte/store";
import type { Readable } from "svelte/store";
import { useRuntimeClient } from "@rilldata/web-common/runtime-client/react";
import ChartContainer from "@rilldata/web-common/features/components/charts/react/ChartContainer";
import { mapResolverExpressionToV1Expression } from "@rilldata/web-common/features/explore-mappers/map-metrics-resolver-query-to-dashboard";
import type { ChartType } from "@rilldata/web-common/features/components/charts";
import type { TimeAndFilterStore } from "@rilldata/web-common/features/dashboards/time-controls/time-control-store";
import type { V1Message, V1Tool } from "@rilldata/web-common/runtime-client";
import type { ChartBlock as ChartBlockModel } from "../chart-block";
import ToolCall from "@rilldata/web-common/features/chat/core/messages/tools/react/ToolCall";

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
        <ChartContainer
          runtimeClient={runtimeClient}
          chartType={block.chartType as ChartType}
          spec={spec as Readable<any>}
          timeAndFilterStore={timeAndFilterStore}
          themeMode="light"
        />
      </div>
    </div>
  );
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
