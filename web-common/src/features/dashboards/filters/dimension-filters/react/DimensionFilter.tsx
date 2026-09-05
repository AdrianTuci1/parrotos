import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { V1Expression } from "@rilldata/web-common/runtime-client";
import type { RuntimeClient } from "@rilldata/web-common/runtime-client/v2";
import type { FilterManager } from "@rilldata/web-common/features/canvas/stores/filter-manager";
import type { DimensionFilterItem } from "@rilldata/web-common/features/dashboards/state-managers/selectors/dimension-filters";
import { DimensionFilterMode } from "@rilldata/web-common/features/dashboards/filters/dimension-filters/constants";
import {
  getEffectiveSelectedValues,
  getItemLists,
  getSearchPlaceholder,
  shouldDisableApplyButton,
} from "@rilldata/web-common/features/dashboards/filters/dimension-filters/helpers";
import {
  mergeDimensionSearchValues,
  splitDimensionSearchText,
} from "@rilldata/web-common/features/dashboards/filters/dimension-filters/dimension-search-text-utils";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import {
  useDimensionSearchCount,
  useDimensionSearchResults,
} from "./useDimensionFilterValues";
import DimensionFilterChipBody from "./DimensionFilterChipBody";
import DimensionFilterFooter from "./DimensionFilterFooter";
import DimensionFilterModeSelector from "./DimensionFilterModeSelector";

type Actions = FilterManager["actions"];

const isUrlTooLongAfterInListFilterDefault = () => false;

export type DimensionFilterSide = "top" | "right" | "bottom" | "left";

export interface DimensionFilterProps {
  /** Runtime client (Svelte context is unavailable in React), forwarded to the queries. */
  client: RuntimeClient;
  filterData: DimensionFilterItem;
  expressionMap: Map<string, V1Expression>;
  openOnMount?: boolean;
  readOnly?: boolean;
  timeStart?: string;
  timeEnd?: string;
  timeDimension?: string;
  timeControlsReady?: boolean;
  smallChip?: boolean;
  side?: DimensionFilterSide;
  removeDimensionFilter: Actions["removeDimensionFilter"];
  applyDimensionInListMode: Actions["applyDimensionInListMode"];
  toggleDimensionValueSelections: Actions["toggleDimensionValueSelections"];
  applyDimensionContainsMode: Actions["applyDimensionContainsMode"];
  toggleDimensionFilterMode: Actions["toggleDimensionFilterMode"];
  toggleFilterPin?: Actions["toggleFilterPin"];
  toggleFilterRequired?: Actions["toggleFilterRequired"];
  isUrlTooLongAfterInListFilter?: (values: string[]) => boolean;
}

/**
 * React translation of `DimensionFilter.svelte`. Renders the interactive dimension
 * filter dropdown: searchable results list, include/exclude toggle, and
 * Select / InList / Contains modes.
 *
 * Reuses the framework-agnostic helpers (`helpers.ts`, `constants.ts`,
 * `dimension-search-text-utils.ts`) and the query builders from
 * `dimension-filter-values.ts`. The Svelte `useRuntimeClient()` / svelte-query primitives
 * are replaced by the `client` prop and the React hooks in `./useDimensionFilterValues`.
 */
export default function DimensionFilter(props: DimensionFilterProps) {
  const {
    client,
    filterData,
    expressionMap,
    openOnMount = true,
    readOnly = false,
    timeStart,
    timeEnd,
    timeDimension,
    timeControlsReady,
    smallChip = false,
    side = "bottom",
    removeDimensionFilter,
    applyDimensionInListMode,
    toggleDimensionValueSelections,
    applyDimensionContainsMode,
    toggleDimensionFilterMode,
    toggleFilterPin,
    toggleFilterRequired,
    isUrlTooLongAfterInListFilter = isUrlTooLongAfterInListFilterDefault,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(
    () => openOnMount && !filterData.selectedValues?.length && !filterData.inputText,
  );
  const [curMode, setCurMode] = useState(filterData.mode);
  const [curSearchText, setCurSearchText] = useState(filterData.inputText ?? "");
  const [curExcludeMode, setCurExcludeMode] = useState(filterData.isInclude === false);
  const [inListTooLong, setInListTooLong] = useState(false);
  const [selectedValuesProxy, setSelectedValuesProxy] = useState<string[]>(
    filterData.selectedValues ?? [],
  );
  const [searchedBulkValues, setSearchedBulkValues] = useState<string[]>(
    filterData.mode === DimensionFilterMode.InList
      ? (filterData.selectedValues ?? [])
      : [],
  );
  const [curPinned, setCurPinned] = useState(filterData.pinned);
  const [curRequired, setCurRequired] = useState(filterData.required);
  const [excludeModeDirty, setExcludeModeDirty] = useState(false);

  const {
    name,
    label,
    mode,
    selectedValues = [],
    inputText,
    isInclude,
    dimensions,
    pinned,
    required,
    missingRequired,
  } = filterData;

  const metricsViewNames = useMemo(
    () => Array.from(dimensions.keys()),
    [dimensions],
  );
  const excludeMode = isInclude === false;
  const sanitisedSearchText = inputText?.replace(/^%/, "").replace(/%$/, "");

  const enableSearchQuery =
    Boolean(timeControlsReady && open) &&
    (curMode === DimensionFilterMode.Select ||
      (curMode === DimensionFilterMode.Contains && curSearchText.length > 0) ||
      (curMode === DimensionFilterMode.InList && searchedBulkValues.length > 0));

  const enableSearchCountQuery =
    Boolean(timeControlsReady) &&
    ((curMode === DimensionFilterMode.Contains && curSearchText.length > 0) ||
      (curMode === DimensionFilterMode.InList && searchedBulkValues.length > 0));

  const searchQueryValues =
    curMode === DimensionFilterMode.Select ? selectedValues : searchedBulkValues;

  const searchResultsState = useDimensionSearchResults(
    client,
    metricsViewNames,
    name,
    {
      mode: curMode,
      values: searchQueryValues,
      searchText: curSearchText,
      timeStart,
      timeEnd,
      timeDimension,
      enabled: enableSearchQuery,
      metricsViewWheres: expressionMap,
    },
  );

  const searchCountState = useDimensionSearchCount(
    client,
    metricsViewNames,
    name,
    {
      mode: curMode,
      values: searchedBulkValues,
      searchText: curSearchText,
      timeStart,
      timeEnd,
      timeDimension,
      enabled: enableSearchCountQuery,
      metricsViewWheres: expressionMap,
    },
  );

  const correctedSearchResults = enableSearchQuery
    ? (searchResultsState.data ?? [])
    : [];
  const allSearchResultsCount = searchCountState.data;
  const isFetching = searchResultsState.isFetching || searchCountState.isFetching;
  const error = searchResultsState.error ?? searchCountState.error;

  const showExtraInfo = curMode !== DimensionFilterMode.Select;
  const searchPlaceholder = getSearchPlaceholder(curMode);
  const searchResultCountText = enableSearchCountQuery
    ? curMode === DimensionFilterMode.Contains
      ? `${allSearchResultsCount} results`
      : `${allSearchResultsCount} of ${searchedBulkValues.length} matched`
    : "0 results";

  const effectiveSelectedValues = getEffectiveSelectedValues(
    curMode,
    selectedValuesProxy,
    correctedSearchResults,
    selectedValues,
  );

  const allSelected = Boolean(
    effectiveSelectedValues.length &&
      correctedSearchResults.length === effectiveSelectedValues.length,
  );

  const disableApplyButton = shouldDisableApplyButton(
    curMode,
    enableSearchCountQuery,
    inListTooLong,
  );

  const { checkedItems, uncheckedItems } = getItemLists(
    curMode,
    correctedSearchResults,
    selectedValues,
    curSearchText,
  );

  // ── Reactive side-effects (Svelte `$:` equivalents) ─────────────────────────
  const checkSearchText = useCallback(
    (inputText: string) => {
      setInListTooLong(false);

      // Only InList mode parses bulk values. Other modes treat input as search text.
      if (curMode !== DimensionFilterMode.InList) return;

      const values = splitDimensionSearchText(inputText);

      if (values.length <= 1) {
        setSearchedBulkValues(inputText === "" ? [] : values);
        return;
      }

      // Include both existing selected values and new search values so the
      // below-fold query can find existing selected values that might not be
      // in the top 250.
      const merged = [...new Set([...selectedValues, ...values])];
      setSearchedBulkValues(merged);
      setInListTooLong(isUrlTooLongAfterInListFilter(merged));
    },
    [curMode, selectedValues, isUrlTooLongAfterInListFilter],
  );

  const resyncFilterData = useCallback((data: DimensionFilterItem) => {
    setCurMode(data.mode);
    setCurSearchText(data.inputText ?? "");
    setCurExcludeMode(data.isInclude === false);
    setExcludeModeDirty(false);
    setSelectedValuesProxy(data.selectedValues ?? []);
    setSearchedBulkValues(
      data.mode === DimensionFilterMode.InList
        ? (data.selectedValues ?? [])
        : [],
    );
    setCurPinned(data.pinned);
    setCurRequired(data.required);
  }, []);

  useEffect(() => {
    checkSearchText(curSearchText);
  }, [curSearchText, checkSearchText]);

  useEffect(() => {
    if (!open && excludeModeDirty && (isInclude === false) === curExcludeMode) {
      setExcludeModeDirty(false);
    }
  }, [open, excludeModeDirty, isInclude, curExcludeMode]);

  useEffect(() => {
    if (
      !open &&
      (mode !== curMode ||
        (!excludeModeDirty && (isInclude === false) !== curExcludeMode))
    ) {
      resyncFilterData(filterData);
    }
  }, [open, mode, curMode, excludeModeDirty, isInclude, curExcludeMode, filterData, resyncFilterData]);

  useEffect(() => {
    if (!open && mode === DimensionFilterMode.Select) {
      setSelectedValuesProxy(structuredClone(filterData.selectedValues) ?? []);
    }
  }, [open, mode, filterData.selectedValues]);

  // ── Handlers (Svelte `function` equivalents) ────────────────────────────────
  const resetFilterSettings = useCallback(
    (
      resetMode: DimensionFilterMode,
      sanitisedText: string | undefined,
    ) => {
      setCurExcludeMode(excludeMode);
      switch (resetMode) {
        case DimensionFilterMode.Select:
          setCurMode(DimensionFilterMode.Select);
          setCurSearchText("");
          setSelectedValuesProxy([...selectedValues]);
          break;
        case DimensionFilterMode.InList:
          setCurMode(DimensionFilterMode.InList);
          setCurSearchText(mergeDimensionSearchValues(selectedValues));
          setSearchedBulkValues(selectedValues);
          break;
        case DimensionFilterMode.Contains:
          setCurMode(DimensionFilterMode.Contains);
          setCurSearchText(sanitisedText ?? "");
          break;
      }
    },
    [excludeMode, selectedValues],
  );

  const applySelectModeChanges = useCallback(async () => {
    const currentValues = new Set(selectedValues);
    const proxyValues = new Set(selectedValuesProxy);
    const changedValues = [...currentValues, ...proxyValues].filter((value) => {
      const wasSelected = currentValues.has(value);
      const isSelected = proxyValues.has(value);
      return wasSelected !== isSelected;
    });
    const shouldToggleExcludeMode = curExcludeMode !== excludeMode;
    const shouldCommitSelectMode =
      mode !== DimensionFilterMode.Select && currentValues.size > 0;

    if (!currentValues.size && !proxyValues.size) return;

    if (shouldToggleExcludeMode && currentValues.size > 0) {
      await toggleDimensionFilterMode(name, metricsViewNames);
    }

    if (changedValues.length || shouldCommitSelectMode) {
      await toggleDimensionValueSelections(
        name,
        changedValues,
        metricsViewNames,
        undefined,
        undefined,
        curExcludeMode,
      );
    }
  }, [
    selectedValues,
    selectedValuesProxy,
    curExcludeMode,
    excludeMode,
    mode,
    name,
    metricsViewNames,
    toggleDimensionFilterMode,
    toggleDimensionValueSelections,
  ]);

  const handleOpenChange = useCallback(
    async (nextOpen: boolean) => {
      if (nextOpen) {
        setCurSearchText(
          mode === DimensionFilterMode.InList
            ? mergeDimensionSearchValues(selectedValues)
            : (sanitisedSearchText ?? ""),
        );
      } else {
        if (pinned !== curPinned) {
          toggleFilterPin?.(name, metricsViewNames);
        }
        if (required !== curRequired) {
          toggleFilterRequired?.(name, metricsViewNames);
        }

        if (curMode === DimensionFilterMode.Select) {
          await applySelectModeChanges();
          return;
        }

        if (selectedValues.length === 0 && !inputText) {
          await removeDimensionFilter(name, metricsViewNames);
        } else {
          resetFilterSettings(mode, sanitisedSearchText);
        }
      }
    },
    [
      mode,
      selectedValues,
      sanitisedSearchText,
      pinned,
      curPinned,
      required,
      curRequired,
      toggleFilterPin,
      toggleFilterRequired,
      curMode,
      applySelectModeChanges,
      inputText,
      removeDimensionFilter,
      name,
      metricsViewNames,
      resetFilterSettings,
    ],
  );

  const openMenu = useCallback(() => {
    handleOpenChange(true);
    setOpen(true);
  }, [handleOpenChange]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    handleOpenChange(false);
  }, [handleOpenChange]);

  // Bare `open = false` (Svelte `bind:open`) close. The Svelte source sets the bound
  // `open` flag directly so a programmatic close does not re-invoke `onOpenChange`.
  // `onApply` uses this so the Select-mode commit runs exactly once (the close from
  // apply must not call `handleOpenChange(false)`, which would commit again and flip
  // a value on then off).
  const closeWithoutApply = useCallback(() => {
    setOpen(false);
  }, []);

  const toggleOpen = useCallback(() => {
    if (open) closeMenu();
    else openMenu();
  }, [open, closeMenu, openMenu]);

  const handleToggleExcludeMode = useCallback((checked: boolean) => {
    setCurExcludeMode(checked);
    setExcludeModeDirty(true);
  }, []);

  const handleModeChange = useCallback(
    (newMode: DimensionFilterMode) => {
      // Mirror `bind:mode={curMode}` in the Svelte source: the native `<select>`
      // is controlled, so commit the mode here before running the side effects.
      setCurMode(newMode);
      setCurSearchText("");
      setSearchedBulkValues([]);
      setInListTooLong(false);
      if (newMode !== DimensionFilterMode.InList) {
        if (newMode === DimensionFilterMode.Select) {
          setCurExcludeMode(excludeMode);
          setSelectedValuesProxy([...selectedValues]);
        }
      }
    },
    [excludeMode, selectedValues],
  );

  const handleItemClick = useCallback(
    async (value: string) => {
      if (curMode === DimensionFilterMode.Select) {
        if (selectedValuesProxy.includes(value)) {
          setSelectedValuesProxy(
            selectedValuesProxy.filter((v) => v !== value),
          );
        } else {
          setSelectedValuesProxy([...selectedValuesProxy, value]);
        }
      } else {
        await toggleDimensionValueSelections(name, [value], metricsViewNames);
      }
    },
    [
      curMode,
      selectedValuesProxy,
      name,
      metricsViewNames,
      toggleDimensionValueSelections,
    ],
  );

  const onToggleSelectAll = useCallback(() => {
    if (curMode === DimensionFilterMode.Select) {
      if (allSelected) {
        setSelectedValuesProxy(
          selectedValuesProxy.filter(
            (v) => !correctedSearchResults.includes(v),
          ),
        );
      } else {
        const newValues =
          correctedSearchResults.filter(
            (v) => !selectedValuesProxy.includes(v),
          ) ?? [];
        setSelectedValuesProxy([...selectedValuesProxy, ...newValues]);
      }
    } else {
      correctedSearchResults.forEach((dimensionValue) => {
        if (!allSelected && effectiveSelectedValues.includes(dimensionValue))
          return;
        toggleDimensionValueSelections(
          name,
          [dimensionValue],
          metricsViewNames,
        ).catch(console.error);
      });
    }
  }, [
    curMode,
    allSelected,
    selectedValuesProxy,
    correctedSearchResults,
    effectiveSelectedValues,
    name,
    metricsViewNames,
    toggleDimensionValueSelections,
  ]);

  const onApply = useCallback(
    async (close = true) => {
      if (disableApplyButton) return;
      switch (curMode) {
        case DimensionFilterMode.Select:
          await applySelectModeChanges();
          if (close) closeWithoutApply();
          break;
        case DimensionFilterMode.InList:
          if (searchedBulkValues.length === 0) return;
          await applyDimensionInListMode(
            name,
            searchedBulkValues,
            metricsViewNames,
          );
          if (curExcludeMode !== excludeMode)
            await toggleDimensionFilterMode(name, metricsViewNames);
          if (close) closeWithoutApply();
          break;
        case DimensionFilterMode.Contains:
          if (curSearchText.length === 0) return;
          await applyDimensionContainsMode(
            name,
            curSearchText,
            metricsViewNames,
          );
          if (curExcludeMode !== excludeMode)
            await toggleDimensionFilterMode(name, metricsViewNames);
          if (close) closeWithoutApply();
          break;
      }
    },
    [
      disableApplyButton,
      curMode,
      applySelectModeChanges,
      searchedBulkValues,
      applyDimensionInListMode,
      name,
      metricsViewNames,
      curExcludeMode,
      excludeMode,
      toggleDimensionFilterMode,
      curSearchText,
      applyDimensionContainsMode,
      closeWithoutApply,
    ],
  );

  // Close on outside click / Escape, and Apply on Enter (like `svelte:window` keydown).
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
      } else if (event.key === "Enter") {
        event.preventDefault();
        onApply();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeMenu, onApply]);

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
      <ChipTrigger
        readOnly={readOnly}
        active={open}
        gray={selectedValues.length === 0 && !inputText}
        error={!!missingRequired}
        exclude={curExcludeMode}
        label={`${name} filter`}
        removable={!readOnly && !curPinned && !required}
        onRemove={() => removeDimensionFilter(name, metricsViewNames)}
        removeTooltipText={`remove ${selectedValues.length} value${
          selectedValues.length !== 1 ? "s" : ""
        }`}
        tooltipTitle={`${name} ${required ? "required dimension" : "dimension"}`}
        tooltipBody={
          missingRequired
            ? "This filter is required. Select a value to load the dashboard."
            : "Click to edit the filters in this dimension"
        }
        onToggleOpen={toggleOpen}
      >
        <DimensionFilterChipBody
          label={curExcludeMode ? `Exclude ${label}` : label}
          show={1}
          smallChip={smallChip}
          values={
            curMode === DimensionFilterMode.InList
              ? searchedBulkValues
              : effectiveSelectedValues
          }
          matchedCount={allSearchResultsCount}
          loading={searchCountState.isFetching}
          search={
            curMode === DimensionFilterMode.Contains ? curSearchText : undefined
          }
        />
      </ChipTrigger>

      {open ? (
        <div
          className={`absolute z-50 flex flex-col max-h-96 w-[400px] overflow-hidden p-0 rounded-md border bg-popover text-popover-foreground shadow-md focus:outline-none ${popoverPosition}`}
        >
          <div className="flex flex-col px-3 pt-3">
            {toggleFilterPin || toggleFilterRequired ? (
              <div className="flex flex-row items-center justify-between mb-2 pointer-events-auto">
                <b>{label}</b>
                <div className="flex flex-row items-center gap-x-1">
                  {toggleFilterRequired ? (
                    <button
                      type="button"
                      className={`h-full aspect-square flex items-center text-base font-bold leading-none ${
                        curRequired ? "text-red-600" : "text-fg-secondary"
                      }`}
                      aria-label={
                        curRequired
                          ? m.filter_make_optional()
                          : m.filter_make_required()
                      }
                      title={m.filter_required_tooltip()}
                      onClick={() => setCurRequired(!curRequired)}
                    >
                      <span aria-hidden="true">*</span>
                    </button>
                  ) : null}
                  {toggleFilterPin ? (
                    <button
                      type="button"
                      className="h-full aspect-square flex items-center"
                      aria-label={curPinned ? m.filter_unpin() : m.filter_pin()}
                      title={m.filter_pin_tooltip()}
                      onClick={() => setCurPinned(!curPinned)}
                    >
                      <PinIcon pinned={!!curPinned} size={15} />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div className="flex flex-row">
              <DimensionFilterModeSelector
                mode={curMode}
                size="md"
                onModeChange={handleModeChange}
              />
              <SearchInput
                value={curSearchText}
                onValueChange={setCurSearchText}
                label={`${name} search list`}
                placeholder={searchPlaceholder}
                onSubmit={() => onApply()}
                forcedInputStyle="rounded-l-none"
                multiline
              />
            </div>
            {showExtraInfo ? (
              <div className="flex flex-row items-center justify-between pt-2 pb-1">
                {curMode !== DimensionFilterMode.Select ? (
                  <span
                    className="px-2 py-1.5 pb-0 uppercase text-[10px] text-fg-secondary font-semibold"
                    aria-label={`${name} result count`}
                  >
                    {searchResultCountText}
                  </span>
                ) : (
                  <div className="grow"></div>
                )}
              </div>
            ) : null}
          </div>

          {showExtraInfo ? (
            <div className="h-px w-full bg-gray-200 flex-none" />
          ) : null}

          <div
            className={`flex flex-col flex-1 overflow-y-auto w-full h-fit min-h-24 pb-1 ${
              showExtraInfo ? "" : "pt-1"
            }`}
          >
            {isFetching ? (
              <div className="min-h-9 flex flex-row items-center mx-auto">
                <Spinner size="18px" />
              </div>
            ) : error ? (
              <div className="min-h-9 p-3 text-center text-red-600 text-xs">
                error
              </div>
            ) : inListTooLong ? (
              <div className="min-h-9 p-3 text-center text-red-600 text-xs">
                List is too long. Please remove some values.
              </div>
            ) : (
              <div className="px-1" aria-label={`${name} results`}>
                {curMode === DimensionFilterMode.Select && !curSearchText
                  ? checkedItems.map((item) => (
                      <CheckboxItem
                        key={item}
                        checked={effectiveSelectedValues.includes(item)}
                        showXForSelected={curExcludeMode}
                        onClick={() => handleItemClick(item)}
                      >
                        {truncateLabel(item)}
                      </CheckboxItem>
                    ))
                  : null}

                {curMode === DimensionFilterMode.Select &&
                !curSearchText &&
                checkedItems.length > 0 &&
                uncheckedItems.length > 0 ? (
                  <div className="h-px w-full bg-gray-200 my-1" />
                ) : null}

                {uncheckedItems.map((item) =>
                  curMode === DimensionFilterMode.Select ? (
                    <CheckboxItem
                      key={item}
                      checked={effectiveSelectedValues.includes(item)}
                      showXForSelected={curExcludeMode}
                      onClick={() => handleItemClick(item)}
                    >
                      {truncateLabel(item)}
                    </CheckboxItem>
                  ) : (
                    <PlainItem
                      key={item}
                      disabled
                      className="pl-3"
                    >
                      {truncateLabel(item)}
                    </PlainItem>
                  ),
                )}

                {uncheckedItems.length === 0 &&
                (curMode !== DimensionFilterMode.Select ||
                  checkedItems.length === 0) ? (
                  <div className="text-fg-disabled text-center p-2 w-full">
                    no results
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <DimensionFilterFooter
            mode={curMode}
            excludeMode={curExcludeMode}
            allSelected={allSelected}
            disableApplyButton={disableApplyButton}
            onToggleExcludeMode={handleToggleExcludeMode}
            onToggleSelectAll={onToggleSelectAll}
            onApply={() => onApply()}
          />
        </div>
      ) : null}
    </div>
  );
}

function truncateLabel(value: string | null): string {
  const label = value ?? "null";
  return label.length > 240 ? `${label.slice(0, 240)}...` : label;
}

// ── React stand-ins for the Svelte primitives used by DimensionFilter ─────────

/** React stand-in for the `Chip` trigger (dimension type). */
function ChipTrigger({
  readOnly,
  active,
  gray,
  error,
  exclude,
  label,
  removable,
  onRemove,
  removeTooltipText,
  tooltipTitle,
  tooltipBody,
  onToggleOpen,
  children,
}: {
  readOnly: boolean;
  active: boolean;
  gray: boolean;
  error: boolean;
  exclude: boolean;
  label: string;
  removable: boolean;
  onRemove: () => void;
  removeTooltipText: string;
  tooltipTitle: string;
  tooltipBody: string;
  onToggleOpen: () => void;
  children: ReactNode;
}) {
  const base =
    "flex gap-x-1 items-center justify-center px-2 py-[3px] border w-full max-w-fit truncate rounded-2xl";
  const stateClass = error
    ? "bg-red-50 border-red-400 text-red-700"
    : gray
      ? "bg-gray-100 border-gray-300 text-fg-secondary"
      : exclude
        ? "bg-surface-background text-fg-secondary"
        : active
          ? "bg-primary-200 border-primary-400 text-primary-800"
          : "bg-primary-50 border-primary-200 text-primary-800";

  return (
    <div title={`${tooltipTitle}: ${tooltipBody}`}>
      <div
        className={`${base} ${stateClass} ${readOnly ? "pointer-events-none" : ""} ${active ? "active" : ""} theme`}
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
              onRemove();
            }}
          >
            <CancelCircleIcon size="16px" />
          </button>
        ) : null}
        {readOnly ? (
          <span className="text-inherit w-full select-none truncate flex items-center justify-between gap-x-1 px-0.5">
            {children}
          </span>
        ) : (
          <button
            type="button"
            onClick={onToggleOpen}
            aria-label={`Open ${label}`}
            className="text-inherit w-full select-none truncate flex items-center justify-between gap-x-1 px-0.5"
          >
            {children}
            {active ? (
              <span className="transition-transform -mr-0.5">
                <CaretDownIcon size="10px" />
              </span>
            ) : null}
          </button>
        )}
      </div>
    </div>
  );
}

/** React stand-in for `DropdownMenu.CheckboxItem` (Select mode list rows). */
function CheckboxItem({
  checked,
  showXForSelected,
  onClick,
  children,
}: {
  checked: boolean;
  showXForSelected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="relative flex cursor-pointer text-fg-primary select-none items-center rounded-sm py-1.5 px-2 gap-x-2 text-xs outline-none hover:bg-popover-accent focus:bg-popover-accent"
      onClick={onClick}
    >
      <span className="flex flex-none h-3.5 w-3.5 items-center justify-center">
        {checked ? (
          showXForSelected ? (
            <XIcon size="16" className="text-fg-primary" />
          ) : (
            <CheckIcon size="16" className="text-fg-primary" />
          )
        ) : null}
      </span>
      {children}
    </button>
  );
}

/** React stand-in for `DropdownMenu.Item` (non-Select mode list rows). */
function PlainItem({
  disabled,
  className = "",
  children,
}: {
  disabled: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`relative flex gap-x-2 text-fg-primary select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none ${
        disabled ? "pointer-events-none opacity-50" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** React stand-in for the `Search` input component. */
function SearchInput({
  value,
  onValueChange,
  label,
  placeholder,
  onSubmit,
  forcedInputStyle,
  multiline,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  placeholder?: string;
  onSubmit: () => void;
  forcedInputStyle?: string;
  multiline?: boolean;
}) {
  return (
    <div className="relative w-full">
      <button
        type="button"
        className="flex absolute inset-y-0 items-center pl-2 text-fg-secondary"
        tabIndex={-1}
        aria-hidden="true"
      >
        <SearchIcon size="16" />
      </button>
      {multiline ? (
        <textarea
          rows={1}
          autoComplete="off"
          className={`outline-none block w-full pl-8 p-1 ${forcedInputStyle ?? ""} resize-none text-fg-secondary placeholder-fg-secondary h-[28px] min-h-[28px] max-h-[92px]`}
          value={value}
          placeholder={placeholder}
          aria-label={label}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
      ) : (
        <input
          type="text"
          autoComplete="off"
          className={`outline-none block w-full pl-8 p-1 ${forcedInputStyle ?? ""} text-fg-secondary placeholder-fg-secondary h-[28px]`}
          value={value}
          placeholder={placeholder}
          aria-label={label}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
      )}
    </div>
  );
}

/** React stand-in for the `LoadingSpinner` icon. */
function Spinner({ size = "1em" }: { size?: string }) {
  return (
    <svg
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className="animate-spin"
      style={{ transformOrigin: "center" }}
    >
      <circle cx="12" cy="12" r="11" opacity="0.25" />
      <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z" />
    </svg>
  );
}

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function SearchIcon({ size = "16px" }: { size?: string }) {
  return (
    <svg {...iconProps} width={size} height={size} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CancelCircleIcon({ size = "16px" }: { size?: string }) {
  return (
    <svg {...iconProps} width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

function CaretDownIcon({ size = "10px" }: { size?: string }) {
  return (
    <svg {...iconProps} width={size} height={size} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({
  size = "16",
  className = "",
}: {
  size?: string | number;
  className?: string;
}) {
  return (
    <svg
      {...iconProps}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon({
  size = "16",
  className = "",
}: {
  size?: string | number;
  className?: string;
}) {
  return (
    <svg
      {...iconProps}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function PinIcon({
  pinned,
  size = "15",
}: {
  pinned: boolean;
  size?: string | number;
}) {
  return (
    <svg
      {...iconProps}
      width={size}
      height={size}
      fill={pinned ? "currentColor" : "none"}
      aria-hidden="true"
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
    </svg>
  );
}