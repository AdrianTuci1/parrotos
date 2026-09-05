// React translation of `features/file-explorer/NavDirectoryEntry.svelte`. The
// Svelte context-menu (`DropdownMenu.Root`, `NavigationMenuItem`) and the
// runtime-bound add-folder / error-warning badges are deferred; the row keeps the
// faithful toggle markup, and the "more" control is a hover stand-in rendered
// with the `group`/`group-hover` classes from the Svelte component.
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import { getPaddingFromPath } from "@rilldata/web-common/features/file-explorer/nav-tree-spacing";
import type { Directory } from "./transform-file-list";
import { directoryState } from "./directory-state";
import type { NavDragData } from "./types";
import {
  CaretDownIcon,
  MoreHorizontalIcon,
} from "./icons";

export default function NavDirectoryEntry({
  dir,
  onRename,
  onDelete,
  onMouseDown,
}: {
  dir: Directory;
  onRename: (filePath: string, isDir: boolean) => void;
  onDelete: (filePath: string, isDir: boolean) => void;
  onMouseDown: (e: MouseEvent, dragData: NavDragData) => void;
}) {
  const state = useReadable(directoryState) ?? {};
  const expanded = state[dir.path] ?? true;
  const padding = getPaddingFromPath(dir.path);
  const id = `${dir.path}-nav-entry`;

  const toggleDirectory = () => directoryState.toggle(dir.path);

  return (
    <button
      type="button"
      id={id}
      className="pr-2 w-full h-6 text-left flex justify-between group gap-x-1 items-center text-fg-primary hover:text-fg-primary font-medium hover:bg-surface-hover"
      onClick={toggleDirectory}
      onMouseDown={(e) =>
        onMouseDown(e, { id, filePath: dir.path, isDir: true })
      }
      style={{ paddingLeft: `${padding}px` }}
      aria-controls={`nav-${dir.path}`}
      aria-expanded={expanded}
      data-testid={`nav-dir-${dir.path}`}
    >
      <CaretDownIcon
        className={`flex-none text-fg-muted ${expanded ? "" : "transform -rotate-90"}`}
        size="14px"
      />
      <span className="truncate w-full">{dir.name}</span>
      <span className="flex-none opacity-0 group-hover:opacity-100 text-fg-secondary">
        <MoreHorizontalIcon size="16px" />
      </span>
    </button>
  );
}
