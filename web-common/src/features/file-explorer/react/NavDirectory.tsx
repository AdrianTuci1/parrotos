// React translation of `features/file-explorer/NavDirectory.svelte`. Recursively
// renders the directory tree; expansion state comes from the React-safe
// `directoryState` store. The drag/drop hover highlight is deferred to the
// runtime-bound phase (shown here as a no-op), and file/dir handlers are props.
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import type { Directory } from "./transform-file-list";
import { directoryState } from "./directory-state";
import NavDirectoryEntry from "./NavDirectoryEntry";
import NavFile from "./NavFile";
import type { NavDragData } from "./types";

export interface TreeHandlers {
  onRename: (filePath: string, isDir: boolean) => void;
  onDuplicate: (filePath: string, isDir: boolean) => void;
  onDelete: (filePath: string, isDir: boolean) => void;
  onMouseDown: (e: MouseEvent, dragData: NavDragData) => void;
}

export default function NavDirectory({
  directory,
  onRename,
  onDuplicate,
  onDelete,
  onMouseDown,
  hrefPrefix = "",
}: {
  directory: Directory;
  hrefPrefix?: string;
} & TreeHandlers) {
  const state = useReadable(directoryState) ?? {};
  const expanded = state[directory.path] ?? true;

  return (
    <ul
      id={`nav-${directory.path}`}
      aria-label={directory.path}
      role="directory"
      className="w-full"
    >
      {directory.path !== "/" ? (
        <NavDirectoryEntry
          dir={directory}
          onRename={onRename}
          onDelete={onDelete}
          onMouseDown={onMouseDown}
        />
      ) : null}

      {expanded ? (
        <>
          {directory.directories.map((dir) => (
            <NavDirectory
              key={dir.path}
              directory={dir}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onMouseDown={onMouseDown}
              hrefPrefix={hrefPrefix}
            />
          ))}
          {directory.files.map((file) => {
            const filePath =
              directory.path === "/" ? `/${file}` : `${directory.path}/${file}`;
            return (
              <NavFile
                key={filePath}
                filePath={filePath}
                onRename={onRename}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onMouseDown={onMouseDown}
                hrefPrefix={hrefPrefix}
              />
            );
          })}
        </>
      ) : null}
    </ul>
  );
}
