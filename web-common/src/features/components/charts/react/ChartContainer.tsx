import { useMemo } from "react";
import type { Readable } from "svelte/store";
import { readable } from "svelte/store";
import type { TimeAndFilterStore } from "@rilldata/web-common/features/dashboards/time-controls/time-control-store";
import { MetricsViewSelectors } from "@rilldata/web-common/features/metrics-views/metrics-view-selectors";
import type { RuntimeClient } from "@rilldata/web-common/runtime-client/v2";
import type { CanvasChartSpec } from "@rilldata/web-common/features/canvas/components/charts";
import type { Theme } from "@rilldata/web-common/features/themes/theme";
import { CHART_CONFIG } from "../config";
import { getChartData } from "../data-provider";
import type {
  ChartDataResult,
  ChartProvider,
  ChartSpec,
  ChartType,
} from "../types";
import Chart from "./Chart";
import { useReadable } from "./useReadable";
import FilterChipsReadOnly from "@rilldata/web-common/features/dashboards/filters/react/FilterChipsReadOnly";

export interface ChartContainerProps {
  /** Runtime client forwarded to Chart/RillChart (Svelte context is unavailable in React). */
  runtimeClient: RuntimeClient;
  chartType: ChartType;
  spec: Readable<ChartSpec>;
  timeAndFilterStore: Readable<TimeAndFilterStore>;
  themeMode?: "light" | "dark";
  theme?: Theme;
  showExploreLink?: boolean;
  organization?: string;
  project?: string;
}

/**
 * React translation of `ChartContainer.svelte` (Phase 2 increment 1).
 *
 * Renders the title header plus a `FilterChipsReadOnly` placeholder and the chart.
 * Deferred from the Svelte version: `ThemeProvider` context, `ExploreLink`, the real
 * `FilterChipsReadOnly` chips row, and the `bind:view` chain (see report). The
 * `.dashboard-theme-boundary` wrapper preserves the scoped CSS-variable resolution that
 * ThemeProvider provided, which canvas chart rendering depends on.
 */
export default function ChartContainer(props: ChartContainerProps) {
  const {
    runtimeClient,
    chartType,
    spec,
    timeAndFilterStore,
    themeMode = "light",
    theme,
  } = props;

  const specValue = useReadable(spec);
  const tafs = useReadable(timeAndFilterStore);

  // The Svelte version reads the parent theme from Svelte context; in React the theme
  // is passed in directly (a React host context bridge is a later increment).
  const effectiveTheme = theme;
  const currentTheme = effectiveTheme?.resolvedThemeObject?.[
    themeMode === "dark" ? "dark" : "light"
  ];

  const chartProvider = useMemo(() => {
    const chartConfig = CHART_CONFIG[chartType];
    return new chartConfig.provider(spec, {}) as ChartProvider;
  }, [chartType, spec]);

  const metricsViewSelectors = useMemo(
    () => new MetricsViewSelectors(runtimeClient),
    [runtimeClient],
  );

  const metricsViewName = specValue?.metrics_view ?? "";
  const measuresStore = useMemo(
    () => metricsViewSelectors.getMeasuresForMetricView(metricsViewName),
    [metricsViewSelectors, metricsViewName],
  );
  const measures = useReadable(measuresStore);

  const dimensionsStore = useMemo(
    () => metricsViewSelectors.getDimensionsForMetricView(metricsViewName),
    [metricsViewSelectors, metricsViewName],
  );
  const dimensions = useReadable(dimensionsStore);

  const chartDataQuery = useMemo(
    () => chartProvider.createChartDataQuery(runtimeClient, timeAndFilterStore),
    [chartProvider, runtimeClient, timeAndFilterStore],
  );

  // `readable(effectiveTheme)` must be memoized so the derived chartData store's identity
  // is stable across re-renders (otherwise the React store subscription would loop).
  const themeStore = useMemo(() => readable(effectiveTheme), [effectiveTheme]);

  const chartData = useMemo(() => {
    if (!specValue) return undefined;
    return getChartData({
      config: specValue,
      chartDataQuery,
      metricsView: metricsViewSelectors,
      themeStore,
      timeAndFilterStore,
      getDomainValues: () => chartProvider.getChartDomainValues(measures ?? []),
      isThemeModeDark: themeMode === "dark",
    });
  }, [
    specValue,
    chartDataQuery,
    metricsViewSelectors,
    themeStore,
    timeAndFilterStore,
    chartProvider,
    measures,
    themeMode,
  ]);

  const chartDataValue = useReadable(chartData);
  const chartTitle = specValue
    ? (chartProvider?.chartTitle?.(chartDataValue?.fields ?? {}) ?? "")
    : "";

  if (!specValue) return null;

  return (
    <div className="dashboard-theme-boundary">
      <div className="size-full flex flex-col">
        {chartTitle ? (
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-x-2 w-full max-w-full overflow-x-auto chip-scroll-container">
              <h4 className="title">{chartTitle}</h4>
              {"metrics_view" in specValue && (
                <FilterChipsReadOnly
                  metricsViewNames={[metricsViewName]}
                  dimensions={dimensions ?? []}
                  measures={measures ?? []}
                  filters={tafs?.where}
                  dimensionsWithInlistFilter={[]}
                  dimensionThresholdFilters={[]}
                  displayTimeRange={tafs?.timeRange}
                  chipLayout="scroll"
                />
              )}
            </div>
          </div>
        ) : null}
        <div className="flex-1">
          <Chart
            runtimeClient={runtimeClient}
            chartType={chartType}
            chartSpec={specValue as unknown as CanvasChartSpec}
            chartData={chartData as Readable<ChartDataResult>}
            measures={measures ?? []}
            themeMode={themeMode}
            theme={currentTheme}
            isCanvas={true}
          />
        </div>
      </div>
    </div>
  );
}
