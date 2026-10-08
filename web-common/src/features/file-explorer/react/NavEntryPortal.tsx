// React translation of `features/file-explorer/NavEntryPortal.svelte` — the ghost
// dragged entry shown while a nav item is dragged. Kept as a fixed-position
// label; the drag/drop wiring is deferred to the runtime-bound phase.
import type { NavDragData } from "./types";

export default function NavEntryPortal({
  position,
  dragData,
}: {
  position: { left: number; top: number };
  dragData: NavDragData;
}) {
  return (
    <div
      className="fixed z-50 pointer-events-none rounded bg-popover text-popover-foreground shadow-lg px-2 py-1 text-xs"
      style={{ left: position.left, top: position.top }}
      data-testid="nav-entry-portal"
    >
      {dragData.fileName ?? dragData.filePath}
    </div>
  );
}
