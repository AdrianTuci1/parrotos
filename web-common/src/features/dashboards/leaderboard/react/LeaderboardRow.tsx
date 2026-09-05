/**
 * React translation of `features/dashboards/leaderboard/LeaderboardRow.svelte`.
 *
 * Renders a single leaderboard row: the comparison gutter cell, the dimension
 * cell (with its relative-magnitude gradient bar / external-link), and one cell
 * per measure (value, percent-of-total, delta absolute, delta percent) with the
 * matching gradient bars and zig-zag overflow indicators.
 *
 * The Svelte `bind:contentRect` measurements that drive the shared
 * `valueColumn` / `deltaColumn` width stores are reproduced with `ResizeObserver`
 * so the row communicates the actual width of its value/delta cells just as the
 * Svelte version does.
 */
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { clamp } from "@rilldata/web-common/lib/clamp";
import { makeHref } from "@rilldata/web-common/features/dashboards/dashboard-utils";
import { formatMeasurePercentageDifference } from "@rilldata/web-common/lib/number-formatting/percentage-formatter";
import { numberPartsToString } from "@rilldata/web-common/lib/number-formatting/utils/number-parts-utils";
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import type { LeaderboardItemData } from "../leaderboard-utils";
import {
  COMPARISON_COLUMN_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  deltaColumn,
  MEASURES_PADDING,
  valueColumn,
} from "../leaderboard-widths";
import { ExternalLinkIcon } from "./icons";
import {
  FormattedDataType,
  LongBarZigZag,
  PercentageChange,
} from "./primitives";
import LeaderboardCell from "./LeaderboardCell";
import LeaderboardItemFilterIcon from "./LeaderboardItemFilterIcon";

export interface LeaderboardRowProps {
  itemData: LeaderboardItemData;
  dimensionName: string;
  borderTop?: boolean;
  borderBottom?: boolean;
  isBeingCompared: boolean;
  filterExcludeMode: boolean;
  atLeastOneActive: boolean;
  isTimeComparisonActive: boolean;
  leaderboardMeasureNames?: string[];
  // Measures that render context columns; see Leaderboard.tsx.
  measuresWithContext: Set<string>;
  isValidPercentOfTotal: (measureName: string) => boolean;
  dimensionColumnWidth: number;
  maxValues?: Record<string, number>;
  toggleDimensionValueSelection: (
    dimensionName: string,
    dimensionValue: string,
    keepPillVisible?: boolean | undefined,
    isExclusiveFilter?: boolean | undefined,
  ) => void;
  formatters: Record<
    string,
    (value: number | string | null | undefined) => string | null | undefined
  >;
  tooltipFormatters: Record<
    string,
    (value: number | string | null | undefined) => string | null | undefined
  >;
  lowerIsBetterMap?: Record<string, boolean>;
}

export default function LeaderboardRow({
  itemData,
  dimensionName,
  borderTop = false,
  borderBottom = false,
  isBeingCompared,
  filterExcludeMode,
  atLeastOneActive,
  isTimeComparisonActive,
  leaderboardMeasureNames = [],
  measuresWithContext,
  isValidPercentOfTotal,
  dimensionColumnWidth,
  maxValues = {},
  toggleDimensionValueSelection,
  formatters,
  tooltipFormatters,
  lowerIsBetterMap = {},
}: LeaderboardRowProps) {
  const [hovered, setHovered] = useState(false);
  const valueRef = useRef<HTMLDivElement>(null);
  const deltaRef = useRef<HTMLDivElement>(null);

  const valueColumnWidth = useReadable(valueColumn) ?? DEFAULT_COLUMN_WIDTH;
  const deltaColumnWidth = useReadable(deltaColumn) ?? COMPARISON_COLUMN_WIDTH;

  const {
    dimensionValue,
    selectedIndex,
    values,
    pctOfTotals,
    prevValues,
    deltaRels,
    deltaAbs: deltaAbsMap,
    uri,
  } = itemData;

  const selected = selectedIndex >= 0;

  // If there is not at least one "active" (selected) value, all items are
  // included (default behavior when no values are selected).
  const excluded = atLeastOneActive
    ? (filterExcludeMode && selected) || (!filterExcludeMode && !selected)
    : false;

  const previousValueString =
    leaderboardMeasureNames.length === 1 &&
    prevValues[leaderboardMeasureNames[0]] !== undefined &&
    prevValues[leaderboardMeasureNames[0]] !== null
      ? formatters[leaderboardMeasureNames[0]]?.(
          prevValues[leaderboardMeasureNames[0]] as number,
        )
      : undefined;

  const href = makeHref(uri, dimensionValue);

  // Report the width of this row's value / delta cells to the shared stores.
  useEffect(() => {
    const el = valueRef.current;
    if (!el) return;
    const update = () => valueColumn.update(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = deltaRef.current;
    if (!el) return;
    const update = () => deltaColumn.update(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const barColor = excluded
    ? "var(--surface-active)"
    : selected || hovered
      ? "var(--color-theme-200)"
      : "var(--color-theme-100)";

  // Bar width excluding the dimension column.
  const barWidth =
    valueColumnWidth +
    (leaderboardMeasureNames.length === 1
      ? dimensionColumnWidth
      : -MEASURES_PADDING);

  const barLengths = Object.fromEntries(
    Object.entries(values).map(([name, value]) => {
      const maxValue = maxValues[name];
      if (!value || !maxValue || maxValue <= 0) return [name, 0];
      return [name, (Math.abs(value) / maxValue) * barWidth];
    }),
  );

  const totalBarLength = Object.values(barLengths).reduce(
    (sum, length) => sum + (length as number),
    0,
  );

  const showZigZags = Object.fromEntries(
    Object.entries(barLengths).map(([name, length]) => [
      name,
      (length as number) > barWidth,
    ]),
  );

  const measureCellBarLengths = Object.fromEntries(
    Object.entries(barLengths).map(([name, length]) => [
      name,
      clamp(0, length as number, valueColumnWidth),
    ]),
  );

  const singleMeasure = leaderboardMeasureNames.length === 1;

  const dimensionGradients = singleMeasure
    ? `linear-gradient(to right, ${barColor} ${Math.min(dimensionColumnWidth, totalBarLength)}px, transparent ${Math.min(dimensionColumnWidth, totalBarLength)}px)`
    : undefined;

  const measureGradients = singleMeasure
    ? `linear-gradient(to right, ${barColor} ${Math.max(0, totalBarLength - dimensionColumnWidth)}px, transparent ${Math.max(0, totalBarLength - dimensionColumnWidth)}px)`
    : undefined;

  const measureGradientMap = singleMeasure
    ? undefined
    : Object.fromEntries(
        leaderboardMeasureNames.map((name) => {
          const length = measureCellBarLengths[name] as number;
          return [
            name,
            length
              ? `linear-gradient(to right, transparent ${MEASURES_PADDING}px, ${barColor} ${MEASURES_PADDING}px, ${barColor} ${length + MEASURES_PADDING}px, transparent ${length + MEASURES_PADDING}px)`
              : undefined,
          ];
        }),
      );

  const dimensionCellClass = `relative size-full flex flex-none justify-between items-center leaderboard-label ${
    atLeastOneActive ? "cursor-pointer" : ""
  } ${excluded ? "text-fg-disabled" : ""} ${
    !excluded && selected ? "text-fg-primary font-semibold" : ""
  }`;

  function onDimensionCellClick(e: MouseEvent) {
    // Check if user has selected text.
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      // User has selected text, don't trigger row selection.
      return;
    }
    toggleDimensionValueSelection(
      dimensionName,
      dimensionValue,
      false,
      e.ctrlKey || e.metaKey,
    );
  }

  return (
    <tr
      className={`relative ${borderBottom ? "border-b" : ""} ${borderTop ? "border-t" : ""}`}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        if (e.shiftKey) return;
        onDimensionCellClick(e);
      }}
    >
      <td data-comparison-cell>
        <LeaderboardItemFilterIcon
          excluded={excluded}
          isBeingCompared={isBeingCompared}
          selectionIndex={itemData?.selectedIndex}
        />
      </td>
      <LeaderboardCell
        value={dimensionValue}
        cellType="dimension"
        className={dimensionCellClass}
        background={dimensionGradients}
      >
        <span className="truncate select-text">
          <FormattedDataType value={dimensionValue} truncate />
        </span>

        {previousValueString && hovered ? (
          <span className="opacity-50 whitespace-nowrap font-normal">
            {previousValueString} →
          </span>
        ) : null}

        {href ? (
          <span className="external-link-wrapper relative">
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={href}
              title={href}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className={hovered ? "hovered" : ""}
            >
              <ExternalLinkIcon className="fill-primary-600" />
            </a>
          </span>
        ) : null}
      </LeaderboardCell>

      {leaderboardMeasureNames.map((measureName) => (
        <LeaderboardCell
          key={measureName}
          value={values[measureName]?.toString() || ""}
          tooltipValue={
            values[measureName] != null
              ? (tooltipFormatters[measureName]?.(values[measureName]) ??
                values[measureName]?.toString() ??
                "")
              : ""
          }
          cellType="measure"
          background={
            singleMeasure
              ? measureGradients
              : measureGradientMap?.[measureName]
          }
        >
          <div className="w-fit ml-auto bg-transparent" ref={valueRef}>
            <FormattedDataType
              type="INTEGER"
              value={values[measureName] ? formatters[measureName]?.(values[measureName]) : null}
            />
          </div>

          {showZigZags[measureName] &&
          !isTimeComparisonActive &&
          !isValidPercentOfTotal(measureName) ? (
            <LongBarZigZag />
          ) : null}
        </LeaderboardCell>
      ))}

      {leaderboardMeasureNames.map((measureName) => {
        if (
          !isValidPercentOfTotal(measureName) ||
          !measuresWithContext.has(measureName)
        ) {
          return null;
        }
        return (
          <LeaderboardCell
            key={`pct-${measureName}`}
            value={pctOfTotals[measureName]?.toString() || ""}
            tooltipValue={
              pctOfTotals[measureName] != null
                ? numberPartsToString(
                    formatMeasurePercentageDifference(pctOfTotals[measureName]),
                  )
                : ""
            }
            cellType="comparison"
          >
            <PercentageChange
              value={pctOfTotals[measureName]}
              color="text-fg-secondary"
            />
            {showZigZags[measureName] ? <LongBarZigZag /> : null}
          </LeaderboardCell>
        );
      })}

      {leaderboardMeasureNames.map((measureName) => {
        if (
          !isTimeComparisonActive ||
          !measuresWithContext.has(measureName)
        ) {
          return null;
        }
        return (
          <LeaderboardCell
            key={`deltaAbs-${measureName}`}
            value={deltaAbsMap[measureName]?.toString() || ""}
            tooltipValue={
              deltaAbsMap[measureName] != null
                ? (tooltipFormatters[measureName]?.(deltaAbsMap[measureName]) ??
                  deltaAbsMap[measureName]?.toString() ??
                  "")
                : ""
            }
            cellType="comparison"
          >
            <div className="w-fit ml-auto bg-transparent" ref={deltaRef}>
              <FormattedDataType
                color="text-fg-secondary"
                type="INTEGER"
                value={
                  deltaAbsMap[measureName]
                    ? formatters[measureName]?.(deltaAbsMap[measureName])
                    : null
                }
                customStyle={
                  deltaAbsMap[measureName] !== null &&
                  (lowerIsBetterMap[measureName]
                    ? deltaAbsMap[measureName] > 0
                    : deltaAbsMap[measureName] < 0)
                    ? "text-kpi-negative"
                    : deltaAbsMap[measureName] !== null &&
                        (lowerIsBetterMap[measureName]
                          ? deltaAbsMap[measureName] < 0
                          : deltaAbsMap[measureName] > 0)
                      ? "text-kpi-positive"
                      : ""
                }
                truncate={true}
              />
            </div>
          </LeaderboardCell>
        );
      })}

      {leaderboardMeasureNames.map((measureName) => {
        if (
          !isTimeComparisonActive ||
          !measuresWithContext.has(measureName)
        ) {
          return null;
        }
        return (
          <LeaderboardCell
            key={`deltaRel-${measureName}`}
            value={deltaRels[measureName]?.toString() || ""}
            tooltipValue={
              deltaRels[measureName] != null
                ? numberPartsToString(
                    formatMeasurePercentageDifference(deltaRels[measureName]),
                  )
                : ""
            }
            cellType="comparison"
          >
            <PercentageChange
              value={
                deltaRels[measureName]
                  ? formatMeasurePercentageDifference(deltaRels[measureName])
                  : null
              }
              color="text-fg-secondary"
              lowerIsBetter={lowerIsBetterMap[measureName] ?? false}
            />
            {showZigZags[measureName] ? <LongBarZigZag /> : null}
          </LeaderboardCell>
        );
      })}
    </tr>
  );
}
