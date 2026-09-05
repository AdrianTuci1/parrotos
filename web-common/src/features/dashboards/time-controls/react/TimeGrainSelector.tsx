import { useEffect, useMemo, useRef, useState } from "react";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { TIME_GRAIN } from "@rilldata/web-common/lib/time/config";
import {
  getAllowedTimeGrains,
  isGrainBigger,
} from "@rilldata/web-common/lib/time/grains";
import { translateGrainName } from "@rilldata/web-common/lib/time/new-grains";
import type { AvailableTimeGrain } from "@rilldata/web-common/lib/time/types";
import type { V1TimeGrain } from "@rilldata/web-common/runtime-client";
import { CaretDownIcon } from "../super-pill/new-time-dropdown/react/icons";

/**
 * React translation of `time-controls/TimeGrainSelector.svelte`. A dropdown that
 * selects the active dashboard time grain (e.g. "by day"). Reuses the framework-agnostic
 * `getAllowedTimeGrains` / `isGrainBigger` grain helpers and the `TIME_GRAIN` config.
 * The `DropdownMenu` / `CaretDownIcon` Svelte primitives are replaced by React stand-ins.
 */
export interface TimeGrainSelectorProps {
  tdd?: boolean;
  activeTimeGrain: V1TimeGrain | undefined;
  timeStart: string | undefined;
  timeEnd: string | undefined;
  minTimeGrain: V1TimeGrain | undefined;
  onTimeGrainSelect: (timeGrain: V1TimeGrain) => void;
  complete?: boolean;
  side?: "top" | "right" | "bottom" | "left";
}

type GrainOption = {
  main: string;
  key: V1TimeGrain;
};

export default function TimeGrainSelector({
  tdd = false,
  activeTimeGrain,
  timeStart,
  timeEnd,
  minTimeGrain,
  onTimeGrainSelect,
  complete = false,
  side = "bottom",
}: TimeGrainSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const timeGrainOptions = useMemo(
    () =>
      timeStart && timeEnd
        ? getAllowedTimeGrains(new Date(timeStart), new Date(timeEnd))
        : [],
    [timeStart, timeEnd],
  );

  const activeTimeGrainLabel =
    activeTimeGrain && TIME_GRAIN[activeTimeGrain as AvailableTimeGrain]?.label;

  const capitalizedLabel = activeTimeGrainLabel
    ? translateGrainName(activeTimeGrainLabel)
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : undefined;

  const timeGrains = useMemo(() => {
    if (!minTimeGrain) return [];
    return timeGrainOptions
      .filter((timeGrain) => !isGrainBigger(minTimeGrain, timeGrain.grain))
      .map(
        (timeGrain): GrainOption => ({
          main: translateGrainName(timeGrain.label),
          key: timeGrain.grain,
        }),
      );
  }, [minTimeGrain, timeGrainOptions]);

  // Close on outside click / Escape (Svelte DropdownMenu behavior).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Dropdown placement relative to the trigger (Svelte `DropdownMenu.Content {side}`).
  const popoverPosition =
    side === "right"
      ? "left-full top-0 ml-1"
      : side === "left"
        ? "right-full top-0 mr-1"
        : side === "top"
          ? "bottom-full left-0 mb-1"
          : "top-full left-0 mt-1";

  if (!activeTimeGrain || !timeGrainOptions.length || !minTimeGrain) {
    return null;
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={`flex items-center gap-x-1${tdd ? ` border h-7 rounded-full px-2 pl-2.5 bg-surface-background text-fg-primary hover:bg-surface-background${open ? " border-gray-400" : ""}` : ""}`}
        aria-label={m.dashboard_select_time_grain()}
        onClick={() => setOpen((o) => !o)}
        data-state={open ? "open" : "closed"}
      >
        <div className="items-center flex gap-x-1">
          <span>
            {tdd ? <span>{m.time_grain_time()}</span> : <span>{m.time_grain_by()}</span>}

            {tdd ? <span>{capitalizedLabel}</span> : <b>{capitalizedLabel}</b>}

            {complete ? <i className="ml-0.5">{m.time_grain_complete()}</i> : null}
          </span>
          <span className={`flex-none transition-transform ${open ? "-rotate-180" : ""}`}>
            <CaretDownIcon />
          </span>
        </div>
      </button>

      {open ? (
        <div className={`absolute z-50 ${popoverPosition} min-w-52 rounded-md border bg-popover text-popover-foreground shadow-md`}>
          {timeGrains.map((option) => (
            <button
              key={option.key}
              type="button"
              role="menuitemcheckbox"
              aria-checked={option.key === activeTimeGrain}
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-2 gap-x-2 text-xs uppercase hover:bg-popover-accent"
              onClick={() => {
                onTimeGrainSelect(option.key);
                setOpen(false);
              }}
            >
              <span className="flex flex-none h-3.5 w-3.5 items-center justify-center">
                {option.key === activeTimeGrain ? (
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : null}
              </span>
              <span className="capitalize">{option.main}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
