import { useEffect, useRef, useState } from "react";
import embed from "vega-embed";
import type { SignalListeners, View, VisualizationSpec } from "svelte-vega";
import type { RuntimeClient } from "@rilldata/web-common/runtime-client/v2";
import type { ColorMapping } from "../types";
import type { Config } from "vega-lite";
import type { ExpressionFunction, VLTooltipFormatter } from "@rilldata/web-common/components/vega/types";
import { useEmbedOptions } from "@rilldata/web-common/components/vega/react/useEmbedOptions";
import { VegaLiteTooltipHandler } from "@rilldata/web-common/components/vega/vega-tooltip";

export interface RillChartProps {
  /** Runtime client used to build the vega-embed loader (asset baseURL + JWT). */
  runtimeClient: RuntimeClient;
  data: Record<string, unknown>;
  spec: VisualizationSpec;
  signalListeners?: SignalListeners;
  expressionFunctions?: ExpressionFunction;
  error?: string | null;
  canvasDashboard?: boolean;
  renderer?: "canvas" | "svg";
  themeMode?: "light" | "dark";
  config?: Config;
  hasComparison?: boolean;
  tooltipFormatter?: VLTooltipFormatter;
  colorMapping?: ColorMapping;
  /** Callback that receives the live vega View after each embed, mirroring bind:view. */
  onView?: (view: View | undefined) => void;
}

/**
 * React translation of `VegaLiteRenderer.svelte`.
 *
 * Drives vega/vega-lite/vega-embed directly instead of `svelte-vega`. It keeps the
 * embed options identity-stable via `useEmbedOptions` so brush state is preserved
 * when only the container size changes (the view is resized, not re-embedded), and
 * keeps the dataset convention `{ "metrics-view": data }` plus the Rill theme config.
 */
export default function RillChart(props: RillChartProps) {
  const {
    runtimeClient,
    data,
    spec,
    signalListeners = {},
    expressionFunctions = {},
    error: errorProp = null,
    canvasDashboard = false,
    renderer = "canvas",
    themeMode = "light",
    config,
    hasComparison = false,
    tooltipFormatter,
    colorMapping = [],
    onView,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartHostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View | undefined>(undefined);
  const tooltipHandlerRef = useRef<VegaLiteTooltipHandler | null>(null);
  const onViewRef = useRef(onView);
  onViewRef.current = onView;
  const tooltipFormatterRef = useRef(tooltipFormatter);
  tooltipFormatterRef.current = tooltipFormatter;
  const [error, setError] = useState<string | null>(errorProp);
  const [view, setView] = useState<View | undefined>(undefined);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const baseOptions = useEmbedOptions({
    client: runtimeClient,
    config,
    renderer,
    themeMode,
    expressionFunctions,
    colorMapping,
    hasComparison,
  });

  // Observe the container and report its content size. Excludes width/height from the
  // embed effect deps so a resize resizes the live view rather than re-embedding it.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height: Math.max(0, rect.height - 10) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Resize an already-embedded view when only the size changed (preserves brush state).
  useEffect(() => {
    if (!view) return;
    if (size.width === 0 && size.height === 0) return;
    view.width(size.width).height(size.height).runAsync();
  }, [size, view]);

  // Embed (or re-embed) the vega-lite spec. Runs only when the spec/data/options
  // identity changes; size changes are handled by the resize effect above.
  useEffect(() => {
    const host = chartHostRef.current;
    if (!host || !spec || Object.keys(spec).length === 0) return;

    let disposed = false;
    setError(null);

    embed(host, spec, { ...baseOptions, width: size.width, height: size.height })
      .then((result) => {
        if (disposed) {
          result.view.finalize();
          return;
        }
        viewRef.current = result.view;
        setView(result.view);
        onViewRef.current?.(result.view);

        const formatter = tooltipFormatterRef.current;
        if (formatter) {
          if (tooltipHandlerRef.current) {
            tooltipHandlerRef.current.destroy();
          }
          tooltipHandlerRef.current = new VegaLiteTooltipHandler(formatter);
          result.view.tooltip(tooltipHandlerRef.current.handleTooltip);
          void result.view.runAsync();
        }
      })
      .catch((e: unknown) => {
        if (!disposed) {
          setError(e instanceof Error ? e.message : String(e));
        }
      });

    return () => {
      disposed = true;
      const currentView = viewRef.current;
      viewRef.current = undefined;
      try {
        currentView?.finalize();
      } catch {
        // view may already be finalized
      }
      setView(undefined);
      onViewRef.current?.(undefined);
    };
  }, [spec, data, baseOptions]);

  // Re-register signal listeners whenever the live view or listener set changes.
  useEffect(() => {
    if (!view) return;
    const listeners = Object.entries(signalListeners);
    for (const [name, listener] of listeners) {
      view.addSignalListener(name, listener);
    }
    return () => {
      for (const [name, listener] of listeners) {
        try {
          view.removeSignalListener(name, listener);
        } catch {
          // view may have been finalized
        }
      }
    };
  }, [view, signalListeners]);

  // Clear tooltip on mouse leave and destroy the handler on unmount.
  const handleMouseLeave = () => {
    tooltipHandlerRef.current?.removeTooltip();
  };
  useEffect(() => {
    return () => {
      if (tooltipHandlerRef.current) {
        tooltipHandlerRef.current.destroy();
        tooltipHandlerRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="presentation"
      className={`rill-vega-container overflow-y-auto overflow-x-hidden size-full flex flex-col items-center${
        canvasDashboard ? " px-2" : ""
      }`}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={chartHostRef} className="size-full" />
      {error ? (
        <div className="size-full text-[3.2em] flex flex-col items-center justify-center gap-y-2">
          {error}
        </div>
      ) : null}
    </div>
  );
}
