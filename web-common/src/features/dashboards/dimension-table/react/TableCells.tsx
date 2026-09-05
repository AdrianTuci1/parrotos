import type { VirtualizedTableColumns } from "@rilldata/web-common/components/virtualized-table/types";
import type { DimensionTableRow } from "../dimension-table-types";
import type { VirtualItem } from "./useVirtualizer";
import { Cell } from "./Cell";

/**
 * React translation of `components/virtualized-table/sections/TableCells.svelte`.
 *
 * Renders the virtualized measure grid: one `Cell` per (virtual column, virtual
 * row) pair, wrapped in a `display: contents` row so the grid participates in
 * the virtualized grid layout. The `Row.svelte` wrapper is inlined.
 */
export interface TableCellsProps {
  virtualColumnItems: VirtualItem[];
  virtualRowItems: VirtualItem[];
  rows: DimensionTableRow[];
  selectedIndex?: number[];
  columns: VirtualizedTableColumns[];
  scrolling?: boolean;
  activeIndex?: number;
  excludeMode?: boolean;
  cellLabel?: string;
  onSelectItem?: (data: { index: number; meta: boolean }) => void;
  onInspect?: (rowIndex: number) => void;
}

export function TableCells({
  virtualColumnItems,
  virtualRowItems,
  rows,
  selectedIndex = [],
  columns,
  scrolling = false,
  activeIndex,
  excludeMode = false,
  cellLabel,
  onSelectItem = () => {},
  onInspect = () => {},
}: TableCellsProps) {
  const atLeastOneSelected = !!selectedIndex.length;

  const getCellProps = (
    virtRow: VirtualItem,
    virtCol: VirtualItem,
  ) => {
    const column = columns[virtCol.index];
    const columnName = column.name;
    const value = rows[virtRow.index]?.[columnName];
    return {
      value,
      formattedValue: rows[virtRow.index]?.["__formatted_" + columnName] ?? null,
      tooltipFormatter: column.tooltipFormatter,
      type: column.type,
      lowerIsBetter: column.lowerIsBetter ?? false,
      barValue: column.max ? (value != null ? (value as number) / column.max : 0) : 0,
      rowSelected: selectedIndex.findIndex((tgt) => virtRow.index === tgt) >= 0,
      colSelected: column.highlight,
    };
  };

  return (
    <>
      {virtualColumnItems.map((column) => (
        <div className="display-contents" role="row" key={column.key}>
          {virtualRowItems.map((row) => {
            const cellProps = {
              ...getCellProps(row, column),
              row,
              column: { start: column.start, size: column.size },
              atLeastOneSelected,
              excludeMode,
              rowActive: activeIndex === row.index,
              suppressTooltip: scrolling,
              onInspect,
              onSelectItem,
              label: cellLabel,
            };
            return <Cell key={`${row.key}-${column.key}`} {...cellProps} />;
          })}
        </div>
      ))}
    </>
  );
}
