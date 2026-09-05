import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import type { MetricsViewSpecDimension } from "@rilldata/web-common/runtime-client";
import type { FilterManager } from "@rilldata/web-common/features/canvas/stores/filter-manager";
import type { MeasureFilterEntry } from "@rilldata/web-common/features/dashboards/filters/measure-filters/measure-filter-entry";
import type { MeasureFilterItem } from "@rilldata/web-common/features/dashboards/state-managers/selectors/measure-filters";
import MeasureFilterBody from "./MeasureFilterBody";
import MeasureFilterForm from "./MeasureFilterForm";
import MeasureChip from "./Chip";

export type MeasureFilterSide = "top" | "right" | "bottom" | "left";

export interface MeasureFilterProps {
  filterData: MeasureFilterItem;
  openOnMount?: boolean;
  allDimensions: MetricsViewSpecDimension[];
  side?: MeasureFilterSide;
  toggleFilterPin?: FilterManager["actions"]["toggleFilterPin"];
  toggleFilterRequired?: FilterManager["actions"]["toggleFilterRequired"];
  onRemove: () => void;
  onApply: (params: {
    dimension: string;
    oldDimension: string;
    filter: MeasureFilterEntry;
  }) => void;
}

/**
 * React translation of `MeasureFilter.svelte`. Renders the interactive measure filter
 * chip and, when open, the threshold / subquery edit form in a popover. The Svelte
 * `Popover.Root` / `Popover.Trigger` / Tooltip wrappers are replaced by a plain
 * absolutely-positioned popover with outside-click + Escape dismissal, matching the
 * approach taken by `DimensionFilter.tsx`.
 */
export default function MeasureFilter({
  filterData,
  openOnMount = false,
  allDimensions,
  side = "bottom",
  toggleFilterPin,
  toggleFilterRequired,
  onRemove,
  onApply,
}: MeasureFilterProps) {
  const { filter, pinned, label, measures, dimensionName, name, required, missingRequired } =
    filterData;

  const [open, setOpen] = useState(
    () => openOnMount && !filterData.filter,
  );
  const [curPinned, setCurPinned] = useState(pinned);
  const [curRequired, setCurRequired] = useState(required);
  const containerRef = useRef<HTMLDivElement>(null);

  const metricsViewNames = useMemo(
    () => (measures ? Array.from(measures.keys()) : []),
    [measures],
  );

  const displayDimensionName =
    allDimensions.find((d) => d.name === dimensionName)?.displayName ?? "";

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        if (pinned !== curPinned) {
          toggleFilterPin?.(name, metricsViewNames);
        }
        if (required !== curRequired) {
          toggleFilterRequired?.(name, metricsViewNames);
        }
      }
    },
    [
      pinned,
      curPinned,
      required,
      curRequired,
      toggleFilterPin,
      toggleFilterRequired,
      name,
      metricsViewNames,
    ],
  );

  const toggleOpen = useCallback(() => {
    const nextOpen = !open;
    setOpen(nextOpen);
    handleOpenChange(nextOpen);
  }, [open, handleOpenChange]);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const handleFormApply = useCallback(
    (params: {
      dimension: string;
      oldDimension: string;
      filter: MeasureFilterEntry;
    }) => {
      if (pinned !== curPinned) {
        toggleFilterPin?.(name, metricsViewNames);
      }
      if (required !== curRequired) {
        toggleFilterRequired?.(name, metricsViewNames);
      }
      onApply(params);
    },
    [
      pinned,
      curPinned,
      required,
      curRequired,
      toggleFilterPin,
      toggleFilterRequired,
      name,
      metricsViewNames,
      onApply,
    ],
  );

  // Close on outside click / Escape (Svelte `Popover.Root` + `svelte:window`).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeMenu]);

  const tooltipBody = missingRequired
    ? m.dashboard_filter_required_set_value()
    : m.dashboard_click_to_edit_values();
  const tooltipTitle = `${name} ${
    required ? m.dashboard_required_measure() : label || ""
  }`;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <MeasureChip
        active={open}
        gray={!filter}
        error={!!missingRequired}
        theme
        label={label}
        title={`${tooltipTitle}: ${tooltipBody}`}
        removable={!curPinned && !required}
        removeTooltipText={m.dashboard_remove_label({ label })}
        onRemove={onRemove}
        onToggleOpen={toggleOpen}
      >
        <MeasureFilterBody
          dimensionName={displayDimensionName}
          filter={filter}
          label={label}
        />
      </MeasureChip>

      {open ? (
        <MeasureFilterForm
          dimensionName={dimensionName}
          name={name}
          label={label}
          filter={filter}
          onApply={handleFormApply}
          onClose={closeMenu}
          allDimensions={allDimensions}
          side={side}
          pinned={curPinned}
          showPinControl={!!toggleFilterPin}
          required={curRequired}
          showRequiredControl={!!toggleFilterRequired}
          onTogglePin={() => setCurPinned((p) => !p)}
          onToggleRequired={() => setCurRequired((r) => !r)}
        />
      ) : null}
    </div>
  );
}
