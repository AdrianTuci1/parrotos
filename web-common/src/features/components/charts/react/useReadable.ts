import { useEffect, useState } from "react";
import type { Readable } from "svelte/store";

/**
 * Subscribes a React component to a Svelte `Readable` store and returns its current
 * value. Bridges the coexist phase where chart data flow is still produced by
 * framework-agnostic logic that returns Svelte stores (e.g. `getChartData`).
 *
 * Because a Svelte store calls the subscriber synchronously with its current value on
 * subscribe, the returned value is populated on the first effect run after mount.
 */
export function useReadable<T>(store: Readable<T> | undefined): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!store) return;
    let active = true;
    const unsubscribe = store.subscribe((next) => {
      // Wrap in a thunk so React stores `next` as-is. Svelte stores can hold
      // function values (dimension-filter selectors emit the selector function),
      // and React's `setState` would otherwise interpret a function as a state
      // updater and invoke it with the previous state, corrupting the value.
      if (active) setValue(() => next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [store]);

  return value;
}
