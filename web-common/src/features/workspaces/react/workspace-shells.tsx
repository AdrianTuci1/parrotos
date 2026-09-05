// Stand-in React bodies for the per-kind workspaces used by WorkspaceDispatcher.
// The real workspace content (Model editor + preview, MetricsView dashboard +
// explore, Canvas, Parquet preview) is runtime-bound and ported in a later phase;
// these shells let the dispatcher mapping be rendered and unit-tested. Each
// accepts the `fileArtifact` descriptor the Svelte workspace takes.

export interface FileArtifactLike {
  path?: string;
  fileName?: string;
  resourceKind?: string | undefined;
  hasUnsavedChanges?: boolean;
}

function Shell({
  label,
  fileArtifact,
}: {
  label: string;
  fileArtifact: FileArtifactLike;
}) {
  return (
    <div className="flex flex-col size-full items-center justify-center gap-y-1 p-4">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-fg-muted">{fileArtifact.path}</span>
    </div>
  );
}

export function ModelWorkspace({
  fileArtifact,
}: {
  fileArtifact: FileArtifactLike;
}) {
  return <Shell label="Model workspace" fileArtifact={fileArtifact} />;
}

export function MetricsWorkspace({
  fileArtifact,
}: {
  fileArtifact: FileArtifactLike;
}) {
  return <Shell label="Metrics view workspace" fileArtifact={fileArtifact} />;
}

export function ExploreWorkspace({
  fileArtifact,
}: {
  fileArtifact: FileArtifactLike;
}) {
  return <Shell label="Explore workspace" fileArtifact={fileArtifact} />;
}

export function CanvasWorkspace({
  fileArtifact,
}: {
  fileArtifact: FileArtifactLike;
}) {
  return <Shell label="Canvas workspace" fileArtifact={fileArtifact} />;
}

export function ParquetWorkspace({
  fileArtifact,
}: {
  fileArtifact: FileArtifactLike;
}) {
  return <Shell label="Parquet preview" fileArtifact={fileArtifact} />;
}
