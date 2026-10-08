// React-port type shared by the file-explorer tree components. Mirrors the shape
// of `NavDragData` from `features/file-explorer/nav-entry-drag-drop-store.ts`
// (the drag/drop wiring itself is deferred to the runtime-bound phase).
export type NavDragData = {
  id: string;
  filePath: string;
  fileName?: string;
  isDir: boolean;
  kind?: string | undefined;
};
