// Framework-agnostic copy of the ResourceKind→workspace mapping from
// `features/workspaces/WorkspaceDispatcher.svelte`. Source & Model share the
// ModelWorkspace; MetricsView, Explore and Canvas map to their own workspaces; a
// null/undefined kind falls through to the code-editor branch.
import { ResourceKind } from "@rilldata/web-common/features/entity-management/resource-selectors";

export type WorkspaceKey = "model" | "metrics" | "explore" | "canvas" | null;

export const WorkspaceByKind: Record<string, WorkspaceKey> = {
  [ResourceKind.Source]: "model",
  [ResourceKind.Model]: "model",
  [ResourceKind.MetricsView]: "metrics",
  [ResourceKind.Explore]: "explore",
  [ResourceKind.Canvas]: "canvas",
};

export function workspaceForKind(kind: ResourceKind | undefined): WorkspaceKey {
  return WorkspaceByKind[kind as string] ?? null;
}
