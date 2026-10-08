// React-port of the workspace feature. The framework-agnostic ResourceKind→
// workspace mapping is copied (`workspace-kind.ts`); the view components are
// translated. Workspace bodies (Model/Metrics/Explore/Canvas/Parquet) are
// stand-ins here — their runtime-bound content is ported in a later phase.
export { default as WorkspaceDispatcher } from "./WorkspaceDispatcher";
export type {
  WorkspaceDispatcherProps,
  FileArtifactDescriptor,
} from "./WorkspaceDispatcher";
export { default as WorkspaceEditorContainer } from "./WorkspaceEditorContainer";
export { default as WorkspaceHeader } from "./WorkspaceHeader";
export {
  workspaceForKind,
  WorkspaceByKind,
  type WorkspaceKey,
} from "./workspace-kind";
export {
  ModelWorkspace,
  MetricsWorkspace,
  ExploreWorkspace,
  CanvasWorkspace,
  ParquetWorkspace,
  type FileArtifactLike,
} from "./workspace-shells";
