import { useEffect, useRef, useState } from "react";
import { DateTime, Duration, Interval } from "luxon";
import type {
  ISODurationString,
  NamedRange,
  RangeBuckets,
} from "@rilldata/web-common/features/dashboards/time-controls/new-time-controls";
import {
  ALL_TIME_RANGE_ALIAS,
  constructAsOfString,
  constructNewString,
  getRangeLabel,
  RILL_TO_LABEL,
} from "@rilldata/web-common/features/dashboards/time-controls/new-time-controls";
import { V1TimeGrain } from "@rilldata/web-common/runtime-client";
import {
  overrideRillTimeRef,
  parseRillTime,
} from "@rilldata/web-common/features/dashboards/url-state/time-ranges/parser";
import {
  RillAllTimeInterval,
  RillIsoInterval,
  RillPeriodToGrainInterval,
  RillTimeLabel,
  type RillTime,
} from "@rilldata/web-common/features/dashboards/url-state/time-ranges/RillTime";
import {
  getGrainOrder,
  V1TimeGrainToDateTimeUnit,
} from "@rilldata/web-common/lib/time/new-grains";
import { getTruncationGrain } from "@rilldata/web-common/lib/time/rill-time-grains";
import { getAbbreviationForIANA } from "@rilldata/web-common/lib/time/timezone";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { CaretDownIcon, CalendarIcon, GlobeIcon, CheckIcon } from "./icons";
import { RangeDisplay } from "./RangeDisplay";
import { SyntaxElement } from "./SyntaxElement";
import { TimeRangeSearch } from "./TimeRangeSearch";
import { TimeRangeOptionGroup } from "./TimeRangeOptionGroup";
import { ZoneContent } from "./ZoneContent";
import { CalendarPlusDateInput } from "./CalendarPlusDateInput";
import { TruncationSelector } from "./TruncationSelector";
import { PrimaryRangeTooltip } from "./PrimaryRangeTooltip";

/**
 * React translation of `super-pill/new-time-dropdown/RangePickerV2.svelte`: the SuperPill
 * time-range picker. Renders the trigger chip, the search/list dropdown, the custom date
 * picker, the time-zone picker, the time-axis picker, and the truncation selector.
 *
 * Reuses the framework-agnostic `new-time-controls` utilities, the Rill time range
 * parser/RillTime model, and the grain helpers verbatim. Popover / Tooltip / DropdownMenu
 * Svelte primitives are replaced by React stand-ins.
 */
export interface RangePickerV2Props {
  timeString: string | undefined;
  interval: Interval<true> | undefined;
  timeGrain: V1TimeGrain | undefined;
  zone: string;
  showDefaultItem: boolean;
  context: string;
  minDate: DateTime<true> | undefined;
  maxDate: DateTime<true> | undefined;
  rangeBuckets: RangeBuckets;
  watermark: DateTime | undefined;
  smallestTimeGrain: V1TimeGrain | undefined;
  defaultTimeRange: NamedRange | ISODurationString | undefined;
  allowCustomTimeRange?: boolean;
  maxQueryTimeRange?: Duration | undefined;
  availableTimeZones: string[];
  lockTimeZone?: boolean;
  showFullRange?: boolean;
  timeDimensions: { value: string; label: string; description?: string }[];
  primaryTimeDimension: string | undefined;
  selectedTimeDimension: string | undefined;
  onTimeDimensionSelect?: ((dimension: string) => void) | undefined;
  onSelectTimeZone: (timeZone: string) => void;
  onSelectRange: (range: string) => void;
}

export default function RangePickerV2({
  timeString,
  interval,
  timeGrain,
  zone,
  showDefaultItem,
  context,
  minDate,
  maxDate,
  rangeBuckets,
  watermark,
  smallestTimeGrain,
  defaultTimeRange,
  allowCustomTimeRange = true,
  maxQueryTimeRange = undefined,
  availableTimeZones,
  lockTimeZone = false,
  showFullRange = true,
  timeDimensions,
  primaryTimeDimension,
  selectedTimeDimension,
  onTimeDimensionSelect = undefined,
  onSelectTimeZone,
  onSelectRange,
}: RangePickerV2Props) {
  const [open, setOpen] = useState(false);
  const [filter] = useState("");
  const [searchValue, setSearchValue] = useState<string | undefined>(timeString);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [timeZonePickerOpen, setTimeZonePickerOpen] = useState(false);
  const [timeAxisPickerOpen, setTimeAxisPickerOpen] = useState(false);
  const [flexTruncationGrain, setFlexTruncationGrain] = useState<
    V1TimeGrain | undefined
  >();

  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  // Open/close on the Cmd/Ctrl+K shortcut (Svelte `svelte:window` keydown).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey && e.key === "k") {
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Reset the search box to the current time string whenever the picker opens
  // (Svelte `onOpenChange` sets `searchValue = timeString` on open).
  useEffect(() => {
    if (open) setSearchValue(timeString);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close the dropdown on outside click / Escape.
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

  const allTimeAllowed = !(
    maxQueryTimeRange && maxQueryTimeRange.as("milliseconds") > 0
  );

  let parsedTime: RillTime | undefined = undefined;
  if (timeString) {
    try {
      parsedTime = parseRillTime(timeString);
    } catch {
      parsedTime = undefined;
    }
  }

  const hideTruncationSelector =
    parsedTime?.interval instanceof RillIsoInterval ||
    parsedTime?.interval instanceof RillAllTimeInterval;

  const usingLegacyTime = parsedTime?.isOldFormat;
  const hasAsOfClause = !!parsedTime?.asOfLabel;

  const snapToEnd = usingLegacyTime ? true : !!parsedTime?.asOfLabel?.offset;
  const ref = usingLegacyTime ? RillTimeLabel.Latest : parsedTime?.asOfLabel?.label;

  const baseTruncationGrain = getTruncationGrain(parsedTime);
  const truncationGrain = flexTruncationGrain ?? baseTruncationGrain;

  const dateTimeAnchor = returnAnchor(ref, zone, maxDate, watermark);

  const selectedLabel = getRangeLabel(timeString);

  const activeTimeDimension = timeDimensions.find(
    ({ value }) => value === (selectedTimeDimension || primaryTimeDimension),
  );

  const zoneAbbreviation = getAbbreviationForIANA(maxDate ?? DateTime.now(), zone);
  const smallestTimeGrainOrder = getGrainOrder(
    smallestTimeGrain || V1TimeGrain.TIME_GRAIN_MINUTE,
  );

  function handleRangeSelect(range: string, ignoreSnap?: boolean) {
    try {
      const parsed = parseRillTime(range);

      const isPeriodToDate = parsed.interval instanceof RillPeriodToGrainInterval;

      const rangeGrainOrder =
        getGrainOrder(parsed.rangeGrain) - (isPeriodToDate ? 1 : 0);

      let activeTruncationGrain = flexTruncationGrain ?? baseTruncationGrain;
      const asOfGrainOrder = getGrainOrder(activeTruncationGrain);

      const shouldAppendAsOfString =
        !parsed.asOfLabel && !(parsed.interval instanceof RillIsoInterval);

      if (asOfGrainOrder > rangeGrainOrder && parsed.rangeGrain) {
        activeTruncationGrain = parsed.rangeGrain;
        setFlexTruncationGrain(parsed.rangeGrain);
      }

      if (shouldAppendAsOfString) {
        const isTruncationGrainAllowed =
          getGrainOrder(activeTruncationGrain) >= smallestTimeGrainOrder;
        const newAsOfString = constructAsOfString(
          ref ?? RillTimeLabel.Latest,
          ignoreSnap
            ? undefined
            : activeTruncationGrain
              ? isTruncationGrainAllowed
                ? activeTruncationGrain
                : parsed.rangeGrain
              : smallestTimeGrain ?? V1TimeGrain.TIME_GRAIN_MINUTE,
          hasAsOfClause || snapToEnd ? snapToEnd : true,
        );

        overrideRillTimeRef(parsed, newAsOfString);
      }

      onSelectRange(parsed.toString());
      closeMenu();
    } catch {
      // This function is called in a controlled manner and should not throw
    }
  }

  function onSelectGrain(grain: V1TimeGrain | undefined) {
    if (!timeString) return;

    const newString = constructNewString({
      currentString: timeString,
      truncationGrain: grain === truncationGrain ? undefined : grain,
      snapToEnd: grain === truncationGrain ? false : snapToEnd,
      ref,
    });

    onSelectRange(newString);
  }

  function onSelectAsOfOption(
    asOfRef: RillTimeLabel | string | undefined,
    inclusive: boolean,
  ) {
    if (!timeString) return;
    const newString = constructNewString({
      currentString: timeString,
      truncationGrain,
      snapToEnd: asOfRef === "watermark" ? false : inclusive,
      ref: asOfRef,
    });

    onSelectRange(newString);
  }

  function closeMenu() {
    setOpen(false);
  }

  const selectedLabelIsCustom =
    selectedLabel?.startsWith("-") || !isNaN(Number(selectedLabel?.[0]));

  return (
    <div className="relative flex" ref={containerRef}>
      {/* Trigger + tooltip */}
      <span
        className="relative"
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
      >
        <button
          className="flex gap-x-1.5"
          aria-label={m.dashboard_select_time_range()}
          type="button"
          onClick={() => setOpen((o) => !o)}
        >
          {timeString ? (
            <b className="line-clamp-1 flex-none">
              {selectedLabelIsCustom ? m.dashboard_custom() : selectedLabel}
            </b>
          ) : null}

          {showFullRange ? (
            <>
              <RangeDisplay interval={interval} timeGrain={timeGrain} />

              <div className="font-bold bg-surface-muted rounded-[2px] p-1 py-0 text-fg-secondary text-[11px]">
                {zoneAbbreviation}
              </div>
            </>
          ) : null}

          <span
            className={`flex-none transition-transform ${open ? "-rotate-180" : ""}`}
          >
            <CaretDownIcon />
          </span>
        </button>

        {tooltipOpen && !open && interval ? (
          <div className="absolute z-50 top-full mt-2">
            <PrimaryRangeTooltip
              timeString={timeString}
              interval={interval}
              timeDimensionLabel={activeTimeDimension?.label}
              timeDimensionDescription={activeTimeDimension?.description}
            />
          </div>
        ) : null}
      </span>

      {/* Dropdown content */}
      {open ? (
        <div
          className="absolute top-full left-0 z-50 p-0 w-fit overflow-hidden flex flex-col"
          style={{ marginTop: "0.25rem" }}
        >
          <TimeRangeSearch
            inError={!parsedTime && !!timeString && !usingLegacyTime}
            width={showCalendarPicker ? 456 : 224}
            context={context}
            timeString={timeString}
            searchValue={searchValue ?? ""}
            onSearchValueChange={(v) => {
              setSearchValue(v);
            }}
            onSelectRange={(range) => {
              setOpen(false);
              handleRangeSelect(range);
            }}
          />

          <div
            className={`flex w-56 max-h-fit ${
              showCalendarPicker ? "!w-[456px]" : ""
            }`}
            style={{ height: "470px" }}
          >
            <div className="flex flex-col w-56 overflow-y-auto overflow-x-hidden flex-none py-1">
              <div className="overflow-x-hidden">
                {showDefaultItem && defaultTimeRange ? (
                  <TimeRangeOptionGroup
                    filter={filter}
                    timeString={timeString}
                    options={[parseRillTime(defaultTimeRange)]}
                    onClick={handleRangeSelect}
                  />
                ) : null}

                <TimeRangeOptionGroup
                  filter={filter}
                  timeString={timeString}
                  options={rangeBuckets.custom}
                  onClick={handleRangeSelect}
                />

                <TimeRangeOptionGroup
                  filter={filter}
                  timeString={timeString}
                  options={rangeBuckets.latest}
                  onClick={handleRangeSelect}
                />

                <TimeRangeOptionGroup
                  filter={filter}
                  timeString={timeString}
                  options={rangeBuckets.periodToDate}
                  onClick={handleRangeSelect}
                />

                <TimeRangeOptionGroup
                  filter={filter}
                  timeString={timeString}
                  options={rangeBuckets.previous}
                  onClick={(r) => handleRangeSelect(r, true)}
                />

                {allTimeAllowed ? (
                  <div className="w-full h-fit px-1">
                    <button
                      type="button"
                      role="menuitem"
                      className="group truncate h-7 p-2 text-popover-foreground justify-between overflow-hidden hover:bg-popover-accent rounded-sm w-full select-none flex items-center"
                      onClick={() => handleRangeSelect("inf")}
                    >
                      <span className={timeString === ALL_TIME_RANGE_ALIAS ? "font-bold" : ""}>
                        {RILL_TO_LABEL[ALL_TIME_RANGE_ALIAS]}
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>

              {allowCustomTimeRange ? (
                <div className="w-full h-fit px-1">
                  <div className="h-px w-full bg-border my-1"></div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setShowCalendarPicker((s) => !s)}
                    className="truncate text-fg-primary w-full text-left gap-x-1 pr-1 hover:bg-popover-accent flex items-center flex-shrink pl-2 h-7 rounded-sm"
                  >
                    <CalendarIcon size="14px" />
                    <div className="mr-auto">{m.dashboard_custom()}</div>

                    <CaretDownIcon className="-rotate-90 text-fg-secondary" size="14px" />
                  </button>
                </div>
              ) : null}

              {!lockTimeZone ? (
                <div className="w-full h-fit px-1">
                  <div className="h-px w-full bg-border my-1"></div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCalendarPicker(false);
                        setTimeZonePickerOpen((o) => !o);
                      }}
                      className="group h-7 overflow-hidden hover:bg-popover-accent flex-none rounded-sm w-full select-none flex items-center truncate text-left gap-x-1 pr-1 pl-2"
                    >
                      <div className="flex-none">
                        <GlobeIcon size="14px" className="text-fg-primary" />
                      </div>
                      <div className="mr-auto text-fg-primary">{m.dashboard_time_zone()}</div>
                      <div className="sr-only group-hover:not-sr-only">
                        <SyntaxElement range={zoneAbbreviation} />
                      </div>
                      <CaretDownIcon className="-rotate-90 text-fg-secondary" size="14px" />
                    </button>

                    {timeZonePickerOpen ? (
                      <div
                        className="absolute left-full top-0 ml-2 p-1 z-50 rounded-md border bg-popover shadow-md"
                        style={{ minWidth: 224 }}
                      >
                        <ZoneContent
                          context={context}
                          availableTimeZones={availableTimeZones}
                          activeTimeZone={zone}
                          referencePoint={dateTimeAnchor ?? interval?.end ?? DateTime.now()}
                          onSelectTimeZone={(z) => {
                            onSelectTimeZone(z);
                            closeMenu();
                            setTimeZonePickerOpen(false);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {timeDimensions.length > 1 && onTimeDimensionSelect ? (
                <div className="w-full h-fit px-1">
                  <div className="h-px w-full bg-border my-1"></div>

                  <div className="relative">
                    <button
                      type="button"
                      id={`time-axis-trigger-${context}`}
                      onClick={() => {
                        setShowCalendarPicker(false);
                        setTimeAxisPickerOpen((o) => !o);
                      }}
                      aria-label={m.dashboard_select_time_axis()}
                      className="group h-7 overflow-hidden hover:bg-surface-hover flex-none rounded-sm w-full select-none flex items-center truncate text-left gap-x-1 pr-1 pl-2"
                    >
                      <div className="flex-none">
                        <svg width="14px" height="14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <div className="mr-auto">{m.dashboard_time_axis()}</div>
                      {activeTimeDimension ? (
                        <div className="sr-only group-hover:not-sr-only">
                          <SyntaxElement range={activeTimeDimension.label} />
                        </div>
                      ) : null}
                      <CaretDownIcon className="-rotate-90" size="14px" />
                    </button>

                    {timeAxisPickerOpen ? (
                      <div
                        className="absolute left-full top-0 ml-2 p-1 z-50 rounded-md border bg-popover shadow-md"
                        style={{ minWidth: 224 }}
                      >
                        {timeDimensions.map(({ value, label, description }) => (
                          <div key={value}>
                            <button
                              type="button"
                              className="item w-full relative justify-between flex cursor-pointer select-none items-start rounded-sm py-1.5 px-2 gap-x-2 text-xs outline-none hover:bg-surface-hover text-fg-primary"
                              aria-label={m.dashboard_select_time_dimension({ label })}
                              onClick={() => {
                                onTimeDimensionSelect?.(value);
                                closeMenu();
                                setTimeAxisPickerOpen(false);
                              }}
                            >
                              {label}
                              {value === (selectedTimeDimension || primaryTimeDimension) ? (
                                <CheckIcon size={16} className="size-4 text-fg-primary" />
                              ) : null}
                            </button>
                            {description ? (
                              <p className="px-2 pb-1 text-[11px] text-fg-secondary">{description}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {showCalendarPicker ? (
              <div className="bg-surface-overlay border-l p-3 size-full overflow-y-auto">
                <CalendarPlusDateInput
                  interval={interval}
                  zone={zone}
                  minTimeGrain={
                    V1TimeGrainToDateTimeUnit[smallestTimeGrain ?? V1TimeGrain.TIME_GRAIN_MINUTE]
                  }
                  minDate={minDate}
                  maxDate={maxDate}
                  maxQueryTimeRange={maxQueryTimeRange}
                  onApply={() => {
                    if (searchValue) handleRangeSelect(searchValue);
                  }}
                  updateRange={(string) => setSearchValue(string)}
                  closeMenu={() => setOpen(false)}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {dateTimeAnchor && !hideTruncationSelector ? (
        // The truncation selector is positioned normally (flex sibling after the picker chip).
        <span className="pl-2">
          <TruncationSelector
            dateTimeAnchor={dateTimeAnchor}
            grain={truncationGrain}
            rangeGrain={parsedTime?.rangeGrain ?? truncationGrain}
            isPeriodToDate={parsedTime?.interval instanceof RillPeriodToGrainInterval}
            watermark={watermark}
            latest={maxDate}
            smallestTimeGrain={smallestTimeGrain}
            snapToEnd={snapToEnd}
            asOfRef={ref}
            zone={zone}
            onSelectEnding={onSelectGrain}
            onToggleAlignment={(inclusive) => onSelectAsOfOption(ref, inclusive)}
            onSelectAsOfOption={(o) => onSelectAsOfOption(o, snapToEnd)}
          />
        </span>
      ) : null}
    </div>
  );
}

// Zone is taken as a param to make it reactive
function returnAnchor(
  asOf: string | undefined,
  zone: string,
  maxDate: DateTime<true> | undefined,
  watermark: DateTime | undefined,
): DateTime | undefined {
  if (!maxDate) return DateTime.now().setZone(zone);
  if (asOf === "latest") {
    return maxDate.setZone(zone);
  } else if (asOf === "watermark" && watermark) {
    return watermark.setZone(zone);
  } else if (asOf === "now" || !asOf) {
    return DateTime.now().setZone(zone);
  }
  return undefined;
}
