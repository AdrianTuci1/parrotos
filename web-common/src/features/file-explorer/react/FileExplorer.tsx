// React translation of `features/file-explorer/FileExplorer.svelte`. The runtime
// file-tree query (`createRuntimeServiceListFiles`), the rename/duplicate/delete
// actions and the drag-drop handlers are exposed as props (wired in the
// runtime-bound phase), so the shell renders the project header, the collapse-all
// control and the recursive tree from a supplied `Directory`. The loading/error
// states and the force-delete confirmation mirror the Svelte original.
import { useState } from "react";
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import {
  collectDirectoryPaths,
  findDirectory,
  type Directory,
} from "./transform-file-list";
import { directoryState } from "./directory-state";
import NavDirectory from "./NavDirectory";
import ForceDeleteConfirmationDialog from "./ForceDeleteConfirmationDialog";
import {
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
} from "./icons";
import type { NavDragData } from "./types";

export interface FileExplorerProps {
  fileTree?: Directory;
  projectTitle?: string;
  hasUnsaved?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onRename: (filePath: string, isDir: boolean) => void;
  onDuplicate: (filePath: string, isDir: boolean) => void;
  onDelete: (filePath: string, isDir: boolean) => void;
  onMouseDown: (e: MouseEvent, dragData: NavDragData) => void;
  onDropSuccess?: (fromPath: string, toDir: string) => Promise<void>;
  hrefPrefix?: string;
}

export default function FileExplorer({
  fileTree,
  projectTitle = "Untitled Rill Project",
  hasUnsaved = false,
  isLoading = false,
  isError = false,
  onRename,
  onDuplicate,
  onDelete,
  onMouseDown,
  hrefPrefix = "",
}: FileExplorerProps) {
  const state = useReadable(directoryState) ?? {};
  const directoryPaths = fileTree ? collectDirectoryPaths(fileTree) : [];
  const allDirectoriesCollapsed =
    directoryPaths.length > 0 &&
    directoryPaths.every((path) => state[path] === false);
  const toggleAllLabel = allDirectoriesCollapsed
    ? "Expand all folders"
    : "Collapse all folders";

  // Mirrors the Svelte onDelete: a non-empty directory routes through the
  // force-delete confirmation instead of deleting directly.
  const [showForceDelete, setShowForceDelete] = useState(false);
  const [forceDeletePath, setForceDeletePath] = useState<string | null>(null);

  function handleToggleAll() {
    if (!fileTree) return;
    if (allDirectoriesCollapsed) {
      directoryState.expandAll(directoryPaths);
    } else {
      directoryState.collapseAll(directoryPaths);
    }
  }

  function handleDelete(filePath: string, isDir: boolean) {
    if (isDir && fileTree) {
      const dir = findDirectory(fileTree, filePath);
      if (dir?.directories?.length || dir?.files?.length) {
        setForceDeletePath(filePath);
        setShowForceDelete(true);
        return;
      }
    }
    onDelete(filePath, isDir);
  }

  return (
    <>
      <div className="project-header sticky top-0 z-10 bg-surface-base flex items-center justify-between gap-x-1 h-7 w-full pl-2 pr-1.5">
        <h3
          className="truncate font-semibold text-[10px] uppercase text-fg-muted"
          title={projectTitle}
        >
          {projectTitle}
        </h3>
        {directoryPaths.length ? (
          <button
            type="button"
            className="flex flex-none items-center justify-center size-5 rounded text-fg-secondary hover:bg-surface-hover hover:text-fg-primary"
            aria-label={toggleAllLabel}
            title={toggleAllLabel}
            onClick={handleToggleAll}
            data-testid="file-explorer-collapse-all"
          >
            {allDirectoriesCollapsed ? (
              <ChevronsUpDownIcon size="14px" />
            ) : (
              <ChevronsDownUpIcon size="14px" />
            )}
          </button>
        ) : null}
      </div>

      <ul className="flex flex-col w-full items-start justify-start overflow-auto">
        {fileTree ? (
          <NavDirectory
            directory={fileTree}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onDelete={handleDelete}
            onMouseDown={onMouseDown}
            hrefPrefix={hrefPrefix}
          />
        ) : isLoading ? (
          <div className="flex flex-col gap-y-1.5 w-full px-2 py-2">
            {[0.7, 0.5, 0.8, 0.6, 0.55, 0.65].map((width, i) => (
              <div
                key={i}
                className="h-5 bg-gray-200 animate-pulse rounded"
                style={{ width: `${width * 100}%` }}
              />
            ))}
          </div>
        ) : isError ? (
          <div className="px-2 py-3 text-xs text-fg-muted">
            Failed to load files
          </div>
        ) : null}
      </ul>

      <ForceDeleteConfirmationDialog
        open={showForceDelete}
        filePath={forceDeletePath ?? undefined}
        onClose={() => setShowForceDelete(false)}
        onDelete={() => {
          if (forceDeletePath) onDelete(forceDeletePath, true);
          setShowForceDelete(false);
        }}
      />
    </>
  );
}
