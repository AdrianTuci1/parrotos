import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { Cell, Column, HeaderGroup, Row } from "@tanstack/react-table";
import {
  COLUMN_WIDTH_CONSTANTS as WIDTHS,
  calculateColumnWidth,
  calculateMeasureWidth,
  distributeColumnWidthsToFillContainer,
} from "@rilldata/web-common/features/dashboards/pivot/pivot-column-width-utils";
import { Resizer } from "@rilldata/web-common/features/dashboards/pivot/react/Resizer";
import { cellInspectorStore } from "@rilldata/web-common/features/dashboards/stores/cell-inspector-store";
import {
  computeEffectiveDimIdx,
  flatCellState,
  flatRowState,
} from "@rilldata/web-common/features/dashboards/pivot/pivot-cell-classes";
import {
  dimKeyFromRow,
  type PivotClickSelectionState,
} from "@rilldata/web-common/features/dashboards/pivot/pivot-click-selection";
import type { PivotRowSelectionState } from "@rilldata/web-common/features/dashboards/pivot/pivot-row-selection";
import type { CellFormatter } from "@rilldata/web-common/features/dashboards/pivot/pivot-conditional-formatting";
import {
  ArrowDown,
  PivotAssembledContext,
  PivotHeaderLabel,
  renderIcon,
} from "@rilldata/web-common/features/dashboards/pivot/react/CellComponents";
import type { MeasureColumnProps } from "@rilldata/web-common/features/dashboards/pivot/react/pivot-column-definition";
import type {
  PivotDataRow,
  PivotDataStoreConfig,
} from "@rilldata/web-common/features/dashboards/pivot/types";

const HEADER_HEIGHT = 30;

export interface FlatTableProps {
  assembled: boolean;
  measures: MeasureColumnProps;
  cellFormatters: Map<string, CellFormatter>;
  dataRows: PivotDataRow[];
  hasMeasureContextColumns: boolean;
  canShowDataViewer?: boolean;
  enableClickToFilter?: boolean;
  rowSelectionState?: PivotRowSelectionState | undefined;
  clickSelection?: PivotClickSelectionState | undefined;
  activeCell?: { rowId: string; columnId: string } | null | undefined;
  config?: PivotDataStoreConfig | undefined;
  fillWidth?: boolean;
  containerWidth: number;
  headerGroups: HeaderGroup<PivotDataRow>[];
  rows: Row<PivotDataRow>[];
  virtualRows: { index: number }[];
  totalsRow?: PivotDataRow | undefined;
  before: number;
  after: number;
  totalRowSize: number;
  onCellClick: (e: MouseEvent) => void;
  onMouseMove: (e: MouseEvent) => void;
  onTableLeave: () => void;
  onCellCopy: (e: MouseEvent) => void;
}

export function FlatTable(props: FlatTableProps) {
  const {
    assembled,
    measures,
    cellFormatters,
    dataRows,
    hasMeasureContextColumns,
    canShowDataViewer = false,
    enableClickToFilter = false,
    rowSelectionState,
    clickSelection,
    activeCell,
    config,
    fillWidth = false,
    containerWidth,
    headerGroups,
    rows,
    virtualRows,
    totalsRow,
    before,
    after,
    totalRowSize,
    onCellClick,
    onMouseMove,
    onTableLeave,
    onCellCopy,
  } = props;

  const [columnLengths, setColumnLengths] = useState<Map<string, number>>(
    () => new Map(),
  );

  const headers = headerGroups[0]?.headers ?? [];

  const getMeasureColumn = (headerColumn: Column<PivotDataRow>) => {
    const columnId = headerColumn.id;
    return measures.find((m) => m.name === columnId);
  };

  const viewMeta = (cell: Cell<PivotDataRow, unknown>) =>
    cell.column.columnDef.meta as {
      icon?: unknown;
      tooltipFormatter?: (v: unknown) => string | null | undefined;
      description?: string;
      conditionalFormat?: unknown;
      measureName?: string;
      isRowTotal?: boolean;
    } | undefined;

  // Initialize column lengths when a new column header appears (mirrors the
  // `$: headers.forEach(...)` reactive block in FlatTable.svelte).
  useEffect(() => {
    setColumnLengths((prev) => {
      const next = new Map(prev);
      headers.forEach((header) => {
        const columnId = header.column.id;
        if (!next.has(columnId)) {
          const measure = getMeasureColumn(header.column);
          const estimatedWidth = measure
            ? calculateMeasureWidth(
                measure.name,
                measure.label,
                measure.formatter,
                totalsRow,
                dataRows,
              )
            : calculateColumnWidth(
                String(header.column.columnDef.header),
                "",
                dataRows,
              );
          next.set(columnId, estimatedWidth);
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, dataRows, totalsRow]);

  const baseColumnWidths = useMemo(
    () =>
      headers.map(
        (header) =>
          columnLengths.get(header.column.id) ?? WIDTHS.INIT_MEASURE_WIDTH,
      ),
    [headers, columnLengths],
  );

  const displayColumnWidths = useMemo(
    () =>
      fillWidth
        ? distributeColumnWidthsToFillContainer(
            headers.map((header, i) => ({
              width: baseColumnWidths[i],
              role: getMeasureColumn(header.column) ? "measure" : "dimension",
            })),
            containerWidth,
          )
        : baseColumnWidths,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fillWidth, containerWidth, baseColumnWidths, headers],
  );

  const totalLength = useMemo(
    () => displayColumnWidths.reduce((acc, width) => acc + width, 0),
    [displayColumnWidths],
  );

  const lastDimIdx = (config?.rowDimensionNames.length ?? 0) - 1;

  function getCellFormatting(
    cell: Cell<PivotDataRow, unknown>,
    isTotalsRow: boolean,
  ): { background: string; color: string } | null {
    if (isTotalsRow) return null;
    const meta = viewMeta(cell);
    if (!meta?.conditionalFormat || meta.isRowTotal || !meta.measureName) {
      return null;
    }
    const formatter = cellFormatters.get(meta.measureName);
    if (!formatter) return null;
    const value = cell.getValue();
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return formatter(value);
  }

  function isCellActive(rowId: string, columnId: string) {
    return rowId === activeCell?.rowId && columnId === activeCell?.columnId;
  }

  function hasBorderRight(columnId: string): boolean {
    if (!hasMeasureContextColumns) return true;
    const measureIndex = measures.findIndex((m) => m.name === columnId);
    if (measureIndex === -1) return true;
    //  Every third column is the last in its group
    return (measureIndex + 1) % 3 === 0;
  }

  function renderCell(cell: Cell<PivotDataRow, unknown>): ReactNode {
    const columnDef = cell.column.columnDef as {
      cell?: (ctx: unknown) => unknown;
    };
    if (typeof columnDef.cell === "function") {
      return columnDef.cell(cell.getContext()) as ReactNode;
    }
    return cell.getValue() as ReactNode;
  }

  return (
    <PivotAssembledContext.Provider value={assembled}>
      <div
        className="w-full absolute top-0 z-50 flex pointer-events-none"
        style={{ width: `${totalLength}px`, height: `${totalRowSize + HEADER_HEIGHT + headerGroups.length}px` }}
      >
        {headers.map((header, i) => {
          const baseLength =
            columnLengths.get(header.column.id) ?? WIDTHS.INIT_MEASURE_WIDTH;
          const length = displayColumnWidths[i] ?? baseLength;
          const last = i === headers.length - 1;
          return (
            <div key={header.id} style={{ width: `${length}px` }} className="h-full relative">
              <Resizer
                side="right"
                direction="EW"
                min={WIDTHS.MIN_MEASURE_WIDTH}
                max={WIDTHS.MAX_MEASURE_WIDTH}
                dimension={baseLength}
                justify={last ? "end" : "center"}
                hang={!last}
                onUpdate={(d: number) =>
                  setColumnLengths((prev) => {
                    const next = new Map(prev);
                    next.set(header.column.id, d);
                    return next;
                  })
                }
              >
                <div className="resize-bar"></div>
              </Resizer>
            </div>
          );
        })}
      </div>

      <table
        role="presentation"
        style={{ width: `${totalLength}px` }}
        className={!!totalsRow && measures.length > 0 ? "with-totals-row" : ""}
        onClick={(e) => (e.shiftKey ? onCellCopy(e) : onCellClick(e))}
        onMouseMove={onMouseMove}
        onMouseLeave={onTableLeave}
      >
        <colgroup>
          {headers.map((header, i) => {
            const baseLength =
              columnLengths.get(header.column.id) ?? WIDTHS.INIT_MEASURE_WIDTH;
            const length = displayColumnWidths[i] ?? baseLength;
            return (
              <col key={header.id} style={{ width: `${length}px`, maxWidth: `${length}px` }} />
            );
          })}
        </colgroup>

        <thead>
          {headerGroups.map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sortDirection = header.column.getIsSorted();
                const icon = (header.column.columnDef.meta as { icon?: unknown })?.icon;
                return (
                  <th key={header.id}>
                    <button
                      className={[
                        "header-cell",
                        header.column.getCanSort() ? "cursor-pointer select-none" : "",
                        !!getMeasureColumn(header.column) ? "flex-row-reverse" : "",
                        hasBorderRight(header.column.id) ? "border-r" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {!header.isPlaceholder ? (
                        <>
                          {icon ? (
                            <span>{renderIcon(icon)}</span>
                          ) : (
                            <PivotHeaderLabel
                              label={String(header.column.columnDef.header)}
                              description={(header.column.columnDef.meta as { description?: string })?.description}
                            />
                          )}
                          {sortDirection ? (
                            <span
                              className={`transition-transform -mr-1 ${
                                sortDirection === "asc" ? "-rotate-180" : ""
                              }`}
                            >
                              <ArrowDown />
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        <tbody>
          <tr style={{ height: `${before}px` }} />
          {virtualRows.map(({ index }) => {
            const row = rows[index];
            const cells = row.getVisibleCells();
            const rowId = row.id;
            const rowData = row.original;
            const dk = dimKeyFromRow(rowData, config?.rowDimensionNames ?? []);
            const isTotalsRow = !!totalsRow && rowId === "0";
            const isSelected = rowSelectionState?.isRowSelected(rowData) ?? false;
            const hasClickedCell =
              clickSelection?.hasSelectedCellInRow(dk) ?? false;
            const effectiveDimIdx = computeEffectiveDimIdx(
              hasClickedCell,
              clickSelection?.getClickedDimensionIndex(dk) ?? -1,
              lastDimIdx,
              isSelected,
              rowSelectionState?.maxFilteredDimensionIndex ?? -1,
            );
            const rs = flatRowState({
              isSelected,
              hasSelection: rowSelectionState?.hasActiveSelection ?? false,
              hasClickedCell,
              effectiveDimIdx,
            });
            return (
              <tr
                key={rowId}
                className={[
                  rs.selectedRow ? "selected-row" : "",
                  rs.dimmedRow ? "dimmed-row" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {cells.map((cell) => {
                  const cs = flatCellState({
                    isActive: isCellActive(cell.row.id, cell.column.id),
                    isClicked:
                      clickSelection?.isCellSelected(dk, cell.column.id) ?? false,
                    colDimIdx:
                      config?.rowDimensionNames.indexOf(cell.column.id) ?? -1,
                    effectiveDimIdx,
                    lastDimIdx,
                    isTotalsRow,
                    canShowDataViewer,
                    enableClickToFilter,
                    hasValue: cell.getValue() !== undefined,
                  });
                  const tooltipValue = (() => {
                    const tf = viewMeta(cell)?.tooltipFormatter;
                    return tf ? tf(cell.getValue()) : cell.getValue();
                  })();
                  const cellFmt = getCellFormatting(cell, isTotalsRow);
                  return (
                    <td
                      key={cell.id}
                      className={[
                        "ui-copy-number cell truncate",
                        cellFmt !== null ? "has-conditional-format" : "",
                        cs.activeCell ? "active-cell" : "",
                        cs.selectedCell ? "selected-cell" : "",
                        cs.selectedContextCell ? "selected-context-cell" : "",
                        cs.mutedCell ? "muted-cell" : "",
                        cs.interactiveCell ? "interactive-cell" : "",
                        !!getMeasureColumn(cell.column) ? "text-right" : "",
                        hasBorderRight(cell.column.id) ? "border-r" : "",
                        cell.getValue() === "Total" ? "total-label" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        "--cf-bg": cellFmt?.background ?? null,
                        "--cf-color": cellFmt?.color ?? null,
                      } as CSSProperties}
                      data-value={tooltipValue}
                      data-rowid={cell.row.id}
                      data-columnid={cell.column.id}
                      onMouseOver={() =>
                        cellInspectorStore.updateValue(cell.getValue(), tooltipValue)
                      }
                      onFocus={() =>
                        cellInspectorStore.updateValue(cell.getValue(), tooltipValue)
                      }
                    >
                      {renderCell(cell)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr style={{ height: `${after}px` }} />
        </tbody>
      </table>
    </PivotAssembledContext.Provider>
  );
}
