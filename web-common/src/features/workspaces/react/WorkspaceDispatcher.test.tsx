import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkspaceDispatcher, {
  type FileArtifactDescriptor,
} from "./WorkspaceDispatcher";
import { workspaceForKind } from "./workspace-kind";
import { ResourceKind } from "@rilldata/web-common/features/entity-management/resource-selectors";

function makeArtifact(overrides: Partial<FileArtifactDescriptor> = {}): FileArtifactDescriptor {
  return {
    path: "/models/foo.sql",
    fileName: "foo.sql",
    ...overrides,
  };
}

describe("workspace-kind mapping", () => {
  it("maps Model & Source to model, MetricsView to metrics, Explore/Canvas to their own", () => {
    expect(workspaceForKind(ResourceKind.Model)).toBe("model");
    expect(workspaceForKind(ResourceKind.Source)).toBe("model");
    expect(workspaceForKind(ResourceKind.MetricsView)).toBe("metrics");
    expect(workspaceForKind(ResourceKind.Explore)).toBe("explore");
    expect(workspaceForKind(ResourceKind.Canvas)).toBe("canvas");
    expect(workspaceForKind(undefined)).toBeNull();
  });
});

describe("WorkspaceDispatcher (React port)", () => {
  it("renders the model workspace for a Model kind", () => {
    render(
      <WorkspaceDispatcher
        fileArtifact={makeArtifact({ resourceKind: ResourceKind.Model })}
      />,
    );
    expect(screen.getByText("Model workspace")).toBeTruthy();
  });

  it("renders the metrics workspace for a MetricsView kind", () => {
    render(
      <WorkspaceDispatcher
        fileArtifact={makeArtifact({ resourceKind: ResourceKind.MetricsView })}
      />,
    );
    expect(screen.getByText("Metrics view workspace")).toBeTruthy();
  });

  it("falls through to the code editor branch when the kind is unknown", () => {
    render(
      <WorkspaceDispatcher
        fileArtifact={makeArtifact({ resourceKind: undefined })}
        editor={<div>code-editor</div>}
      />,
    );
    expect(screen.getByText("code-editor")).toBeTruthy();
  });

  it("renders the Parquet preview for a previewable data file", () => {
    render(
      <WorkspaceDispatcher
        fileArtifact={makeArtifact({ isPreviewableDataFile: true })}
      />,
    );
    expect(screen.getByText("Parquet preview")).toBeTruthy();
  });

  it("renders the generating placeholder while a canvas is generated", () => {
    render(
      <WorkspaceDispatcher
        fileArtifact={makeArtifact({ isGenerating: true })}
      />,
    );
    expect(screen.getByText(/Generating your Canvas/)).toBeTruthy();
  });
});
