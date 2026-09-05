import {
  DimensionFilterMode,
  DimensionFilterModeOptions,
} from "@rilldata/web-common/features/dashboards/filters/dimension-filters/constants";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";

const sizeClasses: Record<"sm" | "md" | "lg", string> = {
  sm: "h-6 text-[11px]",
  md: "h-7 text-xs",
  lg: "h-9 text-sm",
};

export interface DimensionFilterModeSelectorProps {
  mode: DimensionFilterMode;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  onModeChange?: (mode: DimensionFilterMode) => void;
}

/**
 * React translation of `DimensionFilterModeSelector.svelte`. Renders the
 * Select / InList / Contains mode picker as a styled native `<select>`.
 */
export default function DimensionFilterModeSelector({
  mode,
  disabled = false,
  size = "md",
  onModeChange = () => {},
}: DimensionFilterModeSelectorProps) {
  return (
    <select
      id="dimension-filter-mode-selector"
      className={`inline-flex flex-none select-none items-center justify-center rounded-l-[3px] border border-r-0 bg-input px-2 text-fg-primary outline-none focus-visible:border-primary-400 ${sizeClasses[size]}`}
      style={{ minWidth: 82 }}
      value={mode}
      disabled={disabled}
      aria-label={m.filter_mode_select()}
      onChange={(e) => onModeChange(e.target.value as DimensionFilterMode)}
    >
      {DimensionFilterModeOptions.map((option) => (
        <option key={option.value} value={option.value} title={option.description}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
