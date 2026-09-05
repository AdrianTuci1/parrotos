import Button from "./Button";
import { DimensionFilterMode } from "@rilldata/web-common/features/dashboards/filters/dimension-filters/constants";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";

export interface DimensionFilterFooterProps {
  mode: DimensionFilterMode;
  excludeMode: boolean;
  allSelected: boolean;
  disableApplyButton: boolean;
  onToggleExcludeMode: (checked: boolean) => void;
  onToggleSelectAll: () => void;
  onApply: () => void;
}

/**
 * React translation of `DimensionFilterFooter.svelte`. Renders the include/exclude
 * toggle plus either the Select mode "select all / deselect all" button or the
 * "Apply" button for InList/Contains modes.
 */
export default function DimensionFilterFooter({
  mode,
  excludeMode,
  allSelected,
  disableApplyButton,
  onToggleExcludeMode,
  onToggleSelectAll,
  onApply,
}: DimensionFilterFooterProps) {
  return (
    <footer className="h-[42px] flex-row flex-none items-center justify-between gap-x-2 p-2 px-3.5 border-t bg-popover-footer">
      <div className="flex items-center gap-x-1.5">
        <ToggleSwitch
          checked={excludeMode}
          id="include-exclude"
          small
          ariaLabel={m.dashboard_include_exclude_toggle()}
          onCheckedChange={onToggleExcludeMode}
        />
        <label
          htmlFor="include-exclude"
          className="text-sm font-medium leading-none font-normal text-xs"
        >
          {m.dashboard_exclude()}
        </label>
      </div>
      <div className="flex gap-2">
        {mode === DimensionFilterMode.Select ? (
          <Button onClick={onToggleSelectAll} type="tertiary">
            {allSelected ? m.dashboard_deselect_all() : m.dashboard_select_all()}
          </Button>
        ) : (
          <Button
            onClick={onApply}
            type="primary"
            className="justify-end"
            disabled={disableApplyButton}
          >
            {m.common_apply()}
          </Button>
        )}
      </div>
    </footer>
  );
}

/**
 * Minimal React stand-in for the bits-ui `Switch` used by the Svelte footer.
 * Reproduces the small toggle thumb/positioning classes.
 */
export function ToggleSwitch({
  checked,
  id,
  small = false,
  ariaLabel,
  onCheckedChange,
}: {
  checked: boolean;
  id?: string;
  small?: boolean;
  ariaLabel?: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={`peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary-400" : "bg-gray-400"
      } ${small ? "h-3 w-[22px]" : "h-[20px] w-[36px]"}`}
      onClick={() => onCheckedChange(!checked)}
    >
      <span
        className={`pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform ${
          small ? "h-2.5 w-2.5" : "h-4 w-4"
        } ${
          checked
            ? small
              ? "translate-x-[9px]"
              : "translate-x-4"
            : small
              ? "-translate-x-[1px]"
              : "translate-x-0"
        }`}
      />
    </button>
  );
}
