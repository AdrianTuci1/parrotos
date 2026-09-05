/**
 * React translation of
 * `features/dashboards/leaderboard/LeaderboardCell.svelte`.
 *
 * Renders a leaderboard `<td>` cell as the trigger of a hover tooltip. On hover
 * / focus the cell reports its value to the shared `cellInspectorStore`; shift
 * + click copies the value to the clipboard. The Svelte `bits-ui` `Tooltip.Root`
 * is replaced with a self-contained positioned tooltip anchored to the cell so
 * the `<td>` remains a valid table child.
 */
import { useEffect, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { cellInspectorStore } from "@rilldata/web-common/features/dashboards/stores/cell-inspector-store";
import { TOOLTIP_STRING_LIMIT } from "@rilldata/web-common/layout/config";
import {
  copyToClipboard,
  isClipboardApiSupported,
} from "@rilldata/web-common/lib/actions/copy-to-clipboard";
import { Shortcut, StackingWord } from "./primitives";

const HideLeaderboardTooltipAfter = 3000;

export interface LeaderboardCellProps {
  value: string;
  tooltipValue?: string;
  cellType: "dimension" | "measure" | "comparison";
  className?: string;
  background?: string;
  /** Slot content rendered inside the cell (children in Svelte). */
  children?: ReactNode;
}

export default function LeaderboardCell({
  value,
  tooltipValue = value,
  cellType,
  className = "",
  background = "",
  children,
}: LeaderboardCellProps) {
  const [tooltipActive, setTooltipActive] = useState(false);

  const clipboardSupported =
    typeof navigator !== "undefined" ? isClipboardApiSupported() : false;
  const disabled = !clipboardSupported;

  useEffect(() => {
    if (!tooltipActive) return;
    if (disabled) {
      setTooltipActive(false);
      return;
    }
    const hideTimer = setTimeout(() => setTooltipActive(false), HideLeaderboardTooltipAfter);
    return () => clearTimeout(hideTimer);
  }, [tooltipActive, disabled]);

  function shiftClickHandler(label: string) {
    let truncatedLabel = label?.toString();
    if (truncatedLabel?.length > TOOLTIP_STRING_LIMIT) {
      truncatedLabel = `${truncatedLabel.slice(0, TOOLTIP_STRING_LIMIT)}...`;
    }
    copyToClipboard(
      label,
      `copied dimension value "${truncatedLabel}" to clipboard`,
    );
  }

  function handleClick(e: MouseEvent) {
    // The Svelte `modified` action is reduced to its shift branch here (the
    // `click` branch has no handler in the source).
    if (e.shiftKey) {
      e.preventDefault();
      shiftClickHandler(value);
    }
  }

  const showTooltip = tooltipActive && clipboardSupported && !disabled;

  // The Svelte cell scoped `<style>` blocks are folded into Tailwind utility
  // classes here so the dimension / comparison cells keep their sticky and
  // transparent styling.
  const typeClasses =
    cellType === "dimension"
      ? "sticky left-0 z-30 bg-surface-background"
      : cellType === "comparison"
        ? "bg-transparent px-1 truncate"
        : "";

  return (
    <td
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onPointerOver={() => cellInspectorStore.updateValue(value, tooltipValue)}
      onFocus={() => cellInspectorStore.updateValue(value, tooltipValue)}
      onMouseLeave={() => setTooltipActive(false)}
      style={{ background }}
      className={`text-right p-0 px-2 relative ${cellType}-cell ${typeClasses} ${className}`}
    >
      {children}
      {showTooltip ? (
        <div
          className="flex flex-col max-w-[280px] gap-y-2 p-2 shadow-md bg-tooltip text-fg-inverse absolute z-50"
          style={{ top: "calc(100% + 16px)" }}
        >
          <span className="font-semibold !text-fg-inverse">{tooltipValue}</span>
          <div className="flex flex-row gap-x-6 items-baseline text-fg-disabled">
            <div>
              <StackingWord>{m.chart_copy_to_clipboard()}</StackingWord>{" "}
              {m.leaderboard_copy_value()}
            </div>
            <Shortcut>
              <span style={{ fontFamily: "var(--system)" }}>⇧</span>{" "}
              {m.leaderboard_shift_click()}
            </Shortcut>
          </div>
        </div>
      ) : null}
    </td>
  );
}
