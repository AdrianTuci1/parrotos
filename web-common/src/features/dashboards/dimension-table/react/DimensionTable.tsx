/**
 * React translation of `features/dashboards/dimension-table/DimensionTable.svelte`
 * (Phase 2.3-iii: dimension detail table).
 *
 * Keep faithful to the Svelte view:
 * - The `@tanstack/svelte-virtual` `createVirtualizer` row/column virtualizers are
 *   re-expressed with a self-contained `useVirtualizer` hook (no react-virtual
 *   dependency in web-common), which mirrors the getScrollElement / estimateSize
 *   / getItemKey / paddingStart / overscan / initialOffset semantics.
 * - Framework-agnostic logic is reused by importing it: `estimateColumnCharacterWidths`,
 *   `estimateColumnSizes` (dimension-table-utils), `DIMENSION_TABLE_CONFIG`,
 *   `dimension-table-types`, and `virtualized-table/types`. It is not rewritten.
 * - Svelte store values (`selectedValues`, `sortByMeasure`, the exclude-mode and
 *   compare stores) are read through the `useReadable()` bridge.
 * - The Svelte-context `getStateManagers()` actions/selectors (dimension-table
 *   header click, toggle comparison, isFilterExcludeMode, isBeingCompared,
 *   dimension-value sort) are surfaced as props, matching the Leaderboard port.
 *
 * Deferred (documented runtime checks): the scoped `<style>` blocks are not
 * transferred (Tailwind utilities + PRIMITIVE DOM are kept); the
 * `onblur`/`in:fly` entrance transitions are dropped; the config `columnHeaderHeight`
 * mutation is applied to a local copy rather than the shared module config.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Readable } from "svelte/store";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import type { VirtualizedTableColumns } from "@rilldata/web-common/components/virtualized-table/types";
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import { DelayedSpinner } from "@rilldata/web-common/features/dashboards/leaderboard/react/primitives";
import type { DimensionTableRow } from "../dimension-table-types";
import {
  estimateColumnCharacterWidths,
  estimateColumnSizes,
} from "../dimension-table-utils";
import { DIMENSION_TABLE_CONFIG as config } from "../DimensionTableConfig";
import { DimensionTableContext } from "./context";
import { useVirtualizer } from "./useVirtualizer";
import { ColumnHeaders } from "./ColumnHeaders";
import { TableCells } from "./TableCells";
import { DimensionFilterGutter } from "./DimensionFilterGutter";
import { DimensionValueHeader } from "./DimensionValueHeader";

const CHARACTER_LIMIT_FOR_WRAPPING = 9;
const FILTER_COLUMN_WIDTH = config.indexWidth;

/** The `selectedDimensionValues` store value shape (see selectors/dimension-filters.ts). */
export interface SelectedValuesState {
  isFetching?: boolean;
  isLoading?: boolean;
  error?: unknown;
  data?: string[];
}

export interface DimensionTableProps {
  rows: DimensionTableRow[];
  columns: VirtualizedTableColumns[];
  /** Svelte store produced by `selectedDimensionValues`; read via `useReadable`. */
  selectedValues?: Readable<SelectedValuesState> | undefined;
  dimensionName: string;
  isFetching: boolean;
  onSelectItem?: (data: { index: number; meta: boolean }) => void;
  /** The `sortByMeasure` selector store (read via `useReadable`). */
  sortByMeasure?: Readable<string | null> | undefined;
  /** Store-factory for the `isFilterExcludeMode` selector, keyed by dimension. */
  isFilterExcludeMode?: (dimensionName: string) => Readable<boolean> | undefined;
  /** Store-factory for the `isBeingCompared` selector, keyed by dimension. */
  isBeingCompared?: (dimensionName: string) => Readable<boolean> | undefined;
  /** `dimensionTable.handleDimensionMeasureColumnHeaderClick` action. */
  handleDimensionMeasureColumnHeaderClick?: (columnName: string) => void;
  /** `comparison.toggleComparisonDimension` action. */
  toggleComparisonDimension?: (dimensionName: string) => void;
  /** Dimension-value sort state (from the `sorting` selectors). */
  sortedByDimensionValue?: boolean;
  sortedAscending?: boolean;
  onSortByDimensionValue?: () => void;
  rowOverscanAmount?: number;
  columnOverscanAmount?: number;
}

export default function DimensionTable({
  rows,
  columns,
  selectedValues = undefined,
  dimensionName,
  isFetching,
  onSelectItem = () => {},
  sortByMeasure: sortByMeasureStore = undefined,
  isFilterExcludeMode,
  isBeingCompared,
  handleDimensionMeasureColumnHeaderClick = () => {},
  toggleComparisonDimension = () => {},
  sortedByDimensionValue = false,
  sortedAscending = false,
  onSortByDimensionValue = () => {},
  rowOverscanAmount = 120,
  columnOverscanAmount = 12,
}: DimensionTableProps) {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [manualDimensionColumnWidth, setManualDimensionColumnWidth] = useState<
    number | null
  >(null);
  const [activeIndex, setActiveIndexState] = useState<number | false>(false);
  const [scrolling, setScrolling] = useState(false);
  const [horizontalScrolling, setHorizontalScrolling] = useState(false);
  const scrollingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const containerRef = useCallback(
    (el: HTMLDivElement | null) => setContainerEl((prev) => (prev === el ? prev : el)),
    [],
  );

  useEffect(() => {
    if (!containerEl) return;
    const update = () => setContainerWidth(containerEl.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(containerEl);
    return () => observer.disconnect();
  }, [containerEl]);

  useEffect(
    () => () => {
      if (scrollingTimeout.current) clearTimeout(scrollingTimeout.current);
    },
    [],
  );

  // ── Svelte store reads (useReadable bridge) ───────────────────────────────
  const selectedValuesState = useReadable(selectedValues);
  const sortByMeasure = useReadable(sortByMeasureStore) ?? null;
  const excludeModeStore = useMemo(
    () => isFilterExcludeMode?.(dimensionName),
    [isFilterExcludeMode, dimensionName],
  );
  const excludeMode = useReadable(excludeModeStore) ?? false;
  const isBeingComparedStore = useMemo(
    () => isBeingCompared?.(dimensionName),
    [isBeingCompared, dimensionName],
  );
  const isBeingCompared = useReadable(isBeingComparedStore) ?? false;

  // ── Column geometry (framework-agnostic, reused verbatim) ────────────────
  const { columnWidths, largestColumnLength } = useMemo(
    () => estimateColumnCharacterWidths(columns, rows),
    [columns, rows],
  );

  const tableConfig = useMemo(
    () => ({
      ...config,
      columnHeaderHeight:
        largestColumnLength > CHARACTER_LIMIT_FOR_WRAPPING ? 46 : config.columnHeaderHeight,
    }),
    [largestColumnLength],
  );

  const estimateColumnSize = useMemo(() => {
    if (!rows.length || !columns.length) return [];
    const sizes = estimateColumnSizes(columns, columnWidths, rows, containerWidth, config);
    if (manualDimensionColumnWidth !== null && sizes.length > 0) {
      sizes[0] = manualDimensionColumnWidth;
    }
    return sizes;
  }, [columns, columnWidths, rows, containerWidth, manualDimensionColumnWidth]);

  const dimensionColumn = useMemo(
    () => columns?.find((c) => c.name === dimensionName),
    [columns, dimensionName],
  );
  const measureColumns = useMemo(
    () => columns?.filter((c) => c.name !== dimensionName) ?? [],
    [columns, dimensionName],
  );

  const selectedIndex = useMemo(
    () =>
      selectedValuesState?.data?.map((label) =>
        rows.findIndex((row) => row[dimensionName] === label),
      ) ?? [],
    [selectedValuesState, rows, dimensionName],
  );

  // ── Virtualizers (self-contained row/column windowing) ────────────────────
  const getRowSize = useCallback(() => tableConfig.rowHeight, [tableConfig.rowHeight]);
  const getRowKey = useCallback(
    (i: number) => String(rows?.[i]?.[dimensionName] ?? i),
    [rows, dimensionName],
  );
  const getColumnSize = useCallback(
    (i: number) => estimateColumnSize[i + 1] ?? config.defaultColumnWidth,
    [estimateColumnSize],
  );
  const getColumnKey = useCallback((i: number) => measureColumns[i]?.name ?? String(i), [
    measureColumns,
  ]);

  const rowVirtualizer = useVirtualizer({
    scrollElement: containerEl,
    count: rows.length,
    getSize: getRowSize,
    paddingStart: tableConfig.columnHeaderHeight,
    overscan: rowOverscanAmount,
    getItemKey: getRowKey,
  });

  const columnVirtualizer = useVirtualizer({
    scrollElement: containerEl,
    count: measureColumns.length,
    horizontal: true,
    getSize: getColumnSize,
    paddingStart: (estimateColumnSize[0] ?? config.defaultColumnWidth) + FILTER_COLUMN_WIDTH,
    overscan: columnOverscanAmount,
    getItemKey: getColumnKey,
  });

  const virtualRows = rowVirtualizer.virtualItems;
  const virtualHeight = rowVirtualizer.totalSize;
  const virtualColumns = columnVirtualizer.virtualItems;
  const virtualWidth = columnVirtualizer.totalSize;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const setActiveIndex = useCallback((index: number) => setActiveIndexState(index), []);
  const clearActiveIndex = useCallback(() => setActiveIndexState(false), []);

  const handleScroll = useCallback(() => {
    setHorizontalScrolling((containerEl?.scrollLeft ?? 0) > 0);
    if (scrollingTimeout.current) clearTimeout(scrollingTimeout.current);
    setScrolling(true);
    scrollingTimeout.current = setTimeout(() => setScrolling(false), 200);
  }, [containerEl]);

  const onSelectItemHandler = useCallback(
    (data: { index: number; meta: boolean }) => onSelectItem(data),
    [onSelectItem],
  );

  const handleColumnHeaderClick = useCallback(
    (columnName: string) => handleDimensionMeasureColumnHeaderClick(columnName),
    [handleDimensionMeasureColumnHeaderClick],
  );

  const handleResizeDimensionColumn = useCallback(
    (size: number) => setManualDimensionColumnWidth(Math.max(config.minColumnWidth, size)),
    [],
  );

  return (
    <DimensionTableContext.Provider value={tableConfig}>
      <div
        style={{ height: "100%" }}
        role="table"
        className="relative"
        aria-label={m.dashboard_dimension_table_aria()}
      >
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{ width: "100%", height: "100%", gridTemplateColumns: "max-content auto" }}
          className="overflow-auto grid max-w-fit"
        >
          <div
            role="grid"
            tabIndex={0}
            className="relative"
            onMouseLeave={clearActiveIndex}
            onBlur={clearActiveIndex}
            style={{
              willChange: "transform, contents",
              contain: "content",
              width: `${virtualWidth}px`,
              height: `${virtualHeight}px`,
            }}
          >
            <ColumnHeaders
              virtualColumnItems={virtualColumns}
              noPin
              sortByMeasure={sortByMeasure}
              columns={measureColumns}
              onClickColumn={handleColumnHeaderClick}
            />
            <div className="flex">
              <DimensionFilterGutter
                virtualRowItems={virtualRows}
                totalHeight={virtualHeight}
                selectedIndex={selectedIndex}
                isBeingCompared={isBeingCompared}
                excludeMode={excludeMode}
                dimensionName={dimensionName}
                toggleComparisonDimension={toggleComparisonDimension}
              />
              {dimensionColumn ? (
                <DimensionValueHeader
                  virtualRowItems={virtualRows}
                  totalHeight={virtualHeight}
                  width={estimateColumnSize[0]}
                  column={dimensionColumn}
                  rows={rows}
                  activeIndex={activeIndex}
                  selectedIndex={selectedIndex}
                  excludeMode={excludeMode}
                  scrolling={scrolling}
                  horizontalScrolling={horizontalScrolling}
                  sortedByDimensionValue={sortedByDimensionValue}
                  sortedAscending={sortedAscending}
                  onSortByDimensionValue={onSortByDimensionValue}
                  onSelectItem={onSelectItemHandler}
                  onInspect={setActiveIndex}
                  onResizeColumn={handleResizeDimensionColumn}
                />
              ) : null}
            </div>
            {rows.length ? (
              <TableCells
                virtualColumnItems={virtualColumns}
                virtualRowItems={virtualRows}
                columns={measureColumns}
                rows={rows}
                activeIndex={activeIndex}
                selectedIndex={selectedIndex}
                scrolling={scrolling}
                excludeMode={excludeMode}
                onSelectItem={onSelectItemHandler}
                onInspect={setActiveIndex}
                cellLabel={m.dashboard_filter_dimension_value()}
              />
            ) : null}
          </div>
        </div>
        {!rows.length ? (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ paddingTop: `${tableConfig.columnHeaderHeight}px` }}
          >
            {isFetching || selectedValuesState?.isFetching ? (
              <DelayedSpinner isLoading size="24px" />
            ) : (
              <span className="text-fg-secondary">
                {m.dashboard_no_results_to_show()}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </DimensionTableContext.Provider>
  );
}
