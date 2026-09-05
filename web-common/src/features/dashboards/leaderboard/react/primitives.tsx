/**
 * Shared React stand-ins for the small Svelte primitives that the Leaderboard
 * views depend on, following the inline-stand-in convention established by the
 * ported `MeasureBigNumber.tsx` / `Chart.tsx`.
 *
 * Each component is referenced to its Svelte source; their scoped `<style>`
 * blocks are folded into `className` / inline styles (the scoped styles are not
 * transferred, matching the rest of the port).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { NumberParts } from "@rilldata/web-common/lib/number-formatting/humanizer-types";
import { formatDataType } from "@rilldata/web-common/lib/formatters";
import { isPercDiff } from "@rilldata/web-common/components/data-types/type-utils";
import type {
  Alignment,
  Location,
} from "@rilldata/web-common/lib/place-element";

// ─────────────────────────────────────────────────────────────────────────────
// Data-type rendering (data-types/Base.svelte, Number.svelte, Varchar.svelte,
// FormattedDataType.svelte, PercentageChange.svelte)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * React translation of `components/data-types/Base.svelte`: the shared wrapper
 * that renders the `-` no-data placeholder when `isNull`.
 */
function DataTypeBase({
  classes = "",
  isNull = false,
  truncate = false,
  color = "text-fg-primary",
  children,
}: {
  classes?: string;
  isNull?: boolean;
  truncate?: boolean;
  color?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={`${truncate ? "truncate" : ""} ${classes} ${color || "text-fg-primary"} select-text`}
    >
      {isNull ? <span className="text-fg-secondary">-</span> : children}
    </span>
  );
}

/**
 * React translation of `data-types/Number.svelte` (INTEGER / DECIMAL paths).
 */
function NumberDisplay({
  type,
  value,
  isNull = false,
  inTable = false,
  customStyle = "",
  truncate = false,
  color = "",
}: {
  type: string;
  value: unknown;
  isNull?: boolean;
  inTable?: boolean;
  customStyle?: string;
  truncate?: boolean;
  color?: string;
}) {
  return (
    <DataTypeBase
      truncate={truncate}
      isNull={isNull || value === null}
      classes={`ui-copy-number font-normal ${inTable ? "block text-right" : ""} ${customStyle}`}
      color={color}
    >
      {formatDataType(value, type)}
    </DataTypeBase>
  );
}

/**
 * React translation of `data-types/Varchar.svelte` (the default categorical path).
 */
function VarcharDisplay({
  type,
  value,
  isNull = false,
  inTable = false,
  customStyle = "",
  truncate = false,
  color = "",
}: {
  type: string;
  value: unknown;
  isNull?: boolean;
  inTable?: boolean;
  customStyle?: string;
  truncate?: boolean;
  color?: string;
}) {
  return (
    <DataTypeBase
      truncate={truncate}
      isNull={isNull}
      classes={`${customStyle} ${inTable ? "text-left" : ""}`}
      color={color}
    >
      {isNull ? (
        <span className="italic">null</span>
      ) : (
        formatDataType(value, type)
      )}
    </DataTypeBase>
  );
}

export interface FormattedDataTypeProps {
  type?: string;
  isNull?: boolean;
  inTable?: boolean;
  value?: unknown;
  customStyle?: string;
  truncate?: boolean;
  color?: string;
  lowerIsBetter?: boolean;
}

/**
 * React translation of `components/data-types/FormattedDataType.svelte`.
 *
 * Only the code paths the Leaderboard exercises are retained faithfully:
 * the `RILL_PERCENTAGE_CHANGE` dispatch to `PercentageChange` and the
 * numeric/varchar fallback (`Number.svelte` / `Varchar.svelte`). The unused
 * `RILL_CHANGE` (`MeasureChange`), timestamp and interval dispatches are treated
 * as the varchar fallback, which is a safe visual default for those cells.
 */
export function FormattedDataType({
  type = "VARCHAR",
  isNull = false,
  inTable = false,
  value,
  customStyle = "",
  truncate = false,
  color = "",
  lowerIsBetter = false,
}: FormattedDataTypeProps) {
  if (type === "RILL_PERCENTAGE_CHANGE" && typeof value !== "boolean") {
    return (
      <PercentageChange
        value={value as unknown}
        isNull={isNull}
        inTable={inTable}
        customStyle={customStyle}
        color={color}
        lowerIsBetter={lowerIsBetter}
      />
    );
  }

  if (isNumericType(type)) {
    return (
      <NumberDisplay
        type={type}
        value={value}
        isNull={isNull}
        inTable={inTable}
        customStyle={customStyle}
        truncate={truncate}
        color={color}
      />
    );
  }

  return (
    <VarcharDisplay
      type={type}
      value={value}
      isNull={isNull}
      inTable={inTable}
      customStyle={customStyle}
      truncate={truncate}
      color={color}
    />
  );
}

/** INTEGER / DECIMAL (numeric) types use the `Number.svelte` render path. */
function isNumericType(type: string): boolean {
  return /^INT|DECIMAL|FLOAT|DOUBLE|REAL|NUMERIC|BIGINT|HUGEINT|TINYINT|SMALLINT/.test(
    type.toUpperCase(),
  );
}

export interface PercentageChangeProps {
  value: string | number | undefined | null | NumberParts | unknown;
  isNull?: boolean;
  inTable?: boolean;
  showPosSign?: boolean;
  color?: string;
  customStyle?: string;
  tabularNumber?: boolean;
  assembled?: boolean;
  lowerIsBetter?: boolean;
}

/**
 * React translation of `data-types/PercentageChange.svelte` (+ its `Base.svelte`
 * wrapper). Mirrors the NumberParts branch (used by the Leaderboard's % change /
 * percent-of-total cells) and the raw-number branch, plus the `-` no-data output.
 */
export function PercentageChange({
  value,
  isNull = false,
  inTable = false,
  showPosSign = false,
  color = "!text-fg-secondary",
  customStyle = "",
  tabularNumber = true,
  assembled = true,
  lowerIsBetter = false,
}: PercentageChangeProps) {
  let intValue = "";
  let negSign = "";
  let posSign = "";
  let approxSign = "";
  let suffix = "";
  let diffIsNegative = false;
  let diffIsPositive = false;

  const isNoData = value === null || value === undefined || isPercDiff(value);

  if (!isNoData && value !== null && value !== undefined && typeof value !== "number") {
    // NumberParts object.
    const v = value as NumberParts;
    const intPart = +v.int;
    const fracPart = +v.frac / 10 ** v.frac.length;
    intValue = Math.round(intPart + fracPart).toString();
    diffIsNegative = v.neg === "-";
    diffIsPositive = !diffIsNegative && !v.approxZero && +v.int !== 0;
    negSign = diffIsNegative && !v.approxZero ? "-" : "";
    approxSign = v.approxZero ? "~" : "";
    posSign = !diffIsNegative && !approxSign && showPosSign ? "+" : "";
    suffix = v.suffix ?? "";
  } else if (typeof value === "number") {
    diffIsNegative = value < 0;
    diffIsPositive = value > 0;
    intValue = Math.round(100 * value).toString();
    approxSign = Math.abs(value) < 0.005 ? "~" : "";
    posSign = !diffIsNegative && !approxSign && showPosSign ? "+" : "";
    negSign = "";
    suffix = "";
  }

  const valueColor = lowerIsBetter
    ? diffIsPositive
      ? "text-kpi-negative"
      : diffIsNegative
        ? "text-kpi-positive"
        : ""
    : diffIsNegative
      ? "text-kpi-negative"
      : diffIsPositive
        ? "text-kpi-positive"
        : "";

  const classes = `${tabularNumber ? "ui-copy-number" : ""} w-full ${customStyle} ${inTable ? "block text-right" : ""} pointer-events-none`;

  return (
    <span className={`${classes} ${color || "text-fg-primary"} select-text`}>
      {isNull || isNoData ? (
        <span className="text-fg-secondary">-</span>
      ) : assembled ? (
        <span className={`text-fg-secondary ${valueColor}`}>
          {approxSign}
          {negSign}
          {posSign}
          {intValue}
          {suffix}
          <span className="opacity-50">%</span>
        </span>
      ) : null}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip (components/tooltip/Tooltip.svelte, simplified to self-contained React)
// ─────────────────────────────────────────────────────────────────────────────

export interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  suppress?: boolean;
  distance?: number;
  location?: Location;
  alignment?: Alignment;
  activeDelay?: number;
}

/**
 * Simplified React translation of `components/tooltip/Tooltip.svelte` (which
 * relies on `hoverIntent` + a floated positioning lib). Renders the content on
 * hover after `activeDelay`, positioned relative to the target. The
 * `display: contents` wrapper of the Svelte version is replaced with an
 * `inline-block relative` box so the absolutely-positioned content can anchor.
 */
export function Tooltip({
  children,
  content,
  suppress = false,
  distance = 0,
  location = "bottom",
  alignment = "middle",
  activeDelay = 200,
}: TooltipProps) {
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setActive(true), activeDelay);
  }, [activeDelay]);

  const handleLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setActive(false);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const show = active && !suppress;

  return (
    <div
      className="inline-block relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {show ? (
        <div
          className="absolute z-50 pointer-events-none"
          style={tooltipPositionStyle(location, alignment, distance)}
        >
          {content}
        </div>
      ) : null}
    </div>
  );
}

function tooltipPositionStyle(
  location: Location,
  alignment: Alignment,
  distance: number,
): CSSProperties {
  const d = `${distance}px`;
  const vertical: CSSProperties =
    alignment === "middle"
      ? { top: "50%", transform: "translateY(-50%)" }
      : alignment === "end"
        ? { bottom: 0 }
        : { top: 0 };
  const horizontal: CSSProperties =
    alignment === "end" ? { right: 0 } : { left: 0 };
  switch (location) {
    case "left":
      return { ...vertical, right: `calc(100% + ${d})` };
    case "right":
      return { ...vertical, left: `calc(100% + ${d})` };
    case "top":
      return { ...horizontal, bottom: `calc(100% + ${d})` };
    case "bottom":
      return { ...horizontal, top: `calc(100% + ${d})` };
  }
}

/**
 * React translation of `components/tooltip/Shortcut.svelte` (a right-aligned
 * hint slot). The Svelte `StackingWord`/`Shortcut` eventBus animation is not
 * transferred — only the static markup is reproduced.
 */
export function Shortcut({ children }: { children: ReactNode }) {
  return <div className="text-right dark:text-fg-secondary text-gray-400">{children}</div>;
}

/**
 * React translation of `components/tooltip/StackingWord.svelte` — the inline
 * key-label span. The Svelte eventBus key-press animation is dropped; only the
 * styled span is transferred.
 */
export function StackingWord({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-sm relative">{children}</span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable UI primitives
// ─────────────────────────────────────────────────────────────────────────────

/**
 * React translation of `layout/Resizer.svelte` — a drag handle that reports a
 * new size through `onUpdate`. The internal `dimension` prop that the Svelte
 * version mutates is held in local state here; the caller receives updates via
 * `onUpdate`.
 */
export function Resizer({
  dimension,
  direction = "EW",
  side = direction === "EW" ? "left" : "top",
  max = 440,
  min = 200,
  basis = 200,
  onUpdate,
  disabled = false,
  justify = "center",
  hang = true,
  children,
}: {
  dimension: number;
  direction?: "NS" | "EW";
  side?: "left" | "right" | "top" | "bottom";
  max?: number;
  min?: number;
  basis?: number;
  onUpdate?: ((dimension: number) => void) | null;
  disabled?: boolean;
  justify?: "center" | "start" | "end";
  hang?: boolean;
  children?: ReactNode;
}) {
  const [current, setCurrent] = useState(dimension);
  const [resizing, setResizing] = useState(false);
  const [hover, setHover] = useState(false);
  const startRef = useRef(0);
  const startDimRef = useRef(dimension);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCurrent(dimension);
  }, [dimension]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const handleMousedown = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      startDimRef.current = current;
      setResizing(true);
      startRef.current = direction === "EW" ? e.clientX : e.clientY;

      const onMouseMove = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        let delta = 0;
        if (direction === "EW") {
          delta = side === "left" ? startRef.current - ev.clientX : ev.clientX - startRef.current;
        } else {
          delta = side === "top" ? startRef.current - ev.clientY : ev.clientY - startRef.current;
        }
        requestAnimationFrame(() => {
          const next = Math.min(max, Math.max(min, startDimRef.current + delta));
          setCurrent(next);
          onUpdate?.(next);
        });
      };

      const handleMouseUp = () => {
        setResizing(false);
        setHover(false);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [current, direction, side, max, min, onUpdate],
  );

  const handleDoubleClick = useCallback(() => {
    setCurrent(basis);
    onUpdate?.(basis);
  }, [basis, onUpdate]);

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${direction} ${side} justify-${justify} z-50 flex-none pointer-events-auto flex items-center ${hang ? "hang" : ""} ${direction === "EW" ? "w-2 h-full cursor-col-resize" : "w-full h-2 cursor-row-resize"}`}
      onMouseDown={handleMousedown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setHover(true), 150);
      }}
      onMouseLeave={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setHover(false);
      }}
    >
      {hover || resizing ? children : null}
    </button>
  );
}

/** React translation of `features/entity-management/DelayedSpinner.svelte`. */
export function DelayedSpinner({
  isLoading,
  delay = 300,
  size = "1em",
}: {
  isLoading: boolean;
  delay?: number;
  size?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [isLoading, delay]);

  if (!visible) return null;
  return (
    <div
      role="status"
      className="rounded-full border border-fg-secondary border-t-transparent animate-spin"
      style={{ width: size, height: size }}
    />
  );
}

/**
 * React translation of `features/dashboards/leaderboard/LoadingRows.svelte` —
 * the placeholder skeleton rows shown while the leaderboard is loading.
 */
export function LoadingRows({
  rows = 7,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx}>
          <td />
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} style={{ height: "22px" }} className="p-1 py-[5px]">
              <div className="size-full bg-gray-200 animate-pulse rounded-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * React translation of `features/dashboards/leaderboard/DelayedLoadingRows.svelte`
 * — shows the placeholder rows when loading / pending, and delays showing them
 * while merely re-fetching so the table does not flicker.
 */
export function DelayedLoadingRows({
  isLoading,
  isFetching,
  isPending,
  rowCount,
  columnCount = 4,
  delay = 300,
  children,
}: {
  isLoading: boolean;
  isFetching: boolean;
  isPending: boolean;
  rowCount: number;
  columnCount?: number;
  delay?: number;
  children?: ReactNode;
}) {
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const previousRowCountRef = useRef(rowCount ?? 7);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (isLoading || isPending) {
      setShowPlaceholder(true);
    } else if (isFetching) {
      timeoutRef.current = setTimeout(() => setShowPlaceholder(true), delay);
    } else {
      setShowPlaceholder(false);
      previousRowCountRef.current = rowCount;
    }
  }, [isLoading, isFetching, isPending, rowCount, delay]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  if (showPlaceholder) {
    return <LoadingRows rows={previousRowCountRef.current || 7} columns={columnCount} />;
  }
  return <>{children}</>;
}

/** React translation of `features/dashboards/leaderboard/LongBarZigZag.svelte`. */
export function LongBarZigZag() {
  const zigZag =
    "M" +
    Array.from({ length: 7 })
      .map((_, i) => `${15 - 4 * (i % 2)} ${1.7 * (i * 2)}`)
      .join(" L");
  return (
    <svg className="absolute right-0 top-0 z-50" width="15" height="22">
      <path d={zigZag} className="fill-surface" />
    </svg>
  );
}
