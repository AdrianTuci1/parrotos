// React translation of `features/workspaces/WorkspaceDispatcher.svelte`. Routes a
// file artifact to the workspace matched by its resource kind (Source/Model → model,
// MetricsView → metrics, Explore → explore, Canvas → canvas), to the Parquet
// preview for data files, to a generating placeholder while a canvas is being
// generated, and to the code editor branch otherwise. The workspace bodies and the
// editor are pluggable so the mapping is renderable/testable without the runtime.
import type { ComponentType, ReactNode } from "react";
import { WorkspaceContainer } from "@rilldata/web-common/layout/react";
import { workspaceForKind, type WorkspaceKey } from "./workspace-kind";
import {
  ModelWorkspace,
  MetricsWorkspace,
  ExploreWorkspace,
  CanvasWorkspace,
  ParquetWorkspace,
  type FileArtifactLike,
} from "./workspace-shells";
import WorkspaceEditorContainer from "./WorkspaceEditorContainer";

export interface FileArtifactDescriptor extends FileArtifactLike {
  inferredResourceKind?: string | undefined;
  managed?: boolean;
  isPreviewableDataFile?: boolean;
  isGenerating?: boolean;
  parseError?: string | undefined;
  remoteContent?: string | null | undefined;
}

export interface WorkspaceDispatcherProps {
  fileArtifact: FileArtifactDescriptor;
  components?: Partial<Record<WorkspaceKey, ComponentType<{ fileArtifact: FileArtifactLike }>>>;
  editor?: ReactNode;
  editorHeader?: ReactNode;
  generatingContent?: ReactNode;
}

const DEFAULT_COMPONENTS: Record<
  WorkspaceKey,
  ComponentType<{ fileArtifact: FileArtifactLike }>
> = {
  model: ModelWorkspace,
  metrics: MetricsWorkspace,
  explore: ExploreWorkspace,
  canvas: CanvasWorkspace,
  null: () => null,
};

export default function WorkspaceDispatcher({
  fileArtifact,
  components,
  editor,
  editorHeader,
  generatingContent,
}: WorkspaceDispatcherProps) {
  const resolvedKind = fileArtifact.resourceKind ?? fileArtifact.inferredResourceKind;
  const key = workspaceForKind(resolvedKind as never);

  if (fileArtifact.isGenerating) {
    return (
      <>{generatingContent ?? <div className="p-4 text-sm">Generating your Canvas dashboard...</div>}</>
    );
  }

  if (fileArtifact.isPreviewableDataFile) {
    return <ParquetWorkspace fileArtifact={fileArtifact} />;
  }

  const merged = { ...DEFAULT_COMPONENTS, ...components };
  const Workspace = key ? merged[key] : null;
  if (Workspace) {
    return <Workspace fileArtifact={fileArtifact} />;
  }

  return (
    <WorkspaceContainer inspector={false} header={editorHeader}>
      <WorkspaceEditorContainer
        error={fileArtifact.parseError}
        remoteContent={fileArtifact.remoteContent}
        filePath={fileArtifact.path}
      >
        {editor}
      </WorkspaceEditorContainer>
    </WorkspaceContainer>
  );
}
