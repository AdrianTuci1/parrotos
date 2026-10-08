import { useMemo } from "react";
import type { Config } from "vega-lite";
import { getParrotTheme } from "../vega-config";

/**
 * React-friendly wrapper around `getParrotTheme`.
 *
 * Memoizes the returned vega-lite `Config` so its identity is stable across renders
 * while `isDarkMode`/`theme` are unchanged. ParrotChart feeds this value into the
 * identity-stable embed options, so an unchanged theme does not force vega-embed to
 * tear down and re-embed the view (which would lose brush state).
 *
 * Callers should pass a stable / memoized `theme` object (e.g. the resolved theme
 * boundary vars) to avoid recomputing on unrelated re-renders.
 */
export function useParrotTheme(
  isDarkMode: boolean,
  theme?: Record<string, string>,
): Config {
  return useMemo(() => getParrotTheme(isDarkMode, theme), [isDarkMode, theme]);
}
