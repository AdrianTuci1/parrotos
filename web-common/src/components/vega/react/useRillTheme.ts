import { useMemo } from "react";
import type { Config } from "vega-lite";
import { getRillTheme } from "../vega-config";

/**
 * React-friendly wrapper around `getRillTheme`.
 *
 * Memoizes the returned vega-lite `Config` so its identity is stable across renders
 * while `isDarkMode`/`theme` are unchanged. RillChart feeds this value into the
 * identity-stable embed options, so an unchanged theme does not force vega-embed to
 * tear down and re-embed the view (which would lose brush state).
 *
 * Callers should pass a stable / memoized `theme` object (e.g. the resolved theme
 * boundary vars) to avoid recomputing on unrelated re-renders.
 */
export function useRillTheme(
  isDarkMode: boolean,
  theme?: Record<string, string>,
): Config {
  return useMemo(() => getRillTheme(isDarkMode, theme), [isDarkMode, theme]);
}
