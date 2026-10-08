import { createContext, useContext } from "react";
import type { DimensionTableConfig } from "../DimensionTableConfig";

/**
 * React translation of the Svelte `setContext("config", config)` /
 * `getContext("config")` handshake used across the virtualized-table views.
 *
 * Because React cannot read Svelte context, the `config` object
 * (`DIMENSION_TABLE_CONFIG`, possibly widened into an effective height when the
 * longest column label requires wrapping) is provided through React context.
 */
export const DimensionTableContext = createContext<DimensionTableConfig | null>(
  null,
);

export function useDimensionTableConfig(): DimensionTableConfig {
  const config = useContext(DimensionTableContext);
  if (!config) {
    throw new Error(
      "useDimensionTableConfig must be used within a DimensionTableContext provider",
    );
  }
  return config;
}
