import type { ReactNode } from "react";
import { CancelCircleIcon, PinIcon } from "./icons";

export interface MeasureChipProps {
  /** Whether the associated popover is open (highlights the chip). */
  active?: boolean;
  /** Muted "no value set" styling. */
  gray?: boolean;
  /** Required-but-missing error styling. */
  error?: boolean;
  /** Apply the `theme` (secondary) color variant. */
  theme?: boolean;
  /** Read-only chips render a static span instead of a clickable button. */
  readOnly?: boolean;
  /** Show the pinned indicator instead of the remove affordance. */
  showPinnedIcon?: boolean;
  removable?: boolean;
  label?: string;
  removeTooltipText?: string;
  title?: string;
  onRemove?: () => void;
  onToggleOpen?: () => void;
  children?: ReactNode;
}

const base =
  "flex gap-x-1 items-center justify-center px-2 py-[3px] border w-full max-w-fit truncate rounded-sm";

/**
 * React stand-in for `Chip.svelte` restricted to the `measure` type variant used by
 * `MeasureFilter`. Renders the remove affordance (or pinned icon) plus the slot body;
 * the body is a `button` in the interactive case and a static `span` when read-only.
 */
export default function MeasureChip({
  active = false,
  gray = false,
  error = false,
  readOnly = false,
  showPinnedIcon = false,
  removable = false,
  label,
  removeTooltipText,
  title,
  onRemove,
  onToggleOpen,
  children,
}: MeasureChipProps) {
  // Priority order mirrors `Chip.svelte` CSS cascade: error > gray > active > base.
  const stateClass = error
    ? "bg-red-50 border-red-400 text-red-700"
    : gray
      ? "bg-gray-100 border-gray-300 text-fg-secondary"
      : active
        ? "bg-theme-secondary-100 border-theme-secondary-400 text-theme-secondary-800"
        : "bg-theme-secondary-50 border-theme-secondary-200 text-theme-secondary-800";

  return (
    <div
      className={`${base} ${stateClass} ${readOnly ? "pointer-events-none" : ""} theme`}
      aria-label={label}
      title={title}
    >
      {removable && !readOnly ? (
        <button
          type="button"
          className="text-inherit mr-0.5"
          aria-label="Remove"
          title={removeTooltipText}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
        >
          <CancelCircleIcon size="16px" />
        </button>
      ) : showPinnedIcon ? (
        <div className="flex-none">
          <PinIcon size="16px" pinned />
        </div>
      ) : null}

      {readOnly ? (
        <span className="text-inherit w-full select-none truncate flex items-center justify-between gap-x-1 px-0.5">
          {children}
        </span>
      ) : (
        <button
          type="button"
          className="text-inherit w-full select-none truncate flex items-center justify-between gap-x-1 px-0.5"
          aria-label={`Open ${label}`}
          onClick={onToggleOpen}
        >
          {children}
        </button>
      )}
    </div>
  );
}
