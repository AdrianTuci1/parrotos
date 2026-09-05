// React-port of the Rill layout shell. Framework-agnostic `.ts` utilities
// (`config.ts`, `layout-settings.ts`, `workspace/workspace-stores.ts`) are reused
// verbatim from `@rilldata/web-common/layout/*`; this package only re-exports the
// constants and the Svelte view components translated to React.
export { default as Header } from "./Header";
export { default as HeaderLogo } from "./HeaderLogo";
export { Resizer } from "./Resizer";
export { default as SurfaceControlButton } from "./SurfaceControlButton";
export { default as Footer } from "./Footer";
export { default as WorkspaceContainer } from "./WorkspaceContainer";
export { default as Navigation } from "./Navigation";
export { default as ApplicationHeader } from "./ApplicationHeader";
export { navigationOpen } from "./store";
export {
  RillLogoIcon,
  HideSidebarIcon,
  SurfaceViewIcon,
  GithubIcon,
  InfoCircleIcon,
  CaretDownIcon,
} from "./icons";

export {
  DEFAULT_INSPECTOR_WIDTH,
  DEFAULT_NAV_WIDTH,
  MIN_NAV_WIDTH,
  MAX_NAV_WIDTH,
  DEFAULT_PREVIEW_TABLE_HEIGHT,
  SURFACE_SLIDE_DURATION,
  LIST_SLIDE_DURATION,
  SURFACE_SLIDE_EASING,
} from "@rilldata/web-common/layout/config";

export { workspaces } from "@rilldata/web-common/layout/workspace/workspace-stores";
export type { WorkspaceView } from "@rilldata/web-common/layout/workspace/workspace-stores";
export { dynamicHeight } from "@rilldata/web-common/layout/layout-settings";
