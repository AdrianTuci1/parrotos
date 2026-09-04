import { useMemo } from "react";
import type { ColorMapping } from "@rilldata/web-common/features/components/charts/types";
import type { RuntimeClient } from "@rilldata/web-common/runtime-client/v2";
import type { EmbedOptions } from "vega-embed";
import type { Config } from "vega-lite";
import type { ExpressionFunction } from "../types";
import { createBaseEmbedOptions } from "../vega-embed-options";

export interface UseEmbedOptionsParams {
  client: RuntimeClient;
  config?: Config;
  renderer?: "canvas" | "svg";
  themeMode?: "light" | "dark";
  expressionFunctions?: ExpressionFunction;
  useExpressionInterpreter?: boolean;
  colorMapping: ColorMapping;
  hasComparison?: boolean;
}

/**
 * React-friendly wrapper around `createBaseEmbedOptions`.
 *
 * Returns the size-independent half of the vega-embed options. The object's identity
 * is kept stable (via useMemo on its inputs) while only `width`/`height` change:
 * vega-embed compares options key-by-key with `===`, and a fresh nested object forces
 * it to tear down and re-embed the whole view instead of resizing the existing one,
 * which would lose brush state and re-embed on every resize frame.
 *
 * Callers must spread `width` and `height` on top of the result when embedding and
 * resize the live `vega.View` when only those dimensions change.
 */
export function useEmbedOptions({
  client,
  config,
  renderer = "canvas",
  themeMode = "light",
  expressionFunctions = {},
  useExpressionInterpreter = true,
  colorMapping,
  hasComparison,
}: UseEmbedOptionsParams): EmbedOptions {
  // Stabilize colorMapping/hasComparison identity so unrelated re-renders that emit
  // structurally-equal values do not change the embed options (matching the Svelte
  // VegaLiteRenderer's stableColorMapping/stableHasComparison guards).
  const stableColorMapping = useMemo(
    () => colorMapping,
    [JSON.stringify(colorMapping)],
  );
  const stableHasComparison = useMemo(
    () => hasComparison,
    [hasComparison],
  );

  return useMemo(
    () =>
      createBaseEmbedOptions({
        client,
        config,
        renderer,
        themeMode,
        expressionFunctions,
        useExpressionInterpreter,
        colorMapping: stableColorMapping,
        hasComparison: stableHasComparison,
      }) as EmbedOptions,
    [
      client,
      config,
      renderer,
      themeMode,
      expressionFunctions,
      useExpressionInterpreter,
      stableColorMapping,
      stableHasComparison,
    ],
  );
}
