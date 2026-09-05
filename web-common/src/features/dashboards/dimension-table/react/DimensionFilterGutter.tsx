import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import {
  COMPARISON_COLORS,
  SELECTED_NOT_COMPARED_COLOR,
} from "@rilldata/web-common/features/dashboards/config";
import { Tooltip } from "@rilldata/web-common/features/dashboards/leaderboard/react/primitives";
import type { VirtualItem } from "./useVirtualizer";
import { StickyHeader } from "./StickyHeader";
import { Cancel, Check, CheckCircle, Compare, Spacer } from "./icons";
import { useDimensionTableConfig } from "./context";

/**
 * React translation of `features/dashboards/dimension-table/DimensionFilterGutter.svelte`.
 *
 * Renders the frozen include/exclude gutter beside the dimension column: the
 * compare toggle at the top and one selection marker per virtual row. The
 * `DimensionCompareMenu` (a small `IconButton` + `Compare` tooltip) is inlined.
 */
export interface DimensionFilterGutterProps {
  totalHeight: number;
  virtualRowItems: VirtualItem[];
  selectedIndex?: number[];
  excludeMode?: boolean;
  isBeingCompared?: boolean;
  dimensionName: string;
  toggleComparisonDimension?: (dimensionName: string) => void;
}

function getColor(i: number, selectedIndex: number[]): string {
  const posInSelection = selectedIndex.indexOf(i);
  if (posInSelection >= 7) return SELECTED_NOT_COMPARED_COLOR;
  return COMPARISON_COLORS[posInSelection];
}

export function DimensionFilterGutter({
  totalHeight,
  virtualRowItems,
  selectedIndex = [],
  excludeMode = false,
  isBeingCompared = false,
  dimensionName,
  toggleComparisonDimension = () => {},
}: DimensionFilterGutterProps) {
  const config = useDimensionTableConfig();

  return (
    <div
      className="sticky left-0 top-0 z-20 bg-surface-background"
      style={{ height: `${totalHeight}px`, width: `${config.indexWidth}px` }}
    >
      <div
        style={{ height: `${config.columnHeaderHeight}px` }}
        className="sticky left-0 top-0 bg-surface-background z-40 flex items-center"
      >
        {/* DimensionCompareMenu */}
        <button
          aria-label={m.leaderboard_toggle_breakdown({ name: dimensionName })}
          className="grid place-items-center"
          onClick={(e) => {
            e.stopPropagation();
            if (dimensionName) toggleComparisonDimension(dimensionName);
          }}
        >
          <Tooltip
            location="left"
            distance={8}
            content={
              isBeingCompared
                ? m.leaderboard_remove_comparison()
                : m.leaderboard_compare()
            }
          >
            <Compare isColored={isBeingCompared} />
          </Tooltip>
        </button>
      </div>
      {virtualRowItems.map((row) => {
        const isSelected = selectedIndex.includes(row.index);
        return (
          <StickyHeader
            key={`row-${row.key}`}
            enableResize={false}
            position="left"
            header={{ size: config.indexWidth, start: row.start }}
          >
            <div className="py-0.5 grid place-items-center">
              {isSelected && !excludeMode && isBeingCompared ? (
                <CheckCircle color={getColor(row.index, selectedIndex)} size="18px" />
              ) : isSelected && !excludeMode ? (
                <Check size="20px" />
              ) : isSelected && excludeMode ? (
                <Cancel size="20px" />
              ) : (
                <Spacer />
              )}
            </div>
          </StickyHeader>
        );
      })}
    </div>
  );
}
