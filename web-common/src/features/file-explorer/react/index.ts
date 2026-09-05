// React-port of the file-explorer feature. Framework-agnostic `.ts` utilities in
// the Svelte package (`nav-tree-spacing.ts`'s `getPaddingFromPath`) are reused
// verbatim; the `$app`-bound pieces are re-implemented here (`directory-state`,
// `editor-routing`, `transform-file-list` pure subset) so the React graph stays
// free of SvelteKit imports.
export { default as FileExplorer } from "./FileExplorer";
export type { FileExplorerProps } from "./FileExplorer";
export { default as NavDirectory } from "./NavDirectory";
export type { TreeHandlers } from "./NavDirectory";
export { default as NavDirectoryEntry } from "./NavDirectoryEntry";
export { default as NavFile } from "./NavFile";
export { default as NavEntryPortal } from "./NavEntryPortal";
export { default as ForceDeleteConfirmationDialog } from "./ForceDeleteConfirmationDialog";
export { directoryState } from "./directory-state";
export type { NavDragData } from "./types";
export {
  transformFileList,
  collectDirectoryPaths,
  findDirectory,
  type Directory,
} from "./transform-file-list";
export {
  getFileHref,
  getHomeHref,
  withEditorPrefix,
  navigateToFileHref,
} from "./editor-routing";
export { getPaddingFromPath } from "@rilldata/web-common/features/file-explorer/nav-tree-spacing";
