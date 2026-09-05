import type { MouseEvent } from "react";

export interface HoveringData {
  value: string | number | null;
  rowHeader: boolean;
}

export interface VirtualTooltipProps {
  hoverPosition: { top: number; left: number; width: number } | null;
  pinned: boolean;
  hovering: HoveringData;
  sortable: boolean;
  customShortcuts?: { description: string; shortcut: string }[];
}

/**
 * Focused React equivalent of
 * @rilldata/web-common/components/virtualized-table/VirtualTooltip.svelte as
 * used by PivotTable. Renders a floating tooltip positioned over the hovered
 * cell with any custom shortcuts. The shared tooltip primitives
 * (TooltipContent, FormattedDataType, Shortcut) are collapsed into a simple
 * box here for the React port.
 */
export function VirtualTooltip({
  hoverPosition,
  pinned,
  hovering,
  sortable,
  customShortcuts = [],
}: VirtualTooltipProps) {
  if (!hoverPosition) return null;

  return (
    <aside
      className="w-fit h-fit absolute -translate-x-1/2 -translate-y-full z-[1000] rounded-md bg-surface-base border border-gray-200 px-3 py-2 shadow-lg"
      style={{
        top: `${hoverPosition.top - 8}px`,
        left: `${hoverPosition.left + hoverPosition.width / 2}px`,
      }}
      onMouseEnter={stop}
      onMouseLeave={stop}
    >
      <div className="text-xs text-fg-primary font-medium truncate">
        {hovering.value}
      </div>
      {customShortcuts.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
          {customShortcuts.map((s) => (
            <li key={s.shortcut} className="flex items-center gap-1 text-xs text-fg-secondary">
              <span>{s.description}</span>
              <kbd className="px-1 rounded bg-surface-muted text-fg-secondary">
                {s.shortcut}
              </kbd>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}

function stop(_e: MouseEvent) {
  // Kept for parity with the Svelte tooltip's portal behaviour; the React
  // tooltip is handled at the table wrapper level.
}
