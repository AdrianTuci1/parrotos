import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileExplorer, { type FileExplorerProps } from "./FileExplorer";
import { directoryState } from "./directory-state";
import type { Directory } from "./transform-file-list";
import ForceDeleteConfirmationDialog from "./ForceDeleteConfirmationDialog";

const handlers = {
  onRename: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
  onMouseDown: vi.fn(),
};

const tree: Directory = {
  name: "",
  path: "/",
  directories: [
    {
      name: "models",
      path: "/models",
      directories: [],
      files: ["foo.sql"],
    },
  ],
  files: ["README.md"],
};

function makeProps(overrides: Partial<FileExplorerProps> = {}): FileExplorerProps {
  return {
    fileTree: tree,
    projectTitle: "My Project",
    ...handlers,
    ...overrides,
  };
}

beforeEach(() => {
  directoryState.reset();
  vi.clearAllMocks();
});

describe("file-explorer react FileExplorer", () => {
  it("renders the project title and the tree", () => {
    render(<FileExplorer {...makeProps()} />);
    expect(screen.getByText("My Project")).toBeTruthy();
    expect(screen.getByText("models")).toBeTruthy();
    expect(screen.getByText("foo.sql")).toBeTruthy();
    expect(screen.getByText("README.md")).toBeTruthy();
  });

  it("collapses a directory on click and hides its children", async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...makeProps()} />);

    expect(screen.getByText("foo.sql")).toBeTruthy();
    await user.click(screen.getByTestId("nav-dir-/models"));
    expect(screen.queryByText("foo.sql")).toBeNull();
  });

  it("collapse-all hides every subdirectory then expands them back", async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...makeProps()} />);

    // The collapse-all control is present once directories exist.
    const toggle = screen.getByTestId("file-explorer-collapse-all");
    await user.click(toggle);
    expect(screen.queryByText("foo.sql")).toBeNull();

    // Toggling again expands all directories.
    await user.click(toggle);
    expect(screen.getByText("foo.sql")).toBeTruthy();
  });
});

describe("file-explorer react ForceDeleteConfirmationDialog", () => {
  it("renders nothing when closed and calls callbacks when open", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onDelete = vi.fn();

    const { rerender } = render(
      <ForceDeleteConfirmationDialog open={false} onClose={onClose} onDelete={onDelete} />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <ForceDeleteConfirmationDialog open onClose={onClose} onDelete={onDelete} />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
