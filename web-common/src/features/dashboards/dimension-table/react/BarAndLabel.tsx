import type { CSSProperties, ReactNode } from "react";

/**
 * React translation of `components/BarAndLabel.svelte` — the background
 * magnitude bar behind a table cell's value.
 *
 * The Svelte version tweens `value` into `--width`; here the width is applied
 * directly (no tween), which is visually equivalent once the bar is settled and
 * avoids re-introducing the `svelte/motion` dependency in React.
 */
export interface BarAndLabelProps {
  value?: number;
  color?: string;
  showBackground?: boolean;
  compact?: boolean;
  showHover?: boolean;
  customBackgroundColor?: string;
  justify?: string | boolean;
  children?: ReactNode;
}

export function BarAndLabel({
  value = 0,
  color = "",
  showBackground = true,
  compact = false,
  showHover = false,
  customBackgroundColor = "",
  justify = "end",
  children,
}: BarAndLabelProps) {
  const widthPct = Math.min(1, Math.max(0, value)) * 100;

  return (
    <div
      className={`text-right grid items-center ${justify ? `justify-${justify}` : ""} ${justify ? `justify-items-${justify}` : ""} relative w-full ${showHover ? "hover:bg-surface-hover" : ""} ${customBackgroundColor !== "" ? customBackgroundColor : showBackground ? "bg-surface-muted" : "bg-transparent"}`}
      style={{ flex: 1 }}
    >
      <div
        className={`number-bar ${color}`}
        style={{
          width: `${widthPct}%`,
          position: "absolute",
          top: "0",
          height: "100%",
          pointerEvents: "none",
        } as CSSProperties}
      />
      <div
        className={`${!compact ? "pl-2 pr-2" : "pr-1 pl-1"} text-right overflow-hidden`}
        style={{ position: "relative" }}
      >
        {children}
      </div>
    </div>
  );
}
