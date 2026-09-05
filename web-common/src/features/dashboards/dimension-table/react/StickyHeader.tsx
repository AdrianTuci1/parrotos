import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import type { HeaderPosition } from "@rilldata/web-common/components/virtualized-table/types";
import { useDimensionTableConfig } from "./context";

/**
 * React translation of `components/virtualized-table/core/StickyHeader.svelte`.
 *
 * Renders one sticky (dimension value / column label) header cell as a button.
 * The Svelte `modified` click action is reduced to its shift-vs-click branches
 * (matching the leaderboard port), and the `use:dragTableCell` resize action is
 * re-expressed with mouse event listeners reporting `pageX - parentLeft`.
 */
export interface StickyHeaderProps {
  header: { size: number; start: number };
  position?: HeaderPosition;
  enableResize?: boolean;
  borderRight?: boolean;
  bgClass?: string;
  onClick?: () => void;
  onShiftClick?: () => void;
  onResetColumnWidth?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;
  onResize?: (size: number) => void;
  onResizeEnd?: () => void;
  children?: ReactNode;
}

export function StickyHeader({
  header,
  position = "top",
  enableResize = true,
  borderRight = false,
  bgClass = "",
  onClick = () => {},
  onShiftClick = () => {},
  onResetColumnWidth = () => {},
  onBlur = () => {},
  onFocus = () => {},
  onResize = () => {},
  onResizeEnd = () => {},
  children,
}: StickyHeaderProps) {
  const config = useDimensionTableConfig();
  const isDimensionTable = config.table === "DimensionTable";

  const [isResizing, setIsResizing] = useState(false);
  const resizeSuppressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  function suppressClickAfterResize() {
    setIsResizing(true);
    if (resizeSuppressTimeout.current) clearTimeout(resizeSuppressTimeout.current);
    resizeSuppressTimeout.current = setTimeout(() => setIsResizing(false), 100);
  }

  // Replicate the `dragTableCell` action: report `pageX - parentLeft` on mouse
  // move while dragging, and call `onResizeEnd` on mouse up.
  useEffect(() => {
    const handle = resizeHandleRef.current;
    if (!enableResize || !handle) return;
    let moving = false;

    const onMouseDown = () => {
      moving = true;
    };
    const onMouseMove = (e: globalThis.MouseEvent) => {
      if (!moving) return;
      const rect = handle.parentElement?.getBoundingClientRect();
      if (rect) onResize(e.pageX - rect.left);
    };
    const onMouseUp = () => {
      if (moving) {
        moving = false;
        onResizeEnd();
      }
    };

    handle.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      moving = false;
      handle.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [enableResize, onResize, onResizeEnd]);

  useEffect(
    () => () => {
      if (resizeSuppressTimeout.current) clearTimeout(resizeSuppressTimeout.current);
    },
    [],
  );

  function handleClick(e: MouseEvent) {
    if (isResizing) {
      e.stopPropagation();
      return;
    }
    if (e.shiftKey) {
      e.preventDefault();
      onShiftClick();
    } else {
      onClick();
    }
  }

  let positionClasses: string;
  if (position === "top") positionClasses = "absolute left-0 top-0";
  else if (position === "left")
    positionClasses = "absolute left-0 top-0 text-center font-semibold";
  else positionClasses = "sticky left-0 top-0 z-40 font-bold";

  const borderClassesOuterDiv =
    (borderRight ? "border-r " : "") +
    (isDimensionTable
      ? position === "left"
        ? ""
        : "border-b"
      : "border-b border-b-1 border-r border-r-1 border border-t-0 border-l-0 bg-gray-100");

  const borderClassesInnerDiv = isDimensionTable ? "" : "whitespace-nowrap";

  return (
    <button
      onMouseOver={onFocus}
      onMouseLeave={onBlur}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={handleClick}
      style={{
        transform: `translate${position === "left" ? "Y" : "X"}(${header.start}px)`,
        paddingRight: position === "left" ? "0px" : "10px",
        width: position === "top-left" ? header.size + 1 : header.size,
        height:
          position === "left" ? config.rowHeight : config.columnHeaderHeight,
      }}
      className={`block ${positionClasses} ${bgClass} text-left ${borderClassesOuterDiv}`}
    >
      <div
        className={`text-fg-primary text-ellipsis overflow-hidden ${isDimensionTable ? "" : "px-4"} ${borderClassesInnerDiv} ${position === "top" ? "text-left" : ""} ${position === "top-left" ? `${isDimensionTable ? "font-normal" : "text-center"}` : ""}`}
      >
        {children}
        {enableResize ? (
          <div
            ref={resizeHandleRef}
            role="columnheader"
            tabIndex={0}
            onDoubleClick={onResetColumnWidth}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 right-0 cursor-col-resize grid place-items-end"
            style={{ paddingRight: "1.25px", width: "12px", height: "32px" }}
          />
        ) : null}
      </div>
    </button>
  );
}
