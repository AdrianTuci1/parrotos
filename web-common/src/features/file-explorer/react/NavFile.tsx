// React translation of `features/file-explorer/NavFile.svelte`. The resource-kind
// icon, the telemetry fire, the per-kind context menus (SourceModel/MetricsView/
// Explore/Canvas menu items) and the save/rename/duplicate/delete actions are
// deferred to the runtime-bound phase; the row renders the faithful link markup
// with a `icon` prop and a hover "more" stand-in.
import type { ReactNode } from "react";
import { getPaddingFromPath } from "@rilldata/web-common/features/file-explorer/nav-tree-spacing";
import type { NavDragData } from "./types";
import { getFileHref } from "./editor-routing";
import { FileIcon, MoreHorizontalIcon } from "./icons";

export default function NavFile({
  filePath,
  onRename,
  onDuplicate,
  onDelete,
  onMouseDown,
  resourceKind,
  isCurrentFile = false,
  hasUnsavedChanges = false,
  saving = false,
  hasErrors = false,
  hasWarnings = false,
  protectedDirectory = false,
  isProtectedFile = false,
  icon,
}: {
  filePath: string;
  onRename: (filePath: string, isDir: boolean) => void;
  onDuplicate: (filePath: string, isDir: boolean) => void;
  onDelete: (filePath: string, isDir: boolean) => void;
  onMouseDown: (e: MouseEvent, dragData: NavDragData) => void;
  resourceKind?: string;
  isCurrentFile?: boolean;
  hasUnsavedChanges?: boolean;
  saving?: boolean;
  hasErrors?: boolean;
  hasWarnings?: boolean;
  protectedDirectory?: boolean;
  isProtectedFile?: boolean;
  icon?: ReactNode;
}) {
  const fileName = filePath.split("/").pop();
  const id = `${filePath}-nav-link`;
  const padding = getPaddingFromPath(filePath);
  const isDotFile = fileName?.startsWith(".") ?? false;
  const muted = protectedDirectory || isDotFile;

  const handleMouseDown = (e: MouseEvent) => {
    if (isProtectedFile) return;
    onMouseDown(e, { id, filePath, isDir: false, kind: resourceKind });
  };

  return (
    <li
      aria-label={`${filePath} Nav Entry`}
      className={`w-full text-left pr-2 h-6 group flex justify-between gap-x-1 items-center hover:bg-surface-hover ${isCurrentFile ? "bg-surface-active" : ""} ${hasUnsavedChanges || saving ? "opacity-50" : ""}`}
      data-testid={`nav-file-${filePath}`}
    >
      <a
        className={`w-full truncate flex items-center gap-x-1 font-medium ${muted ? "hover:text-fg-secondary text-fg-muted" : "text-fg-primary hover:text-fg-primary"}`}
        href={getFileHref(filePath)}
        id={id}
        onMouseDown={handleMouseDown}
        style={{ paddingLeft: `${padding}px` }}
      >
        <div className="flex-none">
          {icon ?? <FileIcon size="14px" />}
        </div>
        <span
          className={`truncate w-full ${hasErrors ? "text-red-600" : hasWarnings ? "text-yellow-600" : ""}`}
        >
          {fileName}
        </span>
      </a>
      {!protectedDirectory && !isProtectedFile ? (
        <span className="flex-none opacity-0 group-hover:opacity-100 text-fg-secondary">
          <MoreHorizontalIcon size="16px" />
        </span>
      ) : null}
    </li>
  );
}
