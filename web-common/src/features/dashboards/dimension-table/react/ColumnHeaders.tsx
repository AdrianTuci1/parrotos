import type { VirtualizedTableColumns } from "@rilldata/web-common/components/virtualized-table/types";
import type { VirtualItem } from "./useVirtualizer";
import { ColumnHeader } from "./ColumnHeader";
import { useDimensionTableConfig } from "./context";

/**
 * React translation of `components/virtualized-table/sections/ColumnHeaders.svelte`.
 *
 * Renders the sticky measure-column label band, one `ColumnHeader` per
 * virtualized column item. `sortByMeasure` is the already-resolved sorted
 * measure name (a Svelte-store value in the source, threaded in as a prop).
 */
export interface ColumnHeadersProps {
  columns: VirtualizedTableColumns[];
  pinnedColumns?: VirtualizedTableColumns[];
  virtualColumnItems: VirtualItem[];
  noPin?: boolean;
  showDataIcon?: boolean;
  sortByMeasure?: string | null;
  onClickColumn?: (columnName: string) => void;
  onPin?: (column: VirtualizedTableColumns) => void;
}

export function ColumnHeaders({
  columns,
  pinnedColumns = [],
  virtualColumnItems,
  noPin = false,
  showDataIcon = false,
  sortByMeasure = null,
  onClickColumn = () => {},
  onPin = () => {},
}: ColumnHeadersProps) {
  const config = useDimensionTableConfig();

  return (
    <div className="w-full sticky top-0 z-10">
      {virtualColumnItems.map((header) => {
        const column = columns[header.index];
        const name = column.label || column.name;
        const isEnableResizeDefined = "enableResize" in column;
        const enableResize = isEnableResizeDefined
          ? column.enableResize ?? true
          : true;
        const enableSorting =
          "enableSorting" in column
            ? column.enableResize
            : config.table === "DimensionTable";
        return (
          <ColumnHeader
            key={header.key}
            name={name}
            enableResize={enableResize}
            enableSorting={enableSorting ?? true}
            type={column.type}
            description={column.description || ""}
            pinned={pinnedColumns.some((pinCol) => pinCol.name === column.name)}
            isSelected={sortByMeasure === column.name}
            sorted={column.sorted}
            header={{ size: header.size, start: header.start }}
            noPin={noPin}
            showDataIcon={showDataIcon}
            onPin={() => onPin(column)}
            onClickColumn={() => onClickColumn(column.name)}
          />
        );
      })}
    </div>
  );
}
