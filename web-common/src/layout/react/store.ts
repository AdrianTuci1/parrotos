// React-port companion to the module-context store declared in
// `layout/navigation/Navigation.svelte`. Kept as a Svelte `writable` so React
// consumers bridge it with `useReadable()` (the coexist-state convention used
// across the port); `toggle`/`set`/`subscribe` mirror the Svelte original.
import { writable } from "svelte/store";

export const navigationOpen = (() => {
  const { subscribe, update, set } = writable<boolean | null>(true);
  return {
    toggle: () => update((open) => !open),
    set,
    subscribe,
  };
})();
