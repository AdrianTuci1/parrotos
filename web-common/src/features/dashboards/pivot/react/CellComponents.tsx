import {
  createContext,
  useContext,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { Row } from "@tanstack/react-table";
import { LOADING_CELL } from "@rilldata/web-common/features/dashboards/pivot/pivot-constants";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import type { PivotDataRow } from "@rilldata/web-common/features/dashboards/pivot/types";

/**
 * React context carrying the pivot table's `assembled` flag into the cell
 * components. The original Svelte table injects `{assembled}` into every
 * rendered cell component (mirroring the `{assembled}` prop in the Svelte
 * templates), so the React port provides it through context instead of baking
 * it into the (rebuilt) column definitions.
 */
export const PivotAssembledContext = createContext(true);

export function usePivotAssembled(): boolean {
  return useContext(PivotAssembledContext);
}

/**
 * Renders a column-def `meta.icon` (a React component type) as an element.
 * Returns null when no icon is set.
 */
export function renderIcon(icon: unknown) {
  if (typeof icon === "function") {
    const Icon = icon as ComponentType;
    return <Icon />;
  }
  return null;
}

/**
 * React translations of the Svelte cell/icon components used by the pivot
 * tables. These mirror the markup and utility classes from the corresponding
 * `.svelte` files so the React port renders identically.
 *
 * Shared UI primitives that the originals rely on (Tooltip, Resizer) have
 * focused React equivalents below rather than pulling the shared Svelte
 * components into the React tree.
 */

// ---- Icons ----

export function ArrowDown({
  size = "1em",
  color = "currentColor",
  flip = false,
}: {
  size?: string;
  color?: string;
  flip?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={flip ? "rotate-180" : ""}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.3672 13.7775C18.8016 13.7775 19.0294 14.2935 18.7366 14.6145L12.3694 21.595C12.1711 21.8124 11.8289 21.8124 11.6306 21.595L5.26341 14.6145C4.97063 14.2935 5.19836 13.7775 5.63282 13.7775H10.4023L10.4023 2.5C10.4023 2.22386 10.6262 2 10.9023 2L13.4379 2C13.714 2 13.9379 2.22386 13.9379 2.5L13.9379 13.7775L18.3672 13.7775Z"
        fill={color}
      />
    </svg>
  );
}

export function ChevronRight({
  size = "1em",
  color = "currentColor",
}: {
  size?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 18L15 12L9 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExternalLink({
  size = "1em",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M6.91176 10.3636H10.3641V1.44108H1.44158V4.89342C1.44158 5.21559 1.18041 5.47676 0.858247 5.47676C0.536081 5.47676 0.274914 5.21559 0.274914 4.89342V1.14941C0.274914 0.666165 0.666665 0.274414 1.14991 0.274414H10.6558C11.139 0.274414 11.5308 0.666166 11.5308 1.14941V10.6553C11.5308 11.1385 11.139 11.5303 10.6558 11.5303H6.91176C6.58959 11.5303 6.32843 11.2691 6.32843 10.9469C6.32843 10.6248 6.58959 10.3636 6.91176 10.3636Z"
      />
      <path
        d="M6.91175 4.31009H3.88499C3.56283 4.31009 3.30166 4.57126 3.30166 4.89342C3.30166 5.21559 3.56283 5.47676 3.88499 5.47676H5.50346L0.445757 10.5345C0.217951 10.7623 0.217951 11.1316 0.445757 11.3594C0.673563 11.5872 1.04291 11.5872 1.27071 11.3594L6.32841 6.30172V7.92018C6.32841 8.24235 6.58958 8.50351 6.91175 8.50351C7.23391 8.50351 7.49508 8.24235 7.49508 7.92018V4.89383C7.49508 4.89332 7.49508 4.89241 7.49508 4.89191C7.49508 4.89036 7.49506 4.88859 7.49505 4.88704C7.49345 4.74043 7.43692 4.5943 7.32546 4.48218L7.32299 4.47971C7.26735 4.4244 7.20333 4.38261 7.13504 4.35435C7.06626 4.32583 6.99084 4.31009 6.91175 4.31009Z"
      />
    </svg>
  );
}

export function Spacer({
  size = "1em",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  return <div style={{ width: size, height: size }} className={className} />;
}

/** Delta icon used for comparison-delta measure columns (Δ). */
export function DeltaChange() {
  return <span className="text-fg-secondary text-xs font-medium">Δ</span>;
}

/** Delta-percent icon used for comparison-percent measure columns (Δ %). */
export function DeltaChangePercentage() {
  return <span className="text-fg-secondary text-xs font-medium">Δ %</span>;
}

// ---- Tooltip (focused React equivalent of the shared Svelte Tooltip) ----

export function Tooltip({
  label,
  description,
  children,
  maxWidth = "280px",
}: {
  label: string;
  description?: string;
  children?: ReactNode;
  maxWidth?: string;
}) {
  return (
    <span className="truncate" title={description ?? label}>
      {children ?? label}
    </span>
  );
}

// ---- Cell components ----

export function PivotHeaderLabel({
  label,
  description,
}: {
  label: string;
  description?: string | undefined;
}) {
  return (
    <Tooltip label={label} description={description}>
      <p className="truncate">{label}</p>
    </Tooltip>
  );
}

export function PivotExpandableCell({
  row,
  value,
  assembled,
  hasNestedDimensions = false,
  href,
  expandable = true,
}: {
  row: Row<PivotDataRow>;
  value: string;
  assembled?: boolean | undefined;
  hasNestedDimensions?: boolean;
  href?: string | undefined;
  expandable?: boolean;
}) {
  const isAssembled = usePivotAssembled();
  const effectiveAssembled = assembled ?? isAssembled;
  const canExpand = expandable && row.getCanExpand();
  const expanded = row.getIsExpanded();
  const assembledAndCanExpand = effectiveAssembled && canExpand;
  const needsSpacer =
    expandable && (row.depth >= 1 || (hasNestedDimensions && !canExpand));

  const handleExpandClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (assembledAndCanExpand) {
      row.getToggleExpandedHandler()();
    }
  };

  let displayedValue: ReactNode;
  if (value === LOADING_CELL) {
    displayedValue = null;
  } else if (value === "") {
    displayedValue = "\u00A0";
  } else {
    displayedValue = value ?? "null";
  }

  return (
    <div
      role="presentation"
      className="group flex items-center gap-x-1"
      style={{ paddingLeft: `${row.depth * 14}px` }}
    >
      {value === LOADING_CELL ? (
        <span className="h-2 bg-gray-200 rounded w-full inline-block" />
      ) : assembledAndCanExpand ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label={expanded ? m.pivot_collapse_row() : m.pivot_expand_row()}
          className={`grid size-4 place-items-center rounded-sm border-0 bg-transparent p-0 text-gray-400 transition-colors hover:bg-surface-active hover:text-fg-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 ${
            expanded ? "rotate-90" : ""
          }`}
          onClick={handleExpandClick}
        >
          <ChevronRight size="16px" />
        </button>
      ) : needsSpacer ? (
        <span className="shrink-0">
          <Spacer size="16px" />
        </span>
      ) : null}

      <span className="truncate min-w-0">{displayedValue}</span>

      {href ? (
        <a
          className="inline-flex items-center justify-center transition-opacity shrink-0 opacity-0 group-hover:opacity-70"
          target="_blank"
          rel="noopener noreferrer"
          href={href}
          title={href}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="fill-primary-600" />
        </a>
      ) : null}
    </div>
  );
}

export function PivotMeasureCell({
  assembled,
  isShowMoreRow = false,
}: {
  assembled?: boolean;
  isShowMoreRow?: boolean;
}) {
  const effectiveAssembled = assembled ?? usePivotAssembled();
  if (isShowMoreRow) return null;
  if (effectiveAssembled) {
    return <span className="text-fg-secondary">-</span>;
  }
  return <span className="loading-cell h-2 bg-gray-200 rounded w-full inline-block" />;
}

export function PivotDeltaCell({
  assembled,
  formattedValue,
  value,
  lowerIsBetter = false,
}: {
  assembled?: boolean;
  formattedValue: string;
  value: number | null | undefined;
  lowerIsBetter?: boolean;
}) {
  const effectiveAssembled = assembled ?? usePivotAssembled();
  if (effectiveAssembled) {
    if (value !== null && value !== undefined) {
      const isPositive = lowerIsBetter ? value < 0 : value > 0;
      const isNegative = lowerIsBetter ? value > 0 : value < 0;
      return (
        <span
          className={`pointer-events-none ${
            isPositive
              ? "text-kpi-positive"
              : isNegative
                ? "text-kpi-negative"
                : "text-fg-secondary"
          }`}
        >
          {formattedValue}
        </span>
      );
    }
    return <span className="text-fg-secondary pointer-events-none">-</span>;
  }
  return <span className="loading-cell h-2 bg-surface-subtle rounded w-full inline-block" />;
}

export function PivotShowMoreCell({
  row,
  value,
  assembled,
  hasNestedDimensions = false,
}: {
  row: Row<PivotDataRow>;
  value: string;
  assembled?: boolean;
  hasNestedDimensions?: boolean;
}) {
  const effectiveAssembled = assembled ?? usePivotAssembled();
  const needsSpacer = row.depth >= 1 || hasNestedDimensions;
  return (
    <div
      className="flex items-center gap-x-0.5 h-full"
      style={{ paddingLeft: `${row?.depth * 14}px` }}
    >
      {needsSpacer ? <Spacer size="16px" /> : null}
      <Tooltip label={value}>
        <span
          className={effectiveAssembled ? "text-fg-primary" : "text-fg-disabled text-primary-600 cursor-pointer"}
        >
          Show more ...
        </span>
      </Tooltip>
    </div>
  );
}

export function PercentageChange({
  isNull = false,
  inTable = false,
  showPosSign = false,
  color = "!text-fg-secondary",
  customStyle = "",
  value,
  tabularNumber = true,
  assembled,
  lowerIsBetter = false,
}: {
  isNull?: boolean;
  inTable?: boolean;
  showPosSign?: boolean;
  color?: string;
  customStyle?: string;
  value: string | number | null | undefined;
  tabularNumber?: boolean;
  assembled?: boolean;
  lowerIsBetter?: boolean;
}) {
  const effectiveAssembled = assembled ?? usePivotAssembled();
  const isNoData = value === null || value === undefined;
  if (isNoData) {
    return <span className="text-fg-secondary">-</span>;
  }
  if (value !== null && effectiveAssembled) {
    const numeric = typeof value === "number" ? value : parseFloat(value);
    const diffIsNegative = numeric < 0;
    const diffIsPositive = numeric > 0;
    const isNegative = lowerIsBetter ? diffIsPositive : diffIsNegative;
    const isPositive = lowerIsBetter ? diffIsNegative : diffIsPositive;

    let display: ReactNode = value;
    if (typeof value === "number") {
      const approxSign = Math.abs(value) < 0.005 ? "~" : "";
      const posSign = !diffIsNegative && !approxSign && showPosSign ? "+" : "";
      display = (
        <>
          {approxSign}
          {posSign}
          {Math.round(100 * value)}
          <span className="opacity-50">%</span>
        </>
      );
    } else {
      display = value;
    }

    return (
      <span
        className={`${tabularNumber ? "ui-copy-number" : ""} w-full ${
          customStyle
        } ${inTable ? "block text-right" : ""} pointer-events-none`}
      >
        <span
          className={`${color} ${
            isNegative
              ? "text-kpi-negative"
              : isPositive
                ? "text-kpi-positive"
                : ""
          }`}
        >
          {display}
        </span>
      </span>
    );
  }
  return null;
}
