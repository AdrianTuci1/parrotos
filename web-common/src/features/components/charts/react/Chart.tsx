import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sanitizeFieldName } from "@rilldata/web-common/components/vega/util";
import { useRillTheme } from "@rilldata/web-common/components/vega/react/useRillTheme";
import {
  resolveSignalField,
  resolveSignalIntervalField,
  resolveSignalTimeField,
} from "@rilldata/web-common/components/vega/vega-signals";
import type { SignalListeners, View, VisualizationSpec } from "svelte-vega";
import type { Readable } from "svelte/store";
import type { ExpressionFunction } from "@rilldata/web-common/components/vega/types";
import type { CanvasChartSpec } from "@rilldata/web-common/features/canvas/components/charts";
import {
  createMeasureValueFormatter,
  humanizeDataType,
} from "@rilldata/web-common/lib/number-formatting/format-measure-value";
import { FormatPreset } from "@rilldata/web-common/lib/number-formatting/humanizer-types";
import type { TimeRange } from "@rilldata/web-common/lib/time/types";
import type { MetricsViewSpecMeasure } from "@rilldata/web-common/runtime-client";
import type { RuntimeClient } from "@rilldata/web-common/runtime-client/v2";
import { getChroma } from "@rilldata/web-common/features/themes/theme-utils";
import { discoverTemporalBrushSignal } from "../brush-builder";
import { clearExternalBrush, setExternalBrush } from "../highlight-controller";
import type { ChartDataResult, ChartType } from "../types";
import { generateSpec, getColorMappingForChart } from "../util";
import RillChart from "./RillChart";
import { useReadable } from "./useReadable";

export interface ChartProps {
  /** Runtime client forwarded to RillChart (Svelte context is unavailable in React). */
  runtimeClient: RuntimeClient;
  chartType: ChartType;
  chartSpec: CanvasChartSpec;
  chartData: Readable<ChartDataResult>;
  measures: MetricsViewSpecMeasure[];
  themeMode?: "light" | "dark";
  /**
   * Full theme object with all CSS variables (primary, secondary, background, etc.).
   * If provided, the chart uses these directly; otherwise it falls back to defaults.
   */
  theme?: Record<string, string>;
  isCanvas: boolean;
  temporalField?: string;
  onBrushEnd?: ((interval: TimeRange) => void) | undefined;
  onBrushClear?: (() => void) | undefined;
  onHover?:
    | ((dimension: string | null | undefined, time: Date | undefined) => void)
    | undefined;
  externalBrushStartMs?: number | undefined;
  externalBrushEndMs?: number | undefined;
  /** Receives the live vega View, mirroring `bind:view`. */
  onView?: (view: View | undefined) => void;
}

function buildHoverListeners(
  onHover:
    | ((dimension: string | null | undefined, time: Date | undefined) => void)
    | undefined,
  temporalField?: string,
): SignalListeners {
  const listeners: SignalListeners = {};
  if (onHover) {
    listeners.hover = (_name: string, value: unknown) => {
      const dimension = resolveSignalField(value, "dimension");
      const ts = resolveSignalTimeField(value, temporalField);
      onHover(dimension, ts);
    };
  }
  return listeners;
}

/**
 * React translation of `Chart.svelte`. Renders the RillChart renderer and owns the
 * brush/hover wiring that manipulates the live vega View.
 */
export default function Chart(props: ChartProps) {
  const {
    runtimeClient,
    chartType,
    chartSpec,
    chartData,
    measures,
    themeMode = "light",
    theme,
    isCanvas,
    temporalField,
    onBrushEnd,
    onBrushClear,
    onHover,
    externalBrushStartMs,
    externalBrushEndMs,
    onView,
  } = props;

  const chartDataValue = useReadable(chartData);
  const [view, setView] = useState<View | undefined>(undefined);

  const { data, domainValues, hasComparison, isFetching, error } =
    chartDataValue ?? {};
  const hasNoData = !isFetching && (data?.length ?? 0) === 0;

  // Override chartData theme with mode-aware colors if the theme prop is provided.
  const chartDataWithTheme: ChartDataResult | undefined = useMemo(() => {
    if (!chartDataValue) return undefined;
    if (!theme) return chartDataValue;
    return {
      ...chartDataValue,
      theme: {
        primary: theme.primary
          ? getChroma(theme.primary)
          : chartDataValue.theme.primary,
        secondary: theme.secondary
          ? getChroma(theme.secondary)
          : chartDataValue.theme.secondary,
      },
    };
  }, [chartDataValue, theme]);

  const rawSpec = useMemo(() => {
    if (!chartDataWithTheme) return {};
    return generateSpec(chartType, chartSpec, chartDataWithTheme);
  }, [chartType, chartSpec, chartDataWithTheme]);

  // Memoize the spec with deep equality so RillChart does not recreate the view (and
  // kill brush state) on store re-emissions that produce the same spec.
  const [spec, setSpec] = useState<ReturnType<typeof generateSpec>>({});
  useEffect(() => {
    const next = rawSpec ?? {};
    setSpec((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    );
  }, [rawSpec]);

  const useBrush = "isInteractive" in chartSpec && !!chartSpec.isInteractive;

  const brushTemporalField =
    spec && typeof spec === "object" && "usermeta" in spec
      ? ((spec as { usermeta?: { brushTemporalField?: string } }).usermeta
          ?.brushTemporalField as string | undefined)
      : undefined;

  const measureFormatters = useMemo(
    () =>
      measures.reduce(
        (acc, measure) => ({
          ...acc,
          [sanitizeFieldName(measure.name || "measure")]:
            createMeasureValueFormatter<null | undefined>(measure),
        }),
        {} as Record<string, (value: number | null | undefined) => string>,
      ),
    [measures],
  );

  const expressionFunctions = useMemo<ExpressionFunction>(() => {
    const functions: ExpressionFunction = {
      humanize: {
        fn: (val: number) =>
          humanizeDataType(val, FormatPreset.HUMANIZE, "table"),
      },
    };
    for (const measure of measures) {
      const fieldName = sanitizeFieldName(measure.name || "measure");
      const formatter = measureFormatters[fieldName];
      functions[fieldName] = {
        fn: (val: number) => (formatter ? formatter(val) : String(val)),
      };
    }
    return functions;
  }, [measures, measureFormatters]);

  const isThemeModeDark = themeMode === "dark";
  const colorMapping = useMemo(
    () => getColorMappingForChart(chartSpec, domainValues, isThemeModeDark),
    [chartSpec, domainValues, isThemeModeDark],
  );

  const signalListeners = useMemo(
    () => buildHoverListeners(onHover, temporalField),
    [onHover, temporalField],
  );

  // ── Brush wiring ──────────────────────────────────────────────────────────────
  const isLocalPointerDownRef = useRef(false);
  const isApplyingExternalBrushRef = useRef(false);
  const pointerUpHandlerRef = useRef<(() => void) | undefined>(undefined);
  const clearHandlerRef = useRef<((name: string, value: unknown) => void) | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!useBrush || !view) return;
    const signalName = discoverTemporalBrushSignal(view, brushTemporalField);
    if (!signalName) return;

    // Detect brush-end via DOM pointerup
    const pointerUpHandler = () => {
      if (!isLocalPointerDownRef.current) return;
      isLocalPointerDownRef.current = false;
      try {
        const value = view.signal(signalName);
        const interval = resolveSignalIntervalField(value);
        if (interval) {
          onBrushEnd?.(interval);
        }
      } catch {
        // view may have been finalized
      }
    };
    window.addEventListener("pointerup", pointerUpHandler);
    pointerUpHandlerRef.current = pointerUpHandler;

    // Detect brush-clear (user clicks outside brush or double-clicks)
    const clearHandler = (_name: string, value: unknown) => {
      if (isApplyingExternalBrushRef.current) return;
      if (value === null || value === undefined) {
        onBrushClear?.();
      }
    };
    view.addSignalListener(signalName, clearHandler);
    clearHandlerRef.current = clearHandler;

    return () => {
      if (pointerUpHandlerRef.current) {
        window.removeEventListener("pointerup", pointerUpHandlerRef.current);
        pointerUpHandlerRef.current = undefined;
      }
      try {
        if (clearHandlerRef.current) {
          view.removeSignalListener(signalName, clearHandlerRef.current);
        }
      } catch {
        // view may have been finalized
      }
      clearHandlerRef.current = undefined;
    };
  }, [useBrush, view, brushTemporalField, onBrushEnd, onBrushClear]);

  // Apply external brush state from sibling charts.
  useEffect(() => {
    if (!useBrush || !view) return;
    isApplyingExternalBrushRef.current = true;
    try {
      if (
        externalBrushStartMs !== undefined &&
        externalBrushEndMs !== undefined
      ) {
        setExternalBrush(
          view,
          externalBrushStartMs,
          externalBrushEndMs,
          brushTemporalField,
        );
      } else if (
        externalBrushStartMs === undefined &&
        externalBrushEndMs === undefined
      ) {
        clearExternalBrush(view, brushTemporalField);
      }
    } finally {
      isApplyingExternalBrushRef.current = false;
    }
  }, [useBrush, view, externalBrushStartMs, externalBrushEndMs, brushTemporalField]);

  const handleLocalPointerDown = () => {
    isLocalPointerDownRef.current = true;
  };

  // Always keep the internal view state in sync (brush logic depends on it) while
  // also forwarding the view up to the parent when requested.
  const handleRillView = useCallback(
    (v: View | undefined) => {
      setView(v);
      onView?.(v);
    },
    [onView],
  );

  const chartDataProp = useMemo(() => ({ "metrics-view": data }), [data]);
  const config = useRillTheme(isThemeModeDark, theme);

  if (!chartDataValue) {
    return <SpinnerPlaceholder />;
  }
  if (isFetching || measures.length === 0) {
    return <SpinnerPlaceholder />;
  }
  if (error) {
    return <ComponentErrorPlaceholder message={error?.message} />;
  }
  if (hasNoData) {
    return (
      <div className="flex w-full h-full p-2 text-xl text-fg-disabled items-center justify-center">
        No Data to Display
      </div>
    );
  }

  return (
    <div className="size-full" onPointerDown={handleLocalPointerDown}>
      <RillChart
        runtimeClient={runtimeClient}
        onView={handleRillView}
        canvasDashboard={isCanvas}
        data={chartDataProp}
        themeMode={themeMode}
        spec={spec as VisualizationSpec}
        colorMapping={colorMapping}
        signalListeners={signalListeners}
        renderer="canvas"
        expressionFunctions={expressionFunctions}
        hasComparison={hasComparison}
        config={config}
      />
    </div>
  );
}

/** Minimal React stand-in for the Svelte `Spinner` component. */
function SpinnerPlaceholder() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div
        className="h-5 w-5 animate-spin rounded-full border-2 border-fg-secondary border-t-transparent"
        role="status"
      />
    </div>
  );
}

/** Minimal React stand-in for the Svelte `ComponentError` component. */
function ComponentErrorPlaceholder({ message }: { message: string | undefined }) {
  return (
    <div className="flex items-center justify-center h-full w-full text-fg-secondary">
      {message}
    </div>
  );
}
