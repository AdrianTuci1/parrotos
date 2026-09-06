import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { createStateManagers } from "../state-managers";
import type { StateManagers } from "../state-managers";
import { queryClient } from "@rilldata/web-common/lib/svelte-query/globalQueryClient";
import { useRuntimeClient } from "@rilldata/web-common/runtime-client/react";

const StateManagersContext = createContext<StateManagers | undefined>(
  undefined,
);

export interface StateManagersProviderProps {
  /** The metrics view (explore) resource name. When undefined the provider is inert. */
  metricsViewName?: string;
  /** The explore resource name used as the store entity key. */
  exploreName: string;
  /** Re-sync `metricsViewName` on change (Rill uses this for visual editing). */
  visualEditing?: boolean;
  children: ReactNode;
}

/**
 * React translation of `StateManagersProvider.svelte`.
 *
 * Rill's explore state-management lives in Svelte context (`getStateManagers()`).
 * Svelte context is unavailable in a React host, so this provider builds the same
 * `StateManagers` object via the framework-agnostic `createStateManagers()` factory
 * and exposes it through React context. The selectors/actions/stores it returns are
 * reused verbatim; only the context wire-up differs.
 */
export function StateManagersProvider({
  metricsViewName,
  exploreName,
  visualEditing = false,
  children,
}: StateManagersProviderProps) {
  const runtimeClient = useRuntimeClient();

  const stateManagers = useMemo(() => {
    if (!metricsViewName) return undefined;
    return createStateManagers({
      queryClient,
      metricsViewName,
      exploreName,
      runtimeClient,
    });
  }, [metricsViewName, exploreName, runtimeClient]);

  // Rill re-syncs the metrics view name when entering visual editing.
  useEffect(() => {
    if (visualEditing && stateManagers && metricsViewName) {
      stateManagers.metricsViewName.set(metricsViewName);
    }
  }, [visualEditing, stateManagers, metricsViewName]);

  return (
    <StateManagersContext.Provider value={stateManagers}>
      {children}
    </StateManagersContext.Provider>
  );
}

export function useStateManagers(): StateManagers {
  const ctx = useContext(StateManagersContext);
  if (!ctx) {
    throw new Error(
      "useStateManagers() must be used within a <StateManagersProvider> with a metricsViewName.",
    );
  }
  return ctx;
}
