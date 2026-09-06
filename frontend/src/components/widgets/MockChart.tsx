import { useEffect, useRef } from "react";
import embed from "vega-embed";

export interface MockChartProps {
  /** Inline rows to render (mock aggregation data). */
  values: Record<string, unknown>[];
  /** X (dimension / time) field. */
  xField: string;
  /** Y (measure) field. */
  yField: string;
  /** Vega-Lite mark type. */
  mark?: "bar" | "area" | "line";
  /** Optional field to color the marks by (e.g. channel). */
  colorField?: string;
  /** Vega-Lite x type (nominal for a dimension, temporal for time). */
  xType?: "nominal" | "temporal" | "ordinal";
  /** Vega color scheme for `colorField`. */
  colorScheme?: string;
  /** Height in px; defaults to 220. */
  height?: number;
  /** When true, aggregate `yField` summed over `xField` (used for the time series). */
  aggregate?: boolean;
}

const ACCENT = "#4f8cff";

/**
 * Lightweight Vega-Lite chart fed with inline mock data. Used by the mock explorer
 * so the dashboard stays visually rich without a live Rill runtime; when a runtime
 * is reachable the real `ChartContainer` (which queries the metrics view over the
 * Go Connect transport) takes over via `RuntimeMetricsExplorer`.
 */
export default function MockChart({
  values,
  xField,
  yField,
  mark = "bar",
  colorField,
  xType = "nominal",
  colorScheme = "category10",
  height = 220,
  aggregate = false,
}: MockChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current || values.length === 0) return;
    let cleanup: (() => void) | undefined;

    // Line/area charts hug their data so the plot fills the card instead of leaving
    // a tall empty band when the y-domain starts at zero.
    const yScale =
      mark === "area" || mark === "line"
        ? { zero: false }
        : undefined;

    const encoding: Record<string, unknown> = {
      x: { field: xField, type: xType, axis: { labelColor: "#9aa4b2", labelAngle: 0, title: null } },
      y: { field: yField, type: "quantitative", axis: { labelColor: "#9aa4b2" }, ...(yScale ? { scale: yScale } : {}) },
      tooltip: [
        { field: xField, type: xType },
        { field: yField, type: "quantitative" },
      ],
    };
    if (colorField) {
      encoding.color = {
        field: colorField,
        type: "nominal",
        legend: { orient: "bottom", title: null },
        scale: { scheme: colorScheme },
      };
    }

    const spec: Record<string, unknown> = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      height,
      padding: 8,
      data: { values },
      encoding,
      config: { background: "transparent", view: { stroke: null } },
    };

    if (mark === "area" || mark === "line") {
      spec.mark = {
        type: mark,
        interpolate: "monotone",
        ...(mark === "area"
          ? {
              color: "rgba(79,140,255,0.16)",
              line: { color: ACCENT, strokeWidth: 2 },
            }
          : { color: ACCENT, strokeWidth: 2 }),
      };
    } else {
      spec.mark = { type: "bar", cornerRadius: 3 };
      // Stack nothing; colorField already provides the group-by.
      if (values.length > 1 && !colorField) {
        // Single series: keep bars uniform.
        encoding.color = { value: ACCENT };
      }
    }

    if (aggregate && mark !== "bar") {
      spec.transform = [
        { aggregate: [{ op: "sum", field: yField }], groupby: [xField] },
      ];
    }

    embed(ref.current, spec as never, { actions: false }).then((res) => {
      cleanup = () => res.view.finalize();
    });
    return () => {
      cleanup?.();
    };
  }, [values, xField, yField, mark, colorField, xType, colorScheme, height, aggregate]);

  return <div ref={ref} className="w-full" />;
}
