import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { Cell, HeaderGroup, Row } from "@tanstack/react-table";
import {
  COLUMN_WIDTH_CONSTANTS as WIDTHS,
  calculateMeasureWidth,
  calculateRowDimensionWidth,
  distributeColumnWidthsToFillContainer,
  getNestedRowDimensionWidthKey,
} from "@rilldata/web-common/features/dashboards/pivot/pivot-column-width-utils";
import { Resizer } from "@rilldata/web-common/features/dashboards/pivot/react/Resizer";
import { cellInspectorStore } from "@rilldata/web-common/features/dashboards/stores/cell-inspector-store";
import {
  nestedCellState,
  nestedHeaderState,
  nestedRowState,
} from "@rilldata/web-common/features/dashboards/pivot/pivot-cell-classes";
import {
  dimKeyFromRow,
  nestedDimKeyFromRow,
  type PivotClickSelectionState,
} from "@rilldata/web-common/features/dashboards/pivot/pivot-click-selection";
import type { PivotRowSelectionState } from "@rilldata/web-common/features/dashboards/pivot/pivot-row-selection";
import {
  computeAncestorRowIds,
  computeCellSelectedColDimGroupIndices,
  computeCellSelectedColIndices,
  computeSelectedColIndices,
  isHeaderInHoveredRange,
  isHoveredHeader,
  isInCellSelectedColRange,
  isInSelectedColRange,
  type HoveredColRange,
} from "@rilldata/web-common/features/dashboards/pivot/pivot-selection-indices";
import { isShowMoreRow } from "@rilldata/web-common/features/dashboards/pivot/pivot-utils";
import type { CellFormatter } from "@rilldata/web-common/features/dashboards/pivot/pivot-conditional-formatting";
import {
  ArrowDown,
  PivotAssembledContext,
  PivotHeaderLabel,
  renderIcon,
} from "@rilldata/web-common/features/dashboards/pivot/react/CellComponents";
import {
  getRowNestedLabel,
  type DimensionColumnProps,
  type MeasureColumnProps,
} from "@rilldata/web-common/features/dashboards/pivot/react/pivot-column-definition";
import type { PivotDataRow } from "@rilldata/web-common/features/dashboards/pivot/types";

const HEADER_HEIGHT = 30;

interface MeasureGroupSubHeader {
  column: { columnDef: { name: string } };
}
interface MeasureGroup {
  subHeaders: MeasureGroupSubHeader[];
}

export interface NestedTableProps {
  hasColumnDimension: boolean;
  widthScopeKey: string;
  timeDimension: string;
  assembled: boolean;
  rowDimensions: DimensionColumnProps;
  dataRows: PivotDataRow[];
  measures: MeasureColumnProps;
  cellFormatters: Map<string, CellFormatter>;
  totalsRow: PivotDataRow | undefined;
  canShowDataViewer?: boolean;
  enableClickToFilter?: boolean;
  rowSelectionState?: PivotRowSelectionState | undefined;
  clickSelection?: PivotClickSelectionState | undefined;
  activeCell?: { rowId: string; columnId: string } | null | undefined;
  fillWidth?: boolean;
  containerWidth: number;
  headerGroups: HeaderGroup<PivotDataRow>[];
  rows: Row<PivotDataRow>[];
  virtualRows: { index: number }[];
  after: number;
  before: number;
  containerRefElement: RefObject<HTMLDivElement>;
  scrollLeft: number;
  totalRowSize: number;
  onMouseMove: (e: MouseEvent) => void;
  onCellClick: (e: MouseEvent) => void;
  onTableLeave: () => void;
  onCellCopy: (e: MouseEvent) => void;
  onColumnHeaderClick?:
    | ((dimensionPath: Record<string, string>) => void)
    | undefined;
}

export function NestedTable(props: NestedTableProps) {
  const {
    hasColumnDimension,
    widthScopeKey,
    timeDimension,
    assembled,
    rowDimensions,
    dataRows,
    measures,
    cellFormatters,
    totalsRow,
    canShowDataViewer = false,
    enableClickToFilter = false,
    rowSelectionState,
    clickSelection,
    activeCell,
    fillWidth = false,
    containerWidth,
    headerGroups,
    rows,
    virtualRows,
    after,
    before,
    containerRefElement,
    scrollLeft,
    totalRowSize,
    onMouseMove,
    onCellClick,
    onTableLeave,
    onCellCopy,
    onColumnHeaderClick,
  } = props;

  const [measureLengths, setMeasureLengths] = useState<Map<string, number>>(
    () => new Map(),
  );
  const [rowDimensionLengths, setRowDimensionLengths] = useState<
    Map<string, number>
  >(() => new Map());
  const [hoveredColRange, setHoveredColRange] = useState<HoveredColRange | null>(
    null,
  );

  const resizingMeasureRef = useRef(false);
  const initialMeasureIndexOnResizeRef = useRef(0);
  const initLengthOnResizeRef = useRef(0);
  const initScrollOnResizeRef = useRef(0);
  const percentOfChangeDuringResizeRef = useRef(0);

  const hasCrossSelection = clickSelection?.hasCrossSelection ?? false;

  const selectedColIndices = useMemo(
    () => computeSelectedColIndices(clickSelection, headerGroups),
    [clickSelection, headerGroups],
  );
  const cellSelectedColIndices = useMemo(
    () => computeCellSelectedColIndices(clickSelection, headerGroups),
    [clickSelection, headerGroups],
  );
  const rowDimensionNames = useMemo(
    () => rowDimensions.map((d) => d.name),
    [rowDimensions],
  );
  const cellSelectedColDimGroupIndices = useMemo(
    () => computeCellSelectedColDimGroupIndices(clickSelection, headerGroups, rowDimensionNames),
    [clickSelection, headerGroups, rowDimensionNames],
  );
  const ancestorRowIdsOfSelectedHeaders = useMemo(
    () => computeAncestorRowIds(clickSelection, rows, rowDimensionNames),
    [clickSelection, rows, rowDimensionNames],
  );

  const hasRowDimension = rowDimensions.length > 0;
  const hasExpandableRows = rowDimensions.length > 1;
  const hasMeasures = measures.length > 0;
  const rowDimensionLabel = getRowNestedLabel(rowDimensions);
  const rowDimensionName = rowDimensionLabel ? rowDimensionLabel : null;
  const rowDimensionWidthKey = getNestedRowDimensionWidthKey(
    widthScopeKey,
    rowDimensions,
  );

  // Initialize row-dimension width once.
  useEffect(() => {
    if (
      hasRowDimension &&
      rowDimensionName &&
      rowDimensionWidthKey &&
      !rowDimensionLengths.has(rowDimensionWidthKey)
    ) {
      const estimatedWidth = calculateRowDimensionWidth(
        rowDimensionName,
        timeDimension,
        dataRows,
      );
      setRowDimensionLengths((prev) => {
        const next = new Map(prev);
        next.set(rowDimensionWidthKey, estimatedWidth);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRowDimension, rowDimensionName, rowDimensionWidthKey, timeDimension, dataRows]);

  const baseRowDimensionWidth =
    (rowDimensionWidthKey && rowDimensionLengths.get(rowDimensionWidthKey)) || 0;

  // Initialize measure widths (using the longest column-dimension header).
  useEffect(() => {
    const maxColumnDimensionHeader = getMaxColumnDimensionHeader(
      hasColumnDimension,
      headerGroups,
    );
    measures.forEach(({ name, label, formatter }) => {
      if (!measureLengths.has(name)) {
        const estimatedWidth = calculateMeasureWidth(
          name,
          label,
          formatter,
          totalsRow,
          dataRows,
          hasColumnDimension ? maxColumnDimensionHeader : undefined,
        );
        setMeasureLengths((prev) => {
          if (prev.has(name)) return prev;
          const next = new Map(prev);
          next.set(name, estimatedWidth);
          return next;
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measures, headerGroups, totalsRow, dataRows, hasColumnDimension]);

  const measureCount = measures.length;

  function getCellFormatting(
    cell: Cell<PivotDataRow, unknown>,
    isTotalsRow: boolean,
  ): { background: string; color: string } | null {
    if (isTotalsRow) return null;
    const meta = cell.column.columnDef.meta as {
      conditionalFormat?: unknown;
      isRowTotal?: boolean;
      measureName?: string;
    };
    if (!meta?.conditionalFormat || meta.isRowTotal || !meta.measureName) {
      return null;
    }
    const formatter = cellFormatters.get(meta.measureName);
    if (!formatter) return null;
    const value = cell.getValue();
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return formatter(value);
  }

  const subHeaders: MeasureGroup[] = [
    {
      subHeaders: measures.map((m) => ({
        column: { columnDef: { name: m.name } },
      })),
    },
  ];

  const measureGroups: MeasureGroup[] =
    headerGroups[headerGroups.length - 2]?.headers?.slice(
      hasRowDimension ? 1 : 0,
    ) as unknown as MeasureGroup[] ?? subHeaders;

  const measureGroupsLength = measureGroups.length;
  const visibleMeasureColumns = measureGroups.flatMap(({ subHeaders }) =>
    subHeaders.map(({ column: { columnDef: { name } } }) => ({ name })),
  );

  const displayColumnWidths = useMemo(
    () =>
      fillWidth
        ? distributeColumnWidthsToFillContainer(
            [
              ...(hasRowDimension
                ? [{ width: baseRowDimensionWidth, role: "dimension" as const }]
                : []),
              ...visibleMeasureColumns.map(({ name }) => ({
                width: measureLengths.get(name) ?? WIDTHS.INIT_MEASURE_WIDTH,
                role: "measure" as const,
              })),
            ],
            containerWidth,
          )
        : [
            ...(hasRowDimension ? [baseRowDimensionWidth] : []),
            ...visibleMeasureColumns.map(
              ({ name }) => measureLengths.get(name) ?? WIDTHS.INIT_MEASURE_WIDTH,
            ),
          ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fillWidth, containerWidth, hasRowDimension, baseRowDimensionWidth, visibleMeasureColumns, measureLengths],
  );

  const displayRowDimensionWidth = hasRowDimension
    ? (displayColumnWidths[0] ?? baseRowDimensionWidth)
    : 0;

  const displayMeasureWidths = useMemo(
    () =>
      new Map(
        visibleMeasureColumns.map(({ name }, i) => {
          const offset = hasRowDimension ? 1 : 0;
          return [
            name,
            displayColumnWidths[i + offset] ??
              measureLengths.get(name) ??
              WIDTHS.INIT_MEASURE_WIDTH,
          ];
        }),
      ),
    [visibleMeasureColumns, displayColumnWidths, hasRowDimension, measureLengths],
  );

  const totalMeasureWidth = useMemo(
    () =>
      measures.reduce(
        (acc, { name }) =>
          acc +
          (displayMeasureWidths.get(name) ??
            measureLengths.get(name) ??
            WIDTHS.INIT_MEASURE_WIDTH),
        0,
      ),
    [measures, displayMeasureWidths, measureLengths],
  );

  const totalLength = measureGroupsLength * totalMeasureWidth;

  function isMeasureColumn(header: HeaderGroup<PivotDataRow>["headers"][number], colNumber: number) {
    if (header.depth !== headerGroups.length) return;
    if (!rowDimensionName) return true;
    return colNumber > 0;
  }

  function onResizeStart(e: MouseEvent) {
    initLengthOnResizeRef.current = totalLength;
    initScrollOnResizeRef.current = scrollLeft;

    const offset =
      e.clientX -
      containerRefElement.current!.getBoundingClientRect().left -
      displayRowDimensionWidth -
      measures.reduce((rollingSum, { name }, i) => {
        return i <= initialMeasureIndexOnResizeRef.current
          ? rollingSum +
              (displayMeasureWidths.get(name) ?? measureLengths.get(name) ?? 0)
          : rollingSum;
      }, 0) +
      4;

    percentOfChangeDuringResizeRef.current = (scrollLeft + offset) / totalLength;
  }

  function isCellActive(rowId: string, columnId: string) {
    return rowId === activeCell?.rowId && columnId === activeCell?.columnId;
  }

  function shouldShowHeaderRightBorder(header: unknown, index: number): boolean {
    const isMeasure = isMeasureColumn(header as never, index);
    if (!isMeasure) return true;
    let offset = 0;
    if (!hasRowDimension) offset = 1;
    return (index + offset) % measureCount === 0 && index > 0;
  }

  function getMaxColumnDimensionHeader(
    hasColumnDimension: boolean,
    headerGroups: HeaderGroup<PivotDataRow>[],
  ): string {
    if (!hasColumnDimension || headerGroups.length === 0) return "";
    const colDimensionHeaderGroup =
      headerGroups.length >= 2
        ? headerGroups[headerGroups.length - 2]
        : undefined;
    if (!colDimensionHeaderGroup?.headers) return "";
    return colDimensionHeaderGroup.headers.reduce((longest, header) => {
      const headerText = String(header.column?.columnDef?.header ?? "");
      return headerText.length > longest.length ? headerText : longest;
    }, "");
  }

  function shouldShowRightBorder(index: number): boolean {
    let offset = 0;
    if (!hasRowDimension) offset = 1;
    return (index + offset) % measureCount === 0;
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

  const totalHeaderHeight = headerGroups.length * HEADER_HEIGHT;

  return (
    <PivotAssembledContext.Provider value={assembled}>
      <div
        className="w-full absolute top-0 z-50 flex pointer-events-none"
        style={{
          width: `${totalLength + displayRowDimensionWidth}px`,
          height: `${totalRowSize + totalHeaderHeight + headerGroups.length}px`,
        }}
      >
        <div
          style={{ width: `${displayRowDimensionWidth}px` }}
          className="sticky left-0 flex-none flex"
        >
          <Resizer
            side="right"
            direction="EW"
            min={WIDTHS.MIN_COL_WIDTH}
            max={WIDTHS.MAX_COL_WIDTH}
            dimension={baseRowDimensionWidth}
            onUpdate={(d: number) => {
              if (!rowDimensionWidthKey) return;
              setRowDimensionLengths((prev) => {
                const next = new Map(prev);
                next.set(rowDimensionWidthKey, d);
                return next;
              });
            }}
            onMouseDown={(e) => {
              resizingMeasureRef.current = false;
              onResizeStart(e);
            }}
            onMouseUp={() => {
              resizingMeasureRef.current = false;
            }}
          >
            <div className="resize-bar"></div>
          </Resizer>
        </div>

        {measureGroups.map(({ subHeaders }, groupIndex) => (
          <div key={groupIndex} className="h-full z-50 flex" style={{ width: `${totalMeasureWidth}px` }}>
            {subHeaders.map(({ column: { columnDef: { name } } }, i) => {
              const baseLength =
                measureLengths.get(name) ?? WIDTHS.INIT_MEASURE_WIDTH;
              const length = displayMeasureWidths.get(name) ?? baseLength;
              const last =
                i === subHeaders.length - 1 &&
                groupIndex === measureGroups.length - 1;
              return (
                <div key={name} style={{ width: `${length}px` }} className="h-full relative">
                  <Resizer
                    side="right"
                    direction="EW"
                    min={WIDTHS.MIN_MEASURE_WIDTH}
                    max={WIDTHS.MAX_MEASURE_WIDTH}
                    dimension={baseLength}
                    justify={last ? "end" : "center"}
                    hang={!last}
                    onUpdate={(d: number) =>
                      setMeasureLengths((prev) => {
                        const next = new Map(prev);
                        next.set(name, d);
                        return next;
                      })
                    }
                    onMouseDown={(e) => {
                      resizingMeasureRef.current = true;
                      initialMeasureIndexOnResizeRef.current = i;
                      onResizeStart(e);
                    }}
                    onMouseUp={() => {
                      resizingMeasureRef.current = false;
                    }}
                  >
                    <div className="resize-bar"></div>
                  </Resizer>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <table
        className={[
          hasRowDimension ? "with-row-dimension" : "",
          hasColumnDimension ? "with-col-dimension" : "",
          hasExpandableRows ? "with-expandable-rows" : "",
          !!totalsRow ? "with-totals-row" : "",
          hasMeasures ? "with-measures" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="presentation"
        style={{ width: `${totalLength + displayRowDimensionWidth}px` }}
        onClick={(e) => (e.shiftKey ? onCellCopy(e) : onCellClick(e))}
        onMouseMove={onMouseMove}
        onMouseLeave={() => {
          setHoveredColRange(null);
          onTableLeave();
        }}
      >
        <colgroup>
          {rowDimensionName && displayRowDimensionWidth ? (
            <col
              style={{
                width: `${displayRowDimensionWidth}px`,
                maxWidth: `${displayRowDimensionWidth}px`,
              }}
            />
          ) : null}
          {measureGroups.map(({ subHeaders }, i) => (
            <FragmentColGroup key={i} subHeaders={subHeaders} displayMeasureWidths={displayMeasureWidths} measureLengths={measureLengths} />
          ))}
        </colgroup>

        <thead>
          {headerGroups.map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, i) => {
                const sortDirection = header.column.getIsSorted();
                const dimMeta = header.column.columnDef.meta as {
                  icon?: unknown;
                  dimensionPath?: Record<string, string>;
                  description?: string;
                };
                const icon = dimMeta?.icon;
                const isColDimHeader =
                  !header.isPlaceholder && !!dimMeta?.dimensionPath;
                const colStart = headerGroup.headers
                  .slice(0, i)
                  .reduce((sum, h) => sum + h.colSpan, 0);
                const inHoverRange = isHeaderInHoveredRange(
                  colStart,
                  header.colSpan,
                  hoveredColRange,
                );
                const isSelfSelected =
                  isColDimHeader &&
                  !!dimMeta.dimensionPath &&
                  (clickSelection?.isColumnHeaderSelected(dimMeta.dimensionPath) ??
                    false);
                const hs = nestedHeaderState({
                  isTheHoveredHeader:
                    inHoverRange &&
                    isHoveredHeader(colStart, header.colSpan, hoveredColRange),
                  inHoverRange,
                  isSelfSelected,
                  inSelectedRange: isInSelectedColRange(
                    colStart,
                    header.colSpan,
                    isSelfSelected,
                    selectedColIndices,
                  ),
                  inCellSelectedCol: isInCellSelectedColRange(
                    colStart,
                    header.colSpan,
                    cellSelectedColIndices,
                  ),
                  isAncestorOfSelected:
                    isColDimHeader &&
                    !isSelfSelected &&
                    !!dimMeta.dimensionPath &&
                    (clickSelection?.isAncestorOfSelectedColumnHeader(
                      dimMeta.dimensionPath,
                    ) ?? false),
                });
                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className={[
                      hs.colDimHoverSelf ? "col-dim-hover-self" : "",
                      hs.colDimHoverChild ? "col-dim-hover-child" : "",
                      hs.selectedColHeader ? "selected-col-header" : "",
                      hs.inSelectedColRange ? "in-selected-col-range" : "",
                      hs.cellSelectedColHeader ? "cell-selected-col-header" : "",
                      hs.ancestorSelectedColHeader ? "ancestor-selected-col-header" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseEnter={() => {
                      if (isColDimHeader) {
                        setHoveredColRange({
                          start: colStart,
                          size: header.colSpan,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredColRange(null)}
                  >
                    <button
                      className={[
                        "header-cell",
                        header.column.getCanSort() ||
                        (isColDimHeader && !!onColumnHeaderClick)
                          ? "cursor-pointer"
                          : "",
                        header.column.getCanSort() ? "select-none" : "",
                        isMeasureColumn(header, i) ? "flex-row-reverse" : "",
                        shouldShowHeaderRightBorder(header, i) ? "border-r" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={(e) => {
                        if (isColDimHeader && onColumnHeaderClick) {
                          onColumnHeaderClick(dimMeta.dimensionPath ?? {});
                        } else {
                          header.column.getToggleSortingHandler()?.(e);
                        }
                      }}
                    >
                      {!header.isPlaceholder ? (
                        <>
                          {icon ? (
                            <span>{renderIcon(icon)}</span>
                          ) : !dimMeta?.dimensionPath &&
                            header.column.columnDef.header ? (
                            <PivotHeaderLabel
                              label={String(header.column.columnDef.header)}
                              description={dimMeta?.description}
                            />
                          ) : (
                            <p className="truncate">
                              {header.column.columnDef.header as ReactNode}
                            </p>
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
            const dk =
              row.depth > 0
                ? nestedDimKeyFromRow(row, rowDimensionNames)
                : dimKeyFromRow(rowData, rowDimensionNames);
            const isTotalsRow = !!totalsRow && rowId === "0";
            const filterSelected =
              rowSelectionState?.isRowSelected(
                rowData,
                row.depth,
                row.getParentRows().map((r) => r.original),
              ) ?? false;
            const isRowHeaderSelected =
              clickSelection?.isRowHeaderSelected(dk) ?? false;
            const hasClickedCell =
              clickSelection?.hasSelectedCellInRow(dk) ?? false;
            const isSelected =
              row.depth > 0 && clickSelection?.hasAnySelection
                ? filterSelected && (isRowHeaderSelected || hasClickedCell)
                : filterSelected;
            const isAncestorOfSelectedHeader =
              ancestorRowIdsOfSelectedHeaders.has(rowId);
            const isShowMore = isShowMoreRow(row);
            const rs = nestedRowState({
              isSelected,
              hasSelection: rowSelectionState?.hasActiveSelection ?? false,
              isRowHeaderSelected,
              hasClickedCell,
              hasCrossSelection,
              isAncestorOfSelectedHeader,
              isShowMore,
            });
            return (
              <tr
                key={rowId}
                className={[
                  rs.showMoreRow ? "show-more-row" : "",
                  rs.selectedRow ? "selected-row" : "",
                  rs.dimmedRow ? "dimmed-row" : "",
                  rs.ancestorOfSelectedRow ? "ancestor-of-selected-row" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {cells.map((cell, i) => {
                  const cs = nestedCellState({
                    isActive: isCellActive(cell.row.id, cell.column.id),
                    isClicked:
                      clickSelection?.isCellSelected(dk, cell.column.id) ?? false,
                    cellIndex: i,
                    hasClickedCell,
                    inHoveredCol: isHeaderInHoveredRange(i, 1, hoveredColRange),
                    inSelectedCol: selectedColIndices.has(i),
                    inCellSelectedColDimGroup: cellSelectedColDimGroupIndices.has(i),
                    isRowHeaderSelected,
                    hasCrossSelection,
                    isAncestorOfSelectedHeader,
                    isTotalsRow,
                    isShowMore,
                    canShowDataViewer,
                    enableClickToFilter,
                  });
                  const tooltipValue = (() => {
                    const tf = (cell.column.columnDef.meta as {
                      tooltipFormatter?: (v: unknown) => string | null | undefined;
                    })?.tooltipFormatter;
                    return tf ? tf(cell.getValue()) : cell.getValue();
                  })();
                  const cellFmt = getCellFormatting(cell, isTotalsRow);
                  return (
                    <td
                      key={cell.id}
                      className={[
                        "ui-copy-number cell truncate group/cell",
                        cellFmt !== null ? "has-conditional-format" : "",
                        cs.activeCell ? "active-cell" : "",
                        cs.selectedCell ? "selected-cell" : "",
                        cs.colDimHoverBody ? "col-dim-hover-body" : "",
                        cs.selectedColBody ? "selected-col-body" : "",
                        cs.cellSelectedColDimGroupBody
                          ? "cell-selected-col-dim-group-body"
                          : "",
                        cs.outOfGroupRowCell ? "out-of-group-row-cell" : "",
                        cs.cellSelectedRowHeader ? "cell-selected-row-header" : "",
                        cs.crossIntersection ? "cross-intersection" : "",
                        cs.crossRowArm ? "cross-row-arm" : "",
                        cs.crossColArm ? "cross-col-arm" : "",
                        cs.partialAggregateCell ? "partial-aggregate-cell" : "",
                        cs.crossSelectedRowHeader ? "cross-selected-row-header" : "",
                        cs.interactiveCell ? "interactive-cell" : "",
                        shouldShowRightBorder(i) ? "border-r" : "",
                        i > 0 && i <= measureCount ? "totals-column" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={
                        {
                          "--cf-bg": cellFmt?.background ?? null,
                          "--cf-color": cellFmt?.color ?? null,
                        } as CSSProperties
                      }
                      data-value={tooltipValue}
                      data-rowid={cell.row.id}
                      data-columnid={cell.column.id}
                      data-rowheader={i === 0 || undefined}
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

function FragmentColGroup({
  subHeaders,
  displayMeasureWidths,
  measureLengths,
}: {
  subHeaders: MeasureGroupSubHeader[];
  displayMeasureWidths: Map<string, number>;
  measureLengths: Map<string, number>;
}) {
  return (
    <>
      {subHeaders.map(({ column: { columnDef: { name } } }) => {
        const length =
          displayMeasureWidths.get(name) ??
          measureLengths.get(name) ??
          WIDTHS.INIT_MEASURE_WIDTH;
        return <col key={name} style={{ width: `${length}px`, maxWidth: `${length}px` }} />;
      })}
    </>
  );
}
