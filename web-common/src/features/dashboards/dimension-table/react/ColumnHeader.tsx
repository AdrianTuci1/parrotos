import type { ComponentType } from "react";
import { copyToClipboard } from "@rilldata/web-common/lib/actions/copy-to-clipboard";
import { SortDirection } from "@rilldata/web-common/features/dashboards/proto-state/derived-types";
import type { HeaderPosition } from "@rilldata/web-common/components/virtualized-table/types";
import { Tooltip } from "@rilldata/web-common/features/dashboards/leaderboard/react/primitives";
import { ArrowDown, Pin } from "./icons";
import { StickyHeader } from "./StickyHeader";
import { useDimensionTableConfig } from "./context";

/**
 * React translation of `components/virtualized-table/core/ColumnHeader.svelte`.
 *
 * Renders a single measure column header: the (sortable) label with the
 * direction arrow, a description tooltip in the dimension table, and the
 * pin-to-right action. The `showDataIcon`/`DataTypeIcon` affordance is not
 * exercised by the dimension table (the section renders `showDataIcon={false}`)
 * and is therefore not transferred.
 */
export interface ColumnHeaderProps {
  name: string | ComponentType;
  type?: string;
  description?: string;
  header: { size: number; start: number };
  position?: HeaderPosition;
  noPin?: boolean;
  showDataIcon?: boolean;
  pinned?: boolean;
  enableResize?: boolean;
  enableSorting?: boolean;
  isSelected?: boolean;
  sorted?: SortDirection | undefined;
  onResizeColumn?: (size: number, name: string) => void;
  onResetColumnWidth?: (name: string) => void;
  onClickColumn?: (name: string) => void;
  onPin?: () => void;
}

export function ColumnHeader({
  name,
  type = "",
  description = "",
  header,
  position = "top",
  noPin = false,
  showDataIcon = false,
  pinned = false,
  enableResize = true,
  enableSorting = true,
  isSelected = false,
  sorted,
  onResizeColumn = () => {},
  onResetColumnWidth = () => {},
  onClickColumn = () => {},
  onPin = () => {},
}: ColumnHeaderProps) {
  const config = useDimensionTableConfig();
  const isDimensionTable = config.table === "DimensionTable";
  const isDimensionColumn =
    isDimensionTable && (type === "VARCHAR" || type === "CODE_STRING");

  const textAlignment = isDimensionColumn ? "text-left pl-1" : "text-right pr-1";
  const columnFontWeight = isSelected ? "" : config.columnHeaderFontWeightClass;

  const labelText = typeof name === "string" ? name : "";

  const tooltipContent = (
    <div className="flex flex-col gap-y-1.5 p-2 max-w-[280px]">
      {!isDimensionTable ? (
        <div className="flex flex-col">
          <span className="font-semibold">{labelText}</span>
          {showDataIcon ? (
            <span className="text-fg-muted truncate">{type}</span>
          ) : null}
        </div>
      ) : null}
      {isDimensionTable && description?.length ? (
        <div className="text-fg-muted truncate">{description}</div>
      ) : null}
      {isDimensionTable ? (
        <div className="text-fg-disabled">
          {enableSorting ? <div>Sort column</div> : null}
          <div>Copy column name to clipboard</div>
        </div>
      ) : null}
    </div>
  );

  return (
    <StickyHeader
      enableResize={enableResize}
      bgClass={config.headerBgColorClass}
      onResetColumnWidth={() => onResetColumnWidth(labelText)}
      onResize={(size) => onResizeColumn(size, labelText)}
      position={position}
      header={header}
      onFocus={() => {
        // `showMore` toggles the pin button; the dimension table always passes
        // `noPin`, so this is only meaningful for non-dimension tables.
      }}
      onBlur={() => {}}
      onClick={() => onClickColumn(labelText)}
      onShiftClick={() =>
        copyToClipboard(labelText, `Copied column name "${labelText}" to clipboard`)
      }
    >
      <div
        className={`flex justify-stretch select-none ${isDimensionTable ? "" : "items-center gap-x-2"}`}
      >
        <Tooltip location="top" alignment="middle" distance={16} content={tooltipContent}>
          <div
            className={`grid items-center cursor-pointer w-full ${!isSelected ? "gap-x-2" : ""}`}
            style={{
              gridTemplateColumns: isDimensionTable
                ? ""
                : `max-content auto ${!noPin ? "max-content" : ""}`,
            }}
          >
            <span
              className={`text-ellipsis ${columnFontWeight} ${isDimensionTable ? `${textAlignment} break-words line-clamp-2` : "overflow-hidden whitespace-nowrap"}`}
            >
              {labelText}
            </span>
          </div>
        </Tooltip>

        {sorted ? (
          <div className="mt-0.5 text-fg-secondary">
            {sorted === SortDirection.DESCENDING ? (
              <ArrowDown size="12px" />
            ) : sorted === SortDirection.ASCENDING ? (
              <ArrowDown size="12px" flip />
            ) : null}
          </div>
        ) : null}

        {!noPin ? (
          <Tooltip
            location="top"
            alignment="middle"
            distance={16}
            content={
              pinned
                ? "unpin this column from the right side of the table"
                : "pin this column to the right side of the table"
            }
          >
            <button
              className={`duration-100 justify-self-end ${pinned ? "text-fg-primary" : "text-fg-secondary"}`}
              onClick={onPin}
            >
              <Pin size="16px" />
            </button>
          </Tooltip>
        ) : null}
      </div>
    </StickyHeader>
  );
}
