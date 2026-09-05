import type { CSSProperties } from "react";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import type { MetricsViewSpecMeasure } from "@rilldata/web-common/runtime-client";

export interface BigNumberTooltipContentProps {
  measure: MetricsViewSpecMeasure;
  /** Formatted measure value shown as the tooltip description. */
  value?: string;
  /** Optional explanatory note (shown instead of the copy-to-clipboard hint). */
  note?: string | undefined;
}

/**
 * React translation of `features/dashboards/big-number/BigNumberTooltipContent.svelte`.
 *
 * Renders the tooltip body for the KPI card: a bold name, the formatted value on the
 * right, the measure description, and either an explanatory note or the
 * "Copy / shift+click" hint. The Svelte `TooltipTitle` / `TooltipDescription` /
 * `TooltipShortcutContainer` / `StackingWord` / `Shortcut` primitives are collapsed into
 * equivalent className + inline-style markup (their scoped `<style>` blocks are not
 * transferred; `line-clamp-15` is expressed as an inline `-webkit-box` clamp).
 */
export default function BigNumberTooltipContent({
  measure,
  value = "",
  note,
}: BigNumberTooltipContentProps) {
  const description = measure?.description || measure?.displayName || measure?.expression;
  const name = measure?.displayName || measure?.expression;

  return (
    <div
      aria-label="tooltip-content"
      className="tooltip-content bg-tooltip shadow-md text-fg-inverse rounded p-2 pt-1 pb-1"
      style={{ maxWidth: "280px" }}
    >
      <div
        className="grid gap-x-2 pointer-events-none pt-1 pb-1 items-baseline"
        style={{ gridTemplateColumns: "auto max-content", minWidth: "200px" }}
      >
        <div className="font-bold text-fg-inverse truncate" aria-label="tooltip-name">
          {name}
        </div>
        <div
          className="text-fg-inverse justify-self-end pl-3"
          style={{ maxWidth: "280px" }}
          aria-label="tooltip-name-description"
        >
          {value}
        </div>
      </div>

      <p className="text-fg-inverse/70 my-1 w-full" style={lineClamp15}>
        {description}
      </p>

      {note ? (
        <p className="text-fg-inverse/70 my-1 w-full" style={lineClamp15}>
          {note}
        </p>
      ) : (
        <div
          className="grid gap-x-6 items-baseline dark:text-fg-muted text-gray-300 pb-1"
          style={{ gridTemplateColumns: "auto max-content" }}
        >
          <div>
            <span className="inline-block rounded-sm relative">
              {m.chart_copy_to_clipboard()}
            </span>{" "}
            {m.bignumber_copy_value()}
          </div>
          <div className="text-right dark:text-fg-secondary text-gray-400">
            <span style={{ fontFamily: "var(--system)" }}>⇧</span>{" "}
            {m.bignumber_shift_click()}
          </div>
        </div>
      )}
    </div>
  );
}

/** Inline replacement for the Svelte `.line-clamp-15` scoped style. */
const lineClamp15: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 15,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};
