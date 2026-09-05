import type { KeyboardEvent, MouseEvent } from "react";
import { cellInspectorStore } from "@rilldata/web-common/features/dashboards/stores/cell-inspector-store";
import { TOOLTIP_STRING_LIMIT } from "@rilldata/web-common/layout/config";
import {
  copyToClipboard,
  isClipboardApiSupported,
} from "@rilldata/web-common/lib/actions/copy-to-clipboard";
import { STRING_LIKES } from "@rilldata/web-common/lib/duckdb-data-types";
import { formatDataTypeAsDuckDbQueryString } from "@rilldata/web-common/lib/formatters";
import {
  FormattedDataType,
  Shortcut,
  StackingWord,
  Tooltip,
} from "@rilldata/web-common/features/dashboards/leaderboard/react/primitives";
import type { VirtualItem } from "./useVirtualizer";
import { BarAndLabel } from "./BarAndLabel";
import { ExternalLink } from "./icons";
import { useDimensionTableConfig } from "./context";

/**
 * React translation of `components/virtualized-table/core/Cell.svelte`.
 *
 * Renders one virtualized grid cell as a tooltip trigger. The row hover /
 * focus highlight, the include-exclude visual state, the magnitude bar, the
 * copy-on-shift-click and the URI link affordance are all preserved. The
 * Svelte `modified` click action is reduced to its shift branch (matching the
 * leaderboard port).
 */
export interface CellProps {
  row: VirtualItem;
  column: { start: number; size: number };
  value?: unknown;
  formattedValue?: unknown;
  tooltipFormatter?: (
    value: number | string | null | undefined,
  ) => string | null | undefined;
  type?: string;
  barValue?: number;
  rowActive?: boolean;
  suppressTooltip?: boolean;
  rowSelected?: boolean;
  colSelected?: boolean;
  atLeastOneSelected?: boolean;
  excludeMode?: boolean;
  positionStatic?: boolean;
  label?: string;
  onInspect?: (rowIndex: number) => void;
  onSelectItem?: (data: { index: number; meta: boolean }) => void;
  lowerIsBetter?: boolean;
  onKeyDown?: (e: KeyboardEvent) => void;
  /** When set, renders a hover-revealed external link icon for URI dimensions. */
  href?: string;
}

export function Cell({
  row,
  column,
  value = null,
  formattedValue = null,
  tooltipFormatter,
  type = "",
  barValue = 0,
  rowActive = false,
  suppressTooltip = false,
  rowSelected = false,
  colSelected = false,
  atLeastOneSelected = false,
  excludeMode = false,
  positionStatic = false,
  label,
  onInspect = () => {},
  onSelectItem = () => {},
  lowerIsBetter = false,
  onKeyDown,
  href,
}: CellProps) {
  const config = useDimensionTableConfig();
  const isDimensionTable = config.table === "DimensionTable";
  const isTextColumn = type === "VARCHAR" || type === "CODE_STRING";

  const clipboardSupported = isClipboardApiSupported();

  const cellValue = value as number | string | null | undefined;

  const inspectorValue =
    tooltipFormatter && value != null ? tooltipFormatter(cellValue) : value;

  const tooltipValue =
    tooltipFormatter && value != null
      ? tooltipFormatter(cellValue)
      : value &&
          STRING_LIKES.has(type) &&
          String(value).length >= TOOLTIP_STRING_LIMIT
        ? String(value).slice(0, TOOLTIP_STRING_LIMIT) + "..."
        : value;

  const excluded = atLeastOneSelected
    ? excludeMode
      ? rowSelected
      : !rowSelected
    : false;

  const barColor = excluded
    ? "ui-measure-bar-excluded"
    : rowSelected
      ? "ui-measure-bar-included-selected"
      : "ui-measure-bar-included";

  const formattedDataTypeStyle = excluded
    ? "font-normal text-fg-muted"
    : rowSelected
      ? "font-normal text-fg-primary font-semibold"
      : "font-normal text-fg-primary";

  // The Svelte version also sets a per-cell `cellActive` flag on focus; in React
  // the hover/focus highlight is driven by the `rowActive` prop the parent
  // computes from `activeIndex`, so `cellActive` is folded into `rowActive`.
  const activityStatus = rowActive ? "bg-surface-hover" : "bg-transparent";

  function onFocus() {
    onInspect(row.index);
    cellInspectorStore.updateValue(value, inspectorValue);
  }

  function onBlur() {
    // The Svelte version resets `cellActive` on blur; in React the hover /
    // focus highlight is derived from `rowActive` (passed by the parent) so the
    // local `cellActive` flag is not needed.
  }

  function onSelect(e: MouseEvent) {
    if (e.shiftKey) return;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    onSelectItem({ index: row.index, meta: e.ctrlKey || e.metaKey });
  }

  const shiftClick = () => {
    if (value == null) return;
    const exportedValue = formatDataTypeAsDuckDbQueryString(value, type);
    copyToClipboard(exportedValue);
  };

  const valueButton = (
    <button
      aria-label={label}
      className={`${isTextColumn ? "text-left" : "text-right"} w-full truncate ${!isDimensionTable ? "px-4" : ""}`}
      onMouseDown={(e) => {
        if (e.shiftKey) {
          e.preventDefault();
          shiftClick();
        }
      }}
      style={{ height: `${row.size}px` }}
    >
      <FormattedDataType
        customStyle={formattedDataTypeStyle}
        inTable
        isNull={value === null || value === undefined}
        type={type}
        value={formattedValue || value}
        color="text-fg-secondary"
        lowerIsBetter={lowerIsBetter}
      />
    </button>
  );

  const linkWrapper = href ? (
    <div
      className={`flex items-center gap-x-1 w-full min-w-0 ${isTextColumn ? "justify-start" : "justify-end"}`}
    >
      <a
        className="external-link shrink-0"
        target="_blank"
        rel="noopener noreferrer"
        href={href}
        title={href}
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="fill-primary-600" />
      </a>
    </div>
  ) : null;

  return (
    <Tooltip
      distance={16}
      location="top"
      suppress={suppressTooltip || !clipboardSupported}
      content={
        <div
          className="flex flex-col max-w-[360px] gap-y-1.5 p-2 text-fg-inverse"
          style={{ pointerEvents: "none" }}
        >
          <FormattedDataType
            value={tooltipValue}
            color="text-fg-inverse"
          />
          <div className="flex flex-row gap-x-6 items-baseline text-fg-disabled">
            <div>
              <StackingWord>Copy</StackingWord> this value to clipboard
            </div>
            <Shortcut>
              <span style={{ fontFamily: "var(--system)" }}>⇧</span> + Click
            </Shortcut>
          </div>
        </div>
      }
    >
      <div
        className={`table-cell-content ${positionStatic ? "static" : "absolute"} z-9 text-ellipsis whitespace-nowrap ${isDimensionTable ? "" : "border-r border-b"} ${activityStatus}`}
        onBlur={onBlur}
        onClick={onSelect}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onMouseOut={onBlur}
        onMouseOver={onFocus}
        role="gridcell"
        style={{
          height: `${row.size}px`,
          left: `${column.start}px`,
          top: `${row.start}px`,
          width: `${column.size}px`,
          paddingRight: "10px",
        }}
        tabIndex={0}
      >
        <BarAndLabel
          color={barColor}
          customBackgroundColor="rgba(0,0,0,0)"
          justify="left"
          showBackground={false}
          value={barValue}
          compact
        >
          {href ? (
            <div
              className={`flex items-center gap-x-1 w-full min-w-0 ${isTextColumn ? "justify-start" : "justify-end"}`}
            >
              {valueButton}
              {linkWrapper}
            </div>
          ) : (
            valueButton
          )}
        </BarAndLabel>
      </div>
    </Tooltip>
  );
}
