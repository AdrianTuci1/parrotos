import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import {
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ExpandedState,
  type Row,
  type SortingState,
} from "@tanstack/react-table";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import { FlatTable } from "@rilldata/web-common/features/dashboards/pivot/react/FlatTable";
import { NestedTable } from "@rilldata/web-common/features/dashboards/pivot/react/NestedTable";
import { VirtualTooltip } from "@rilldata/web-common/features/dashboards/pivot/react/VirtualTooltip";
import {
  getDimensionColumnProps,
  getMeasureColumnProps,
  getColumnDefForPivot,
} from "@rilldata/web-common/features/dashboards/pivot/react/pivot-column-definition";
import {
  getNextRowLimit,
  SHOW_MORE_BUTTON,
} from "@rilldata/web-common/features/dashboards/pivot/pivot-constants";
import { NUM_ROWS_PER_PAGE } from "@rilldata/web-common/features/dashboards/pivot/pivot-infinite-scroll";
import { isElement, isShowMoreRow, splitPivotChips } from "@rilldata/web-common/features/dashboards/pivot/pivot-utils";
import { copyToClipboard } from "@rilldata/web-common/lib/actions/copy-to-clipboard";
import {
  computeMeasureDomains,
  makeCellFormatter,
  type CellFormatter,
} from "@rilldata/web-common/features/dashboards/pivot/pivot-conditional-formatting";
import type {
  PivotClickSelectionState,
} from "@rilldata/web-common/features/dashboards/pivot/pivot-click-selection";
import type { PivotRowSelectionState } from "@rilldata/web-common/features/dashboards/pivot/pivot-row-selection";
import type {
  PivotDataRow,
  PivotDataStore,
  PivotDataStoreConfig,
  PivotState,
} from "@rilldata/web-common/features/dashboards/pivot/types";

// Distance threshold (in pixels) for triggering data fetch
const ROW_THRESHOLD = 200;
const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 30;

type HoveringData = {
  value: string | number | null;
  rowHeader: boolean;
};

export interface PivotTableProps {
  pivotDataStore: PivotDataStore;
  widthScopeKey: string;
  config: import("svelte/store").Readable<PivotDataStoreConfig>;
  pivotState: import("svelte/store").Readable<PivotState>;
  canShowDataViewer?: boolean;
  border?: boolean;
  overscan?: number;
  rounded?: boolean;
  fillWidth?: boolean;
  setPivotExpanded: (expanded: ExpandedState) => void;
  setPivotSort: (sorting: SortingState) => void;
  setPivotRowPage: (page: number) => void;
  setPivotActiveCell?: ((rowId: string, columnId: string) => void) | undefined;
  setPivotOutermostRowLimit?: ((limit: number) => void) | undefined;
  setPivotRowLimitForExpanded?:
    | ((expandIndex: string, limit: number) => void)
    | undefined;
  onCellClickToFilter?:
    | ((
        rowId: string,
        columnId: string,
        isRowHeader: boolean,
        rowData: PivotDataRow,
      ) => void)
    | undefined;
  onColumnHeaderClick?:
    | ((dimensionPath: Record<string, string>) => void)
    | undefined;
  enableClickToFilter?: boolean;
  rowSelectionState?: PivotRowSelectionState | undefined;
  clickSelection?: PivotClickSelectionState | undefined;
}

/**
 * React translation of PivotTable.svelte: a virtualized TanStack table for
 * pivot/dimension data. Flat and nested (grouped) layouts are delegated to
 * the FlatTable / NestedTable React renderers. All framework-agnostic
 * helpers (pivot-utils, pivot-conditional-formatting, pivot-constants,
 * pivot-infinite-scroll, column-definition helpers) are imported verbatim.
 */
export function PivotTable(props: PivotTableProps) {
  const {
    pivotDataStore,
    widthScopeKey,
    config: configStore,
    pivotState: pivotStateStore,
    canShowDataViewer = false,
    border = true,
    overscan = 20,
    rounded = true,
    fillWidth = false,
    setPivotExpanded,
    setPivotSort,
    setPivotRowPage,
    setPivotActiveCell,
    setPivotOutermostRowLimit,
    setPivotRowLimitForExpanded,
    onCellClickToFilter,
    onColumnHeaderClick,
    enableClickToFilter = false,
    rowSelectionState,
    clickSelection,
  } = props;

  // Bridge Svelte readable stores into React.
  const config = useReadable(configStore);
  const pivotState = useReadable(pivotStateStore);
  const pivotData = useReadable(pivotDataStore);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const timeDimension = config?.time.timeDimension;
  const hasColumnDimension = useMemo(
    () =>
      pivotState ? splitPivotChips(pivotState.columns).dimension.length > 0 : false,
    [pivotState],
  );
  const reachedEndForRows = !!pivotData?.reachedEndForRowData;
  const assembled = pivotData?.assembled ?? false;
  const dataRows = pivotData?.data ?? [];
  const totalsRow = pivotData?.totalsRowData;
  const isFlat = config?.isFlat;
  const hasMeasureContextColumns = config?.enableComparison;

  const measures = useMemo(
    () => (config ? getMeasureColumnProps(config) : []),
    [config],
  );
  const rowDimensions = useMemo(
    () => (config ? getDimensionColumnProps(config.rowDimensionNames, config) : []),
    [config],
  );

  const tableData = useMemo(() => {
    let next = [...dataRows];
    if (totalsRow) {
      next = [totalsRow, ...dataRows];
    }
    return next;
  }, [dataRows, totalsRow]);

  const columns = useMemo(
    () => {
      if (!config || !pivotData) return [];
      // The Svelte data store always builds its own columnDef with the real
      // row totals (independent of whether the totals ROW is displayed) and
      // with the column axes sliced to the current column page. Mirror both:
      // an empty store columnDef means "no columns to render", and otherwise
      // recompute the React columnDef from those exact inputs so it matches
      // the store's. Passing `totalsRowData ?? {}` here would drop every leaf
      // measure column in the nested + colDimensions config when the totals
      // row is hidden, so the real column-def totals must be used instead.
      if (pivotData.columnDef.length === 0) return [];
      const totalsForColumnDef = pivotData.totalsRowDataForColumnDef;
      if (!totalsForColumnDef) return [];
      const axesForColumnDef =
        pivotData.columnDimensionAxesForColumnDef ??
        pivotData.columnDimensionAxes;
      return getColumnDefForPivot(config, axesForColumnDef, totalsForColumnDef);
    },
    [config, pivotData],
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      expanded: pivotState?.expanded ?? {},
      sorting: pivotState?.sorting ?? [],
    },
    onExpandedChange: (updater) => {
      const expanded =
        typeof updater === "function"
          ? updater(pivotState?.expanded ?? {})
          : updater;
      setPivotExpanded(expanded);
    },
    onSortingChange: (updater) => {
      const sorting =
        typeof updater === "function"
          ? updater(pivotState?.sorting ?? [])
          : updater;
      setPivotSort(sorting);
    },
    getSubRows: (row) => row.subRows,
    getExpandedRowModel: getExpandedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    enableSortingRemoval: false,
    enableExpanding: true,
  });

  const cellFormatters = useMemo(
    () =>
      buildCellFormatters(
        table.getRowModel().flatRows,
        config?.pivot.measureFormatting,
        !!totalsRow,
        config?.allMeasures ?? [],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, config, totalsRow],
  );

  const headerGroups = table.getHeaderGroups();
  const totalHeaderHeight = headerGroups.length * HEADER_HEIGHT;

  const rows = table.getRowModel().rows;

  const stickyRows = useMemo(() => (totalsRow ? [0] : []), [totalsRow]);
  const rowScrollOffsetRef = useRef(0);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan,
    initialOffset: rowScrollOffsetRef.current,
    rangeExtractor: useCallback(
      (range) => {
        const next = new Set([...stickyRows, ...defaultRangeExtractor(range)]);
        return [...next].sort((a, b) => a - b);
      },
      [stickyRows],
    ),
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalRowSize = virtualizer.getTotalSize();
  const rowScrollOffset = virtualizer.scrollOffset ?? 0;
  rowScrollOffsetRef.current = rowScrollOffset;

  const [before, after] = virtualRows.length
    ? [
        (virtualRows[1]?.start ?? virtualRows[0].start) - ROW_HEIGHT,
        totalRowSize - virtualRows[virtualRows.length - 1].end,
      ]
    : [0, 0];

  // Track container width for fill-width column distribution.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const leftCellRef = useRef(true);
  const ignoreInitialTimeoutRef = useRef(false);
  const scrollLeftRef = useRef(0);
  const hoverPositionRef = useRef<DOMRect | null>(null);
  const [hovering, setHovering] = useState<HoveringData | null>(null);

  const clickToFilterEnabled = enableClickToFilter && !!onCellClickToFilter;

  function getCustomShortcuts(rowHeader: boolean) {
    if (clickToFilterEnabled) {
      return [
        { description: m.dashboard_filter_by_value(), shortcut: "Click" },
      ];
    }
    if (canShowDataViewer && !rowHeader) {
      return [
        {
          description: m.dashboard_view_raw_aggregated_data(),
          shortcut: "Click",
        },
      ];
    }
    return [];
  }

  const handleScroll = useCallback(
    (el?: HTMLDivElement | null) => {
      if (!el) return;
      setHovering(null);
      const { scrollHeight, scrollTop, clientHeight } = el;
      const bottomEndDistance = scrollHeight - scrollTop - clientHeight;
      scrollLeftRef.current = el.scrollLeft;

      const isReachingPageEnd = bottomEndDistance < ROW_THRESHOLD;
      const canFetchMoreData = !pivotData?.isFetching && !reachedEndForRows;
      const hasMoreDataThanOnePage = rows.length >= NUM_ROWS_PER_PAGE;

      if (isReachingPageEnd && hasMoreDataThanOnePage && canFetchMoreData) {
        setPivotRowPage((pivotState?.rowPage ?? 0) + 1);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pivotData, reachedEndForRows, rows.length, pivotState],
  );

  // Wait for layout to be calculated on mount (mirrors onMount + rAF).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      handleScroll(containerRef.current);
    });
    return () => cancelAnimationFrame(id);
  }, [handleScroll]);

  function onCellClick(e: MouseEvent) {
    if (!(e.target instanceof HTMLElement)) return;

    const td = e.target.closest("td");
    if (!td || !(td instanceof HTMLElement)) return;

    const rowId = td.dataset.rowid;
    const columnId = td.dataset.columnid;
    const rowHeader = td.dataset.rowheader === "true";

    if (rowId === undefined || columnId === undefined) return;

    const row = table.getRow(rowId);
    if (!row) return;

    // "Show More" rows only respond to a row-header click, which increases the
    // limit. All other cells in that row are inert (no filtering / active cell).
    if (isShowMoreRow(row)) {
      if (!rowHeader) return;

      const rowData = row.original;
      const currentLimit = rowData.__currentLimit as number;
      const nextLimit = getNextRowLimit(currentLimit);

      if (!nextLimit) return;

      const isOutermostDimension = !rowId.includes(".");

      if (isOutermostDimension) {
        if (setPivotOutermostRowLimit) {
          setPivotOutermostRowLimit(nextLimit);
        }
      } else {
        const expandIndex = rowId.split(".").slice(0, -1).join(".");
        if (expandIndex && setPivotRowLimitForExpanded) {
          setPivotRowLimitForExpanded(expandIndex, nextLimit);
        }
      }
      return;
    }

    if (rowHeader && !onCellClickToFilter) {
      if (row.getCanExpand()) row.getToggleExpandedHandler()();
    } else {
      const isTotalsRow = totalsRow && rowId === "0";
      if (isTotalsRow && onCellClickToFilter) {
        return;
      }

      if (setPivotActiveCell && canShowDataViewer) {
        setPivotActiveCell(rowId, columnId);
      }

      if (onCellClickToFilter) {
        onCellClickToFilter(rowId, columnId, rowHeader, row.original);
      }
    }
  }

  function onTableLeave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHovering(null);
    ignoreInitialTimeoutRef.current = false;
  }

  function handleClick(e: MouseEvent) {
    if (!isElement(e.target)) return;

    const td = e.target.closest("td");
    const value = td?.dataset.value;
    if (value === undefined || value === SHOW_MORE_BUTTON) return;

    copyToClipboard(value);
  }

  function onMouseMove(e: MouseEvent) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (ignoreInitialTimeoutRef.current) {
      handleTooltip(e);
      return;
    } else {
      timeoutRef.current = setTimeout(() => {
        handleTooltip(e);
      }, 400);
    }
  }

  function handleTooltip(e: MouseEvent) {
    if (!leftCellRef.current || !(e.target instanceof HTMLElement)) return;

    const td = e.target.closest("td");
    const value = td?.dataset.value;

    if (!td || value === undefined) return;

    if (value === SHOW_MORE_BUTTON) return;

    leftCellRef.current = false;
    td.addEventListener("mouseleave", () => (leftCellRef.current = true), {
      once: true,
    });

    ignoreInitialTimeoutRef.current = true;

    setHovering({
      value,
      rowHeader: td.dataset.rowheader === "true",
    });
    hoverPositionRef.current = td.getBoundingClientRect();
  }

  const hoverPosition = hoverPositionRef.current;

  return (
    <>
      <div
        className={[
          "table-wrapper relative",
          border ? "border" : "",
          rounded ? "rounded-sm" : "",
          fillWidth ? "w-full" : "w-fit",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            "--row-height": `${ROW_HEIGHT}px`,
            "--header-height": `${HEADER_HEIGHT}px`,
            "--total-header-height": `${totalHeaderHeight + 1}px`,
          } as CSSProperties
        }
        ref={containerRef}
        onScroll={() => handleScroll(containerRef.current)}
      >
        {isFlat ? (
          <FlatTable
            headerGroups={headerGroups}
            rows={rows}
            virtualRows={virtualRows}
            measures={measures}
            cellFormatters={cellFormatters}
            totalsRow={totalsRow}
            dataRows={dataRows}
            before={before}
            after={after}
            totalRowSize={totalRowSize}
            canShowDataViewer={canShowDataViewer}
            enableClickToFilter={enableClickToFilter}
            hasMeasureContextColumns={hasMeasureContextColumns}
            rowSelectionState={rowSelectionState}
            clickSelection={clickSelection}
            config={config}
            activeCell={pivotState?.activeCell}
            assembled={assembled}
            onMouseMove={onMouseMove}
            onCellClick={onCellClick}
            onTableLeave={onTableLeave}
            fillWidth={fillWidth}
            containerWidth={containerWidth}
            onCellCopy={handleClick}
          />
        ) : (
          <NestedTable
            headerGroups={headerGroups}
            rows={rows}
            virtualRows={virtualRows}
            widthScopeKey={widthScopeKey}
            before={before}
            after={after}
            timeDimension={timeDimension as string}
            totalsRow={totalsRow}
            totalRowSize={totalRowSize}
            rowDimensions={rowDimensions}
            hasColumnDimension={hasColumnDimension}
            dataRows={dataRows}
            measures={measures}
            cellFormatters={cellFormatters}
            canShowDataViewer={canShowDataViewer}
            enableClickToFilter={enableClickToFilter}
            rowSelectionState={rowSelectionState}
            clickSelection={clickSelection}
            onColumnHeaderClick={onColumnHeaderClick}
            activeCell={pivotState?.activeCell}
            assembled={assembled}
            scrollLeft={scrollLeftRef.current}
            containerRefElement={containerRef}
            onMouseMove={onMouseMove}
            onCellClick={onCellClick}
            onTableLeave={onTableLeave}
            fillWidth={fillWidth}
            containerWidth={containerWidth}
            onCellCopy={handleClick}
          />
        )}
      </div>

      {hovering ? (
        <VirtualTooltip
          sortable
          hovering={hovering}
          hoverPosition={hoverPosition}
          pinned={false}
          customShortcuts={getCustomShortcuts(hovering.rowHeader)}
        />
      ) : null}
    </>
  );
}

function buildCellFormatters(
  flatRows: Row<PivotDataRow>[],
  measureFormatting: PivotState["measureFormatting"],
  hasTotalsRow: boolean,
  allMeasures: PivotDataStoreConfig["allMeasures"],
): Map<string, CellFormatter> {
  const formatters = new Map<string, CellFormatter>();
  if (!measureFormatting || Object.keys(measureFormatting).length === 0) {
    return formatters;
  }

  // Rules formatters don't depend on the value domain, so only scan the row
  // model when a scale-mode (heatmap/data bar) measure needs one.
  const needsDomains = Object.values(measureFormatting).some(
    (fmt) => fmt.mode !== "rules",
  );
  // Collect values from leaf rows and, separately, from nested parent rows.
  const leafValues: { measureName: string; value: number }[] = [];
  const parentValues: { measureName: string; value: number }[] = [];
  if (needsDomains) {
    for (const row of flatRows) {
      // Always skip the prepended grand-totals row.
      if (hasTotalsRow && row.id === "0") continue;
      const target = row.subRows.length > 0 ? parentValues : leafValues;
      for (const cell of row.getAllCells()) {
        const meta = cell.column.columnDef.meta as {
          conditionalFormat?: unknown;
          isRowTotal?: boolean;
          measureName?: string;
        };
        if (!meta?.conditionalFormat || meta.isRowTotal || !meta.measureName) {
          continue;
        }
        const value = cell.getValue();
        if (typeof value === "number") {
          target.push({ measureName: meta.measureName, value });
        }
      }
    }
  }

  const leafDomains = computeMeasureDomains(leafValues);
  const parentDomains = computeMeasureDomains(parentValues);
  for (const [measureName, fmt] of Object.entries(measureFormatting)) {
    if (fmt.mode === "rules") {
      formatters.set(measureName, makeCellFormatter(fmt));
      continue;
    }
    const domain = leafDomains.get(measureName) ?? parentDomains.get(measureName);
    if (domain) {
      // Heatmap gradients flip for lower-is-better measures so low values
      // get the "good" end of the scheme.
      const lowerIsBetter =
        allMeasures.find((mm) => mm.name === measureName)?.lowerIsBetter ?? false;
      formatters.set(
        measureName,
        makeCellFormatter(fmt, domain, lowerIsBetter),
      );
    }
  }
  return formatters;
}
