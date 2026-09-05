import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ElementType, MouseEvent, ReactNode } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { measureSupportsTotalsQuery } from "@rilldata/web-common/features/dashboards/state-managers/selectors/measures";
import { ExploreStateURLParams } from "@rilldata/web-common/features/dashboards/url-state/url-params";
import { EntityStatus } from "@rilldata/web-common/features/entity-management/types";
import { copyToClipboard } from "@rilldata/web-common/lib/actions/copy-to-clipboard";
import { createMeasureValueFormatter } from "@rilldata/web-common/lib/number-formatting/format-measure-value";
import { FormatPreset } from "@rilldata/web-common/lib/number-formatting/humanizer-types";
import type { NumberParts } from "@rilldata/web-common/lib/number-formatting/humanizer-types";
import { formatMeasurePercentageDifference } from "@rilldata/web-common/lib/number-formatting/percentage-formatter";
import { numberPartsToString } from "@rilldata/web-common/lib/number-formatting/utils/number-parts-utils";
import { isPercDiff } from "@rilldata/web-common/components/data-types/type-utils";
import type { PERC_DIFF } from "@rilldata/web-common/components/data-types/type-utils";
import { cellInspectorStore } from "@rilldata/web-common/features/dashboards/stores/cell-inspector-store";
import {
  getQueryServiceMetricsViewAggregationQueryOptions,
  type MetricsViewSpecMeasure,
  type V1Expression,
} from "@rilldata/web-common/runtime-client";
import type { RuntimeClient } from "@rilldata/web-common/runtime-client/v2";
import BigNumberTooltipContent from "./BigNumberTooltipContent";

export interface MeasureBigNumberProps {
  /** React-propagated runtime client (Svelte context is unavailable in React). */
  runtimeClient: RuntimeClient;
  measure: MetricsViewSpecMeasure;
  withTimeseries?: boolean;
  isMeasureExpanded?: boolean;
  metricsViewName: string;
  where?: V1Expression | undefined;
  timeDimension?: string | undefined;
  timeStart?: string | undefined;
  timeEnd?: string | undefined;
  comparisonTimeStart?: string | undefined;
  comparisonTimeEnd?: string | undefined;
  showComparison?: boolean;
  ready?: boolean;
  skipLink?: boolean;
}

/**
 * React translation of `features/dashboards/big-number/MeasureBigNumber.svelte`
 * (Phase 2.3-i: KPI card with totals + % change).
 *
 * Responsibilities kept faithful to the Svelte view:
 * - Two `MetricsViewAggregation` queries for the primary and comparison totals, driven
 *   through `@tanstack/react-query` (`useQuery` + `getQueryServiceMetricsViewAggregationQueryOptions`
 *   from the framework-agnostic runtime-client) instead of the svelte-query `createQuery...`.
 * - The Svelte `$:` reactive derivations (value, comparison value, % change, error/status,
 *   formatting, comparison delta classes) are re-expressed with `useMemo`/derived constants.
 * - The `WithTween`, `PercentageChange`, `Tooltip`, `InlineErrorIndicator` and `DelayedSpinner`
 *   Svelte components are translated to self-contained React stand-ins below (each referenced
 *   to its source), which is the same inline-stand-in convention used by the ported `Chart.tsx`.
 *
 * Deferred (documented runtime checks, see report): the React host must provide a
 * `QueryClientProvider` so `useQuery` resolves; the scoped Svelte `<style>` blocks
 * (`.shadow-grad:hover` gradient) are not transferred; `isMeasureExpanded` is treated as an
 * uncontrolled internal toggle (the Svelte source self-mutates the exported prop).
 */
export default function MeasureBigNumber(props: MeasureBigNumberProps) {
  const {
    runtimeClient,
    measure,
    withTimeseries = true,
    isMeasureExpanded = false,
    metricsViewName,
    where,
    timeDimension,
    timeStart,
    timeEnd,
    comparisonTimeStart,
    comparisonTimeEnd,
    showComparison = false,
    ready = true,
    skipLink = false,
  } = props;

  const measureName = measure.name ?? "";

  // Measures with required dimensions (e.g. a rolling window ordered by the time dimension)
  // produce one value per dimension value and have no single total, so we skip the totals
  // queries and show an explanatory hint instead.
  const supportsTotal = measureSupportsTotalsQuery(measure);

  // ── Primary totals query ──────────────────────────────────────────────────────────
  const primaryQuery = useQuery({
    ...getQueryServiceMetricsViewAggregationQueryOptions(runtimeClient, {
      metricsView: metricsViewName,
      measures: [{ name: measureName }],
      where,
      timeRange: { start: timeStart, end: timeEnd, timeDimension },
    }),
    enabled: ready && supportsTotal && (!!timeStart || !timeDimension) && !!measureName,
    placeholderData: keepPreviousData,
    refetchOnMount: false,
  });

  // ── Comparison totals query ───────────────────────────────────────────────────────
  const comparisonQuery = useQuery({
    ...getQueryServiceMetricsViewAggregationQueryOptions(runtimeClient, {
      metricsView: metricsViewName,
      measures: [{ name: measureName }],
      where,
      timeRange: {
        start: comparisonTimeStart,
        end: comparisonTimeEnd,
        timeDimension,
      },
    }),
    enabled:
      ready && supportsTotal && showComparison && !!comparisonTimeStart && !!measureName,
    placeholderData: keepPreviousData,
    refetchOnMount: false,
  });

  // ── Derive value, comparisonValue, status, errorMessage from queries ──────────────
  const value = (primaryQuery.data?.data?.[0]?.[measureName] as number | null) ?? null;
  const comparisonValue = showComparison
    ? (comparisonQuery.data?.data?.[0]?.[measureName] as number | undefined)
    : undefined;

  const isFetching = primaryQuery.isFetching || (showComparison && comparisonQuery.isFetching);
  const isError = primaryQuery.isError || comparisonQuery.isError;

  const status = isError
    ? EntityStatus.Error
    : isFetching
      ? EntityStatus.Running
      : EntityStatus.Idle;

  const errorMessage = isError
    ? (primaryQuery.error?.message ?? comparisonQuery.error?.message ?? undefined)
    : undefined;

  const comparisonPercChange =
    comparisonValue && value !== undefined && value !== null
      ? (value - comparisonValue) / comparisonValue
      : undefined;

  const measureValueFormatter = useMemo(
    () => createMeasureValueFormatter<null>(measure, "big-number"),
    [measure],
  );
  const measureValueFormatterTooltip = useMemo(
    () => createMeasureValueFormatter<null>(measure, "tooltip"),
    [measure],
  );
  const measureValueFormatterUnabridged = useMemo(
    () => createMeasureValueFormatter<null>(measure, "unabridged"),
    [measure],
  );

  const name = measure?.displayName || measure?.expression;

  const diff = value !== null && comparisonValue !== undefined ? value - comparisonValue : 0;
  const noChange = !comparisonValue;
  const isComparisonPositive = diff > 0;
  const isComparisonNegative = diff < 0;
  const lowerIsBetter = measure?.lowerIsBetter ?? false;
  // When comparisonValue < 0, dividing diff by a negative denominator flips the percentage
  // sign, so "positive %" actually means "value went lower". We flip lowerIsBetter to compensate.
  const lowerIsBetterForPerc =
    comparisonValue != null && comparisonValue < 0 ? !lowerIsBetter : lowerIsBetter;
  const comparisonDeltaColorClass = (lowerIsBetter ? isComparisonNegative : isComparisonPositive)
    ? "text-kpi-positive"
    : (lowerIsBetter ? isComparisonPositive : isComparisonNegative)
      ? "text-kpi-negative"
      : "text-fg-secondary";
  const deltaFontSemibold = lowerIsBetter ? isComparisonNegative : isComparisonPositive;

  const formattedDiff = `${isComparisonPositive ? "+" : ""}${measureValueFormatter(diff)}`;

  /** when the measure is a percentage, we don't show a percentage change. */
  const measureIsPercentage = measure?.formatPreset === FormatPreset.PERCENTAGE;

  // Base values for the primary total, also used to reset the tooltip/copy values when the
  // pointer leaves a comparison value. When the measure has no total, copying is disabled by
  // leaving the copy value undefined.
  const baseCopyValue = supportsTotal
    ? (measureValueFormatterUnabridged(value) ?? m.kpi_no_data())
    : undefined;
  const baseTooltipValue = supportsTotal
    ? (measureValueFormatterTooltip(value) ?? m.kpi_no_data())
    : m.kpi_no_total();
  const [copyValue, setCopyValue] = useState<string | undefined>(baseCopyValue);
  const [tooltipValue, setTooltipValue] = useState<string>(baseTooltipValue);

  useEffect(() => {
    setCopyValue(baseCopyValue);
    setTooltipValue(baseTooltipValue);
  }, [baseCopyValue, baseTooltipValue]);

  // Tweened values mirroring the Svelte `WithTween` slot output. The nullable live value is
  // passed through so the tween snaps to the first non-null value instead of animating 0→value
  // on first load (the Svelte WithTween only mounts once a value is present).
  const tweenedValue = useTweenedValue(value, 500);
  const tweenedComparisonPercChange = useTweenedValue(comparisonPercChange, 500);

  const tddHref = `?${ExploreStateURLParams.WebView}=tdd&${ExploreStateURLParams.ExpandedMeasure}=${measure.name}`;

  const [expanded, setExpanded] = useState(isMeasureExpanded);
  const useDiv = expanded || !withTimeseries || skipLink;

  const [suppressTooltip, setSuppressTooltip] = useState(false);
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shiftClickHandler = useCallback((number: string | undefined) => {
    if (number === undefined) return;
    copyToClipboard(number, `copied measure value "${number}" to clipboard`);
  }, []);

  const handleExpandMeasure = useCallback(() => {
    setExpanded(true);
  }, []);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (e.shiftKey) {
        // The card is an <a href={tddHref}> when !useDiv, so shift+click would otherwise both
        // copy the value AND open the TDD view. preventDefault() keeps it copy-only, matching
        // the Svelte `modified` action.
        e.preventDefault();
        shiftClickHandler(copyValue);
        return;
      }
      setSuppressTooltip(true);
      handleExpandMeasure();
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
      suppressTimerRef.current = setTimeout(() => setSuppressTooltip(false), 1000);
    },
    [copyValue, shiftClickHandler, handleExpandMeasure],
  );

  useEffect(
    () => () => {
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    },
    [],
  );

  const updateCellInspector = useCallback(() => {
    cellInspectorStore.updateValue(value, tooltipValue);
  }, [value, tooltipValue]);

  // The card is rendered as a link to the TDD view (transition/expand view) only when it is
  // not already expanded / a timeseries chart / skipLink; otherwise it is a plain div. Typed as
  // `ElementType` so the union's `href` prop type-checks.
  const Tag: ElementType = useDiv ? "div" : "a";

  return (
    <Tooltip
      suppress={suppressTooltip || isError}
      distance={8}
      location="right"
      alignment="start"
      content={
        <BigNumberTooltipContent
          measure={measure}
          value={tooltipValue}
          note={supportsTotal ? undefined : m.kpi_no_total_note()}
        />
      }
    >
      <Tag
        role={useDiv ? "presentation" : "button"}
        tabIndex={useDiv ? -1 : 0}
        className={`group big-number outline-border h-fit w-[138px] m-0.5 rounded p-2 font-normal items-start flex flex-col text-left flex-none${
          !useDiv ? " shadow-grad cursor-pointer" : ""
        }`}
        onClick={handleClick}
        href={!useDiv ? tddHref : undefined}
        style={{ minHeight: "85px" }}
      >
        <h2
          className="line-clamp-2 text-fg-muted hover:text-theme-700 group-hover:text-theme-700 font-semibold whitespace-normal"
          style={{ fontSize: withTimeseries ? "" : "0.8rem" }}
        >
          {name}
        </h2>
        <div
          role="button"
          className="text-fg-secondary relative w-full h-full overflow-hidden text-ellipsis"
          style={{ fontSize: withTimeseries ? "1.6rem" : "1.8rem", fontWeight: "light" }}
          onMouseOver={updateCellInspector}
          onFocus={updateCellInspector}
          tabIndex={0}
        >
          {!supportsTotal ? (
            <span className="text-fg-muted italic text-sm">{m.kpi_no_total()}</span>
          ) : value !== null && value !== undefined && status === EntityStatus.Idle ? (
            <>
              {measureValueFormatter(tweenedValue)}
              {showComparison && comparisonValue ? (
                <div className="flex items-baseline gap-x-3 text-sm">
                  {comparisonValue != null ? (
                    <div
                      role="complementary"
                      className={`w-fit max-w-full overflow-hidden text-ellipsis ${comparisonDeltaColorClass}${
                        deltaFontSemibold ? " font-semibold" : ""
                      }`}
                      onMouseEnter={() => {
                        setTooltipValue(measureValueFormatterTooltip(diff) ?? m.kpi_no_data());
                        setCopyValue(measureValueFormatterUnabridged(diff) ?? m.kpi_no_data());
                      }}
                      onMouseLeave={() => {
                        setTooltipValue(baseTooltipValue);
                        setCopyValue(baseCopyValue);
                      }}
                    >
                      {!noChange ? (
                        formattedDiff
                      ) : (
                        <span className="text-fg-muted italic" style={{ fontSize: ".9em" }}>
                          {m.kpi_no_change()}
                        </span>
                      )}
                    </div>
                  ) : null}
                  {comparisonPercChange != null && !noChange && !measureIsPercentage ? (
                    <div
                      role="complementary"
                      onMouseEnter={() => {
                        setTooltipValue(
                          numberPartsToString(
                            formatMeasurePercentageDifference(comparisonPercChange ?? 0),
                          ),
                        );
                        setCopyValue(
                          measureValueFormatterUnabridged(comparisonPercChange) ?? "no data",
                        );
                      }}
                      onMouseLeave={() => {
                        setTooltipValue(baseTooltipValue);
                        setCopyValue(baseCopyValue);
                      }}
                      className={`w-fit ${comparisonDeltaColorClass}${
                        deltaFontSemibold ? " font-semibold" : ""
                      }`}
                    >
                      <PercentageChange
                        tabularNumber={false}
                        lowerIsBetter={lowerIsBetterForPerc}
                        value={formatMeasurePercentageDifference(tweenedComparisonPercChange)}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : status === EntityStatus.Error ? (
            <div className="pt-1">
              <InlineErrorIndicator message={errorMessage} />
            </div>
          ) : status === EntityStatus.Running ? (
            <div className={`absolute p-2${withTimeseries ? " bottom-0" : ""}`}>
              <DelayedSpinner isLoading={status === EntityStatus.Running} size="24px" />
            </div>
          ) : value === null ? (
            <span className="text-fg-muted italic text-sm">{m.kpi_no_data()}</span>
          ) : (
            <span className="text-fg-muted italic text-sm">{m.kpi_not_available()}</span>
          )}
        </div>
      </Tag>
    </Tooltip>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────
// Inline React stand-ins for the Svelte components used by MeasureBigNumber.
// Each is referenced to its source; they live here (not in sibling react/ subfolders) to
// keep the increment self-contained, mirroring how the ported `Chart.tsx` inlines its
// `SpinnerPlaceholder` / `ComponentErrorPlaceholder` stand-ins.
// ─────────────────────────────────────────────────────────────────────────────────────

/**
 * React translation of the `WithTween.svelte` slot-output tween (easeOutCubic, rAF).
 *
 * The target is nullable so the caller can pass the live query value directly. On the first
 * transition from null/undefined to a real number the display and tween origin are snapped to the
 * target with no animation, matching the Svelte `WithTween`, which only mounts inside the
 * `value !== null` branch and so appears instantly at the value on first load. Subsequent
 * non-null → non-null changes tween normally. Until a real value arrives the display is held at
 * `(target ?? 0)` and never animated, so a KPI card does not count up from 0 when data first lands.
 */
function useTweenedValue(target: number | null | undefined, duration = 500): number {
  const [display, setDisplay] = useState(target ?? 0);
  const fromRef = useRef(target ?? 0);
  const seenNonNullRef = useRef(false);

  useEffect(() => {
    if (target === null || target === undefined) {
      // No real value yet; hold the current display and do not animate.
      return;
    }
    if (!seenNonNullRef.current) {
      // First non-null value: snap to it with no animation (Svelte WithTween mounts fresh here).
      seenNonNullRef.current = true;
      fromRef.current = target;
      setDisplay(target);
      return;
    }
    const from = fromRef.current;
    if (from === target || duration <= 0) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const current = from + (target - from) * eased;
      fromRef.current = current;
      setDisplay(current);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  suppress?: boolean;
  distance?: number;
  location?: "left" | "right" | "top" | "bottom";
  alignment?: "start" | "middle" | "end";
  activeDelay?: number;
}

/**
 * Simplified React translation of `Tooltip.svelte` (which relies on `hoverIntent` + a floated
 * positioning lib). Renders the content on hover after `activeDelay`, positioned relative to the
 * target. The `display: contents` wrapper of the Svelte version is replaced with an
 * `inline-block relative` box so the absolutely-positioned content can anchor to it.
 */
function Tooltip({
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
  location: "left" | "right" | "top" | "bottom",
  alignment: "start" | "middle" | "end",
  distance: number,
): CSSProperties {
  const d = `${distance}px`;
  const vertical: CSSProperties =
    alignment === "middle"
      ? { top: "50%", transform: "translateY(-50%)" }
      : alignment === "end"
        ? { bottom: 0 }
        : { top: 0 };
  const horizontal: CSSProperties = alignment === "end" ? { right: 0 } : { left: 0 };
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

interface PercentageChangeProps {
  value: string | number | undefined | null | NumberParts | PERC_DIFF;
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
 * React translation of `PercentageChange.svelte` (+ its `Base.svelte` wrapper). Mirrors the
 * NumberParts branch (used here) and the raw-number branch, plus the `-` no-data rendering.
 */
function PercentageChange({
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

  const isNoData = isPercDiff(value) || value === null || value === undefined;

  if (!isNoData && value !== null && value !== undefined && typeof value !== "number") {
    const intPart = +value.int;
    const fracPart = +value.frac / 10 ** value.frac.length;
    intValue = Math.round(intPart + fracPart).toString();
    diffIsNegative = value.neg === "-";
    diffIsPositive = !diffIsNegative && !value.approxZero && +value.int !== 0;
    negSign = diffIsNegative && !value.approxZero ? "-" : "";
    approxSign = value.approxZero ? "~" : "";
    posSign = !diffIsNegative && !approxSign && showPosSign ? "+" : "";
    suffix = value.suffix ?? "";
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

  const classes = `${tabularNumber ? "ui-copy-number" : ""} w-full ${customStyle} ${
    inTable ? "block text-right" : ""
  } pointer-events-none`;

  return (
    <span className={`${classes} ${color || "text-fg-primary"} select-text`}>
      {isNull ? (
        <span className="text-fg-secondary">-</span>
      ) : isNoData ? (
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

/** React translation of `DelayedSpinner.svelte` (delays the spinner so it doesn't flicker). */
function DelayedSpinner({
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

/** React translation of `InlineErrorIndicator.svelte` (tooltip-v2 popover simplified to `title`). */
function InlineErrorIndicator({
  message,
  compact = false,
}: {
  message: string | undefined;
  compact?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-fg-secondary text-xs"
      title={message || m.dashboard_no_additional_details()}
      aria-label={m.dashboard_error_occurred_hover()}
    >
      <AlertTriangleIcon />
      {!compact ? <span>{m.dashboard_error_occurred()}</span> : null}
    </span>
  );
}

/** React stand-in for the `lucide-svelte` `AlertTriangleIcon` path. */
function AlertTriangleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="16px"
      height="16px"
      className="text-red-500"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
