import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { matchSorter } from "match-sorter";
import type {
  MetricsViewSpecDimension,
  MetricsViewSpecMeasure,
} from "@rilldata/web-common/runtime-client";
import type { SearchableFilterSelectableGroup } from "@rilldata/web-common/components/searchable-filter-menu/SearchableFilterSelectableItem";
import {
  getDimensionDisplayName,
  getMeasureDisplayName,
} from "@rilldata/web-common/features/dashboards/filters/getDisplayName";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";

export type FilterButtonSide = "top" | "right" | "bottom" | "left";

export interface FilterButtonProps {
  allDimensions: MetricsViewSpecDimension[];
  filteredSimpleMeasures: MetricsViewSpecMeasure[];
  dimensionHasFilter: (dimensionName: string) => boolean;
  measureHasFilter: (measureName: string) => boolean;
  setTemporaryFilterName: (name: string) => void;
  addBorder?: boolean;
  side?: FilterButtonSide;
}

function truncateLabel(label: string): string {
  return label.length > 240 ? `${label.slice(0, 240)}...` : label;
}

/**
 * React translation of `FilterButton.svelte` (the "+" add-filter menu).
 *
 * Renders the add-filter trigger and a searchable dropdown listing the remaining
 * dimensions and simple measures (those not already filtered). Selecting an item
 * sets the temporary filter name via the host callback. The Svelte
 * `DropdownMenu.Root` / `SearchableMenuContent` primitives are replaced by a plain
 * absolutely-positioned popover with outside-click + Escape dismissal and a
 * `matchSorter`-driven search, matching the approach used by `DimensionFilter.tsx`.
 */
export default function FilterButton({
  allDimensions,
  filteredSimpleMeasures,
  dimensionHasFilter,
  measureHasFilter,
  setTemporaryFilterName,
  addBorder = true,
  side = "bottom",
}: FilterButtonProps) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectableGroups = useMemo<SearchableFilterSelectableGroup[]>(
    () => [
      {
        name: m.filter_dimensions(),
        items:
          allDimensions
            ?.map((d) => ({
              name: (d.name || d.column) as string,
              label: getDimensionDisplayName(d),
            }))
            .filter((d) => !dimensionHasFilter(d.name)) ?? [],
      },
      {
        name: m.filter_measures(),
        items:
          filteredSimpleMeasures
            ?.map((mm) => ({
              name: mm.name as string,
              label: getMeasureDisplayName(mm),
            }))
            .filter((mm) => !measureHasFilter(mm.name)) ?? [],
      },
    ],
    [
      allDimensions,
      filteredSimpleMeasures,
      dimensionHasFilter,
      measureHasFilter,
    ],
  );

  const filteredGroups = useMemo(() => {
    if (!searchText) return selectableGroups;
    return selectableGroups.map((group) => ({
      ...group,
      items: matchSorter(group.items, searchText, { keys: ["label"] }),
    }));
  }, [selectableGroups, searchText]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    // The Svelte `SearchableMenuContent` is unmounted when the dropdown closes, so its
    // local `searchText` resets on reopen. Mirror that here.
    setSearchText("");
  }, []);

  // Close on outside click / Escape (Svelte `DropdownMenu.Root` + `svelte:window`).
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
      if (event.key === "Escape") closeMenu();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeMenu]);

  const handleSelect = useCallback(
    (name: string) => {
      setTemporaryFilterName(name);
      closeMenu();
    },
    [setTemporaryFilterName, closeMenu],
  );

  const popoverPosition =
    side === "right"
      ? "left-full top-0 ml-1"
      : side === "left"
        ? "right-full top-0 mr-1"
        : side === "top"
          ? "bottom-full left-0 mb-1"
          : "top-full left-0 mt-1";

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        aria-label={m.dashboard_add_filter_button()}
        aria-haspopup="menu"
        aria-expanded={open}
        title={m.dashboard_add_filter()}
        className={`w-[34px] h-[26px] rounded-2xl flex items-center justify-center bg-surface-subtle hover:bg-gray-100 ${
          addBorder ? "border border-dashed border-gray-300" : ""
        } ${open ? "bg-gray-200" : ""}`}
        onClick={() => {
          if (open) {
            closeMenu();
          } else {
            setOpen(true);
          }
        }}
      >
        <AddIcon size="17px" />
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute z-50 flex flex-col max-h-96 w-72 overflow-hidden p-0 rounded-md border bg-popover text-popover-foreground shadow-md focus:outline-none ${popoverPosition}`}
        >
          <div className="px-3 pt-3 pb-1">
            <SearchInput
              value={searchText}
              onValueChange={setSearchText}
              label={m.common_search_list()}
              placeholder={m.common_search_list()}
            />
          </div>

          <div className="flex flex-col flex-1 overflow-y-auto w-full h-fit pb-1">
            {filteredGroups.map((group, index) => (
              <div key={group.name} className="px-1">
                {filteredGroups.length > 1 ? (
                  <div className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-fg-secondary font-semibold">
                    {group.label ?? group.name}
                  </div>
                ) : null}

                {group.items.length ? (
                  group.items.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      role="menuitem"
                      className="relative flex w-full gap-x-2 text-fg-primary select-none items-center rounded-sm py-1.5 px-2 text-xs outline-none hover:bg-popover-accent focus:bg-popover-accent cursor-pointer"
                      onClick={() => handleSelect(item.name)}
                    >
                      <span>{truncateLabel(item.label)}</span>
                    </button>
                  ))
                ) : (
                  <div
                    data-testid="searchable-menu-no-results"
                    className="text-fg-disabled text-center p-2 w-full"
                  >
                    {m.common_no_results()}
                  </div>
                )}

                {index !== filteredGroups.length - 1 ? (
                  <div className="h-px w-full bg-gray-200 my-1" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** React stand-in for the `Search` input component. */
function SearchInput({
  value,
  onValueChange,
  label,
  placeholder,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full">
      <span className="flex absolute inset-y-0 items-center pl-2 text-fg-secondary pointer-events-none">
        <SearchIcon size="16" />
      </span>
      <input
        type="text"
        autoComplete="off"
        className="outline-none block w-full pl-8 p-1 text-fg-secondary placeholder-fg-secondary h-[28px]"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </div>
  );
}

/** React stand-in for the `Search` icon. */
function SearchIcon({ size = "16" }: { size?: string | number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/** React stand-in for the `Add.svelte` icon. */
function AddIcon({ size = "16px", className = "" }: { size?: string; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.6667 8.66667H8.66671V12.6667H7.33337V8.66667H3.33337V7.33334H7.33337V3.33334H8.66671V7.33334H12.6667V8.66667Z" />
    </svg>
  );
}
