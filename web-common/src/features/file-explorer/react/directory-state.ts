// React-port of `features/file-explorer/directory-store.ts`. The original imports
// `$app/environment` (SvelteKit-only), so this copy computes the browser flag from
// `typeof window` instead. The API surface (expand/collapse/toggle/expandAll/
// collapseAll/setProjectScope/reset) is preserved so React components can bridge
// it with `useReadable()` and the frontend build resolves it without SvelteKit.
import { debounce } from "@rilldata/web-common/lib/create-debouncer";
import { type Writable, writable } from "svelte/store";

interface DirectoryState {
  [directoryPath: string]: boolean;
}

interface CustomWritable<T> extends Writable<T> {
  setProjectScope: (scopeId: string) => void;
  expand: (directoryPath: string) => void;
  collapse: (directoryPath: string) => void;
  expandAll: (directoryPaths: string[]) => void;
  collapseAll: (directoryPaths: string[]) => void;
  toggle: (directoryPath: string) => void;
  reset: () => void;
}

const DEFAULT_STATE: DirectoryState = { "/": true };
const STORAGE_PREFIX = "file-explorer-directory-state";

const isExpanded = (state: DirectoryState, path: string) => state[path] ?? true;

const isBrowser = () => typeof window !== "undefined";

const createDirectoryStore = (): CustomWritable<DirectoryState> => {
  const { subscribe, set, update } = writable<DirectoryState>({
    ...DEFAULT_STATE,
  });

  let storageKey: string | null = null;
  const persist = debounce((state: DirectoryState) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore: localStorage unavailable or over quota (e.g. embed iframe)
    }
  }, 300);
  subscribe((state) => persist(state));

  return {
    subscribe,
    set,
    update,
    setProjectScope: (scopeId: string) => {
      const key = `${STORAGE_PREFIX}::${scopeId}`;
      if (key === storageKey) return;
      storageKey = key;
      if (!isBrowser()) return;
      try {
        const stored = localStorage.getItem(key);
        set(stored ? JSON.parse(stored) : { ...DEFAULT_STATE });
      } catch {
        set({ ...DEFAULT_STATE });
      }
    },
    expand: (directoryPath: string) => {
      update((state) => {
        const newState = { ...state };

        const paths = directoryPath.split("/");
        let currentPath = "";

        for (const segment of paths) {
          if (segment === "") continue;
          currentPath = currentPath + "/" + segment;
          newState[currentPath] = true;
        }

        return newState;
      });
    },
    collapse: (directoryPath: string) => {
      update((state) => ({ ...state, [directoryPath]: false }));
    },
    expandAll: (directoryPaths: string[]) => {
      update((state) => {
        const newState = { ...state };
        for (const path of directoryPaths) {
          newState[path] = true;
        }
        return newState;
      });
    },
    collapseAll: (directoryPaths: string[]) => {
      update((state) => {
        const newState = { ...state };
        for (const path of directoryPaths) {
          if (path === "/") continue;
          newState[path] = false;
        }
        return newState;
      });
    },
    toggle: (directoryPath: string) => {
      update((state) => ({
        ...state,
        [directoryPath]: !isExpanded(state, directoryPath),
      }));
    },
    reset: () => {
      set({ ...DEFAULT_STATE });
    },
  };
};

export const directoryState = createDirectoryStore();
