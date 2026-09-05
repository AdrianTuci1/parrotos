import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { makeDimensionHref } from "@rilldata/web-common/features/dashboards/dashboard-utils";
import type { VirtualizedTableColumns } from "@rilldata/web-common/components/virtualized-table/types";
import type { DimensionTableRow } from "../dimension-table-types";
import type { VirtualItem } from "./useVirtualizer";
import { StickyHeader } from "./StickyHeader";
import { Cell } from "./Cell";
import { ArrowDown } from "./icons";
import { useDimensionTableConfig } from "./context";

/**
 * React translation of `features/dashboards/dimension-table/DimensionValueHeader.svelte`.
 *
 * Renders the frozen dimension-value column: a resizable/sortable header band
 * plus one sticky cell per virtual row. The `sortByDimensionValue` action and
 * the `sortedByDimensionValue` / `sortedAscending` selectors are Svelte-context
 * values in the source and are threaded in as props here.
 */
export interface DimensionValueHeaderProps {
  totalHeight: number;
  virtualRowItems: VirtualItem[];
  selectedIndex?: number[];
  column: VirtualizedTableColumns;
  rows: DimensionTableRow[];
  width?: number;
  horizontalScrolling?: boolean;
  scrolling?: boolean;
  activeIndex?: number;
  excludeMode?: boolean;
  sortedByDimensionValue?: boolean;
  sortedAscending?: boolean;
  onSortByDimensionValue?: () => void;
  onSelectItem?: (data: { index: number; meta: boolean }) => void;
  onResizeColumn?: (size: number) => void;
  onInspect?: (rowIndex: number) => void;
}

export function DimensionValueHeader({
  totalHeight,
  virtualRowItems,
  selectedIndex = [],
  column,
  rows,
  width,
  horizontalScrolling = false,
  scrolling = false,
  activeIndex,
  excludeMode = false,
  sortedByDimensionValue = false,
  sortedAscending = false,
  onSortByDimensionValue = () => {},
  onSelectItem = () => {},
  onResizeColumn = () => {},
  onInspect = () => {},
}: DimensionValueHeaderProps) {
  const config = useDimensionTableConfig();
  const cellWidth = width ?? config.indexWidth;
  const atLeastOneSelected = !!selectedIndex?.length;

  const getCellProps = (row: VirtualItem) => {
    const value = rows[row.index]?.[column.name];
    return {
      value,
      // NOTE: for this "header" column, we don't use a formatted value, we use
      // the dimension value directly. Thus `null` is passed as the formatted.
      formattedValue: null,
      type: column?.type,
      suppressTooltip: scrolling,
      barValue: 0,
      rowSelected:
        selectedIndex.findIndex((tgt) => row?.index === tgt) >= 0,
      href: makeDimensionHref(
        rows[row.index],
        column.name,
        value as string,
      ),
    };
  };

  return (
    <div
      className="sticky self-start left-6 top-0 z-20"
      style={{ height: `${totalHeight}px`, width: `${cellWidth}px` }}
    >
      <StickyHeader
        header={{ size: cellWidth, start: 0 }}
        enableResize
        position="top-left"
        borderRight
        bgClass="bg-surface-background"
        onClick={onSortByDimensionValue}
        onResize={onResizeColumn}
      >
        <div className="flex items-center">
          <span className={`px-1 ${sortedByDimensionValue ? "font-bold" : ""}`}>
            {column?.label || column?.name}
          </span>
          {sortedByDimensionValue ? (
            <div className="text-fg-secondary">
              {sortedAscending ? (
                <ArrowDown size="12px" />
              ) : (
                <ArrowDown size="12px" flip />
              )}
            </div>
          ) : null}
        </div>
      </StickyHeader>
      {virtualRowItems.map((row) => (
        <StickyHeader
          key={`row-${row.key}`}
          enableResize={false}
          position="left"
          header={{ size: cellWidth, start: row.start }}
          borderRight={horizontalScrolling}
          bgClass="bg-surface-background"
        >
          <Cell
            label={m.dashboard_filter_dimension_value()}
            positionStatic
            row={row}
            column={{ start: 0, size: cellWidth }}
            atLeastOneSelected={atLeastOneSelected}
            excludeMode={excludeMode}
            rowActive={activeIndex === row.index}
            {...getCellProps(row)}
            colSelected={sortedByDimensionValue}
            onInspect={onInspect}
            onSelectItem={onSelectItem}
          />
        </StickyHeader>
      ))}
    </div>
  );
}
