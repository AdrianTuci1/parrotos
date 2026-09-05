import { useEffect, useMemo, useRef, useState } from "react";
import { DateTime, Duration, type DateTimeUnit } from "luxon";
import { V1TimeGrain } from "@rilldata/web-common/runtime-client";
import {
  getOptionsFromSmallestToLargest,
  translateGrainName,
  translateV1TimeGrain,
  V1TimeGrainToDateTimeUnit,
} from "@rilldata/web-common/lib/time/new-grains";
import { RillTimeLabel } from "@rilldata/web-common/features/dashboards/url-state/time-ranges/RillTime";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { CaretDownIcon } from "./icons";

/**
 * React translation of `super-pill/new-time-dropdown/TruncationSelector.svelte`. The
 * "as of ref" control: chooses the reference point (complete / latest / current), the
 * grain for the truncation, and whether to snap to the end. Reuses the
 * framework-agnostic grain helpers verbatim.
 */
export interface TruncationSelectorProps {
  dateTimeAnchor: DateTime;
  grain: V1TimeGrain | undefined;
  rangeGrain: V1TimeGrain | undefined;
  smallestTimeGrain: V1TimeGrain | undefined;
  snapToEnd: boolean;
  isPeriodToDate: boolean;
  watermark: DateTime | undefined;
  latest: DateTime | undefined;
  zone: string;
  asOfRef: RillTimeLabel | string | undefined;
  onSelectAsOfOption: (ref: RillTimeLabel) => void;
  onToggleAlignment: (forward: boolean) => void;
  onSelectEnding: (grain: V1TimeGrain | undefined, complete?: boolean) => void;
}

function humanizeRef(
  ref: RillTimeLabel | string | undefined,
  grain: V1TimeGrain | undefined,
  zone: string,
): string {
  switch (ref) {
    case RillTimeLabel.Watermark:
      if (grain) return m.time_ref_complete();
      return m.time_ref_complete_data();
    case RillTimeLabel.Latest:
      return m.time_ref_latest();
    case RillTimeLabel.Now:
      if (grain) return m.time_ref_current();
      return m.time_ref_now();
    default:
      try {
        const dt = DateTime.fromISO(ref as string).setZone(zone);
        return dt.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
      } catch {
        return ref as string;
      }
  }
}

function deriveAnchor(
  dateTimeAnchor: DateTime,
  snap: DateTimeUnit | undefined,
  inclusive: boolean,
) {
  if (!snap) {
    return dateTimeAnchor;
  }
  return dateTimeAnchor.startOf(snap).plus({ [snap]: inclusive ? 1 : 0 });
}

function getColloquialOffset(date: DateTime, zone: string): string {
  const now = DateTime.now().setZone(zone);
  const inFuture = date > now;
  const durationStr = Duration.fromObject(
    Object.fromEntries(
      Object.entries(now.diff(date).rescale().toObject())
        .filter(([, value]) => value !== 0)
        .slice(0, 2),
    ),
  ).toHuman({
    listStyle: "narrow",
    maximumFractionDigits: 0,
    signDisplay: "never",
  });
  return inFuture ? m.time_from_now({ duration: durationStr }) : m.time_ago({ duration: durationStr });
}

export function TruncationSelector({
  dateTimeAnchor,
  grain,
  rangeGrain,
  smallestTimeGrain,
  snapToEnd,
  isPeriodToDate,
  watermark,
  latest,
  zone,
  asOfRef,
  onSelectAsOfOption,
  onToggleAlignment,
  onSelectEnding,
}: TruncationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [now, setNow] = useState(() => DateTime.now().setZone(zone));
  const containerRef = useRef<HTMLSpanElement>(null);

  // The Svelte source ticks `now` every second while mounted.
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(DateTime.now().setZone(zone));
    }, 1000);
    return () => clearInterval(interval);
  }, [zone]);

  // Close the dropdown on outside click / Escape (the Svelte DropdownMenu behavior).
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

  const dateTimeUnit = grain ? V1TimeGrainToDateTimeUnit[grain] : undefined;

  const grainOptions = useMemo(
    () => getOptionsFromSmallestToLargest(rangeGrain, smallestTimeGrain, isPeriodToDate),
    [rangeGrain, smallestTimeGrain, isPeriodToDate],
  );

  const humanizedRef = humanizeRef(asOfRef, grain, zone);
  const derivedAnchor = deriveAnchor(dateTimeAnchor, dateTimeUnit, snapToEnd);

  const options = [
    {
      id: RillTimeLabel.Watermark,
      label: m.dashboard_complete_data(),
      timestamp: watermark,
      description: m.dashboard_complete_data_description(),
    },
    {
      id: RillTimeLabel.Latest,
      label: m.dashboard_latest_data(),
      timestamp: latest,
      description: m.dashboard_latest_data_description(),
    },
    {
      id: RillTimeLabel.Now,
      label: m.dashboard_current_time(),
      timestamp: now,
      description: m.dashboard_current_time_description(),
    },
  ];

  return (
    <span className="relative" ref={containerRef}>
      <button
        type="button"
        className="flex gap-x-1 items-center flex-none truncate"
        aria-label={m.dashboard_select_ref_time_grain()}
        onClick={() => setOpen((o) => !o)}
      >
        <p>
          {m.dashboard_as_of_ref()}
          <b>
            {humanizedRef}
            {dateTimeUnit ? translateGrainName(dateTimeUnit) : null}
          </b>
          {grain ? (snapToEnd || asOfRef === RillTimeLabel.Watermark ? m.dashboard_end() : m.dashboard_start()) : null}
        </p>

        <span className={`flex-none transition-transform ${open ? "-rotate-180" : ""}`}>
          <CaretDownIcon />
        </span>
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-52 flex flex-col p-0 rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="p-1">
            <h3 className="mt-1 px-2 uppercase text-fg-secondary font-semibold">
              {m.dashboard_reference()}
            </h3>
            {options.map(({ id, label, description, timestamp }) => {
              if (id !== RillTimeLabel.Watermark || (id === RillTimeLabel.Watermark && !!timestamp)) {
                return (
                  <button
                    key={id}
                    type="button"
                    className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 gap-x-2 text-xs outline-none hover:bg-popover-accent"
                    onClick={() => onSelectAsOfOption(id)}
                    onMouseEnter={() => setHoveredOption(id)}
                    onMouseLeave={() => setHoveredOption(null)}
                  >
                    <span className="flex flex-none h-3.5 w-3.5 items-center justify-center">
                      {asOfRef === id ? (
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : null}
                    </span>
                    <span className="flex-1">{label}</span>
                    {hoveredOption === id && timestamp ? (
                      <div className="ml-2 text-[11px] text-fg-secondary">
                        {timestamp.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}
                      </div>
                    ) : null}
                  </button>
                );
              }
              return null;
            })}
          </div>

          <div className="h-px w-full bg-gray-200 my-0"></div>

          <div className="p-1">
            <h3 className="mt-1 px-2 uppercase text-fg-secondary font-semibold">
              {m.dashboard_grain()}
            </h3>
            {grainOptions.length ? (
              grainOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 gap-x-2 text-xs outline-none hover:bg-popover-accent"
                  onClick={() => onSelectEnding(option)}
                >
                  <span className="flex flex-none h-3.5 w-3.5 items-center justify-center">
                    {option === grain ? (
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : null}
                  </span>
                  {translateV1TimeGrain(option)}
                </button>
              ))
            ) : (
              <div className="px-2 py-1 text-fg-secondary flex justify-center italic">
                {m.dashboard_no_valid_grains()}
              </div>
            )}
          </div>

          {dateTimeUnit ? (
            <div className="bg-popover-footer border-t rounded-b-sm">
              <div className="flex justify-between items-center p-2">
                <span>{m.dashboard_anchor_period_end()}</span>
                <button
                  type="button"
                  disabled={asOfRef === RillTimeLabel.Watermark}
                  role="switch"
                  aria-checked={snapToEnd || asOfRef === RillTimeLabel.Watermark}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full ${
                    snapToEnd || asOfRef === RillTimeLabel.Watermark ? "bg-primary-600" : "bg-gray-300"
                  } disabled:opacity-50`}
                  onClick={() => onToggleAlignment(!snapToEnd)}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                    snapToEnd || asOfRef === RillTimeLabel.Watermark ? "translate-x-4" : "translate-x-1"
                  }`} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* The derived anchor is only shown in the original as a tooltip; keep a subtle
          display so the React port surfaces the resolved anchor (the Svelte source
          shows it via the Tooltip trigger). */}
      <span className="sr-only">
        {derivedAnchor.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}
        {" "}{getColloquialOffset(derivedAnchor, zone)}
      </span>
    </span>
  );
}
