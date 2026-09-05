import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { DateTime, Duration, Interval, type DateTimeUnit } from "luxon";
import { snapToDayOrLargerGrain } from "@rilldata/web-common/lib/time/new-grains";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { Calendar } from "./Calendar";
import { DateInput } from "./DateInput";

/**
 * React translation of `super-pill/components/CalendarPlusDateInput.svelte`. The custom
 * date-range picker: a day grid plus a start/end date input, with an Apply button and a
 * max-query-range cap warning. Uses `snapToDayOrLargerGrain` verbatim for the max date.
 */
export interface CalendarPlusDateInputProps {
  interval: Interval<true> | undefined;
  minDate?: DateTime | undefined;
  maxDate?: DateTime | undefined;
  minTimeGrain: DateTimeUnit;
  zone: string;
  maxQueryTimeRange?: Duration | undefined;
  updateRange?: (range: string) => void;
  onApply: (interval: Interval<true>) => void;
  closeMenu: () => void;
}

export function CalendarPlusDateInput({
  interval,
  minDate,
  maxDate,
  minTimeGrain,
  zone,
  maxQueryTimeRange,
  updateRange = () => {},
  onApply,
  closeMenu,
}: CalendarPlusDateInputProps) {
  const now = DateTime.now().setZone(zone);
  const today: Interval<true> = Interval.fromDateTimes(
    now.startOf("day"),
    now.plus({ day: 1 }).startOf("day"),
  ) as Interval<true>;

  const [inputInterval, setInputInterval] = useState<Interval<true>>(
    interval || today,
  );
  const [firstVisibleMonth, setFirstVisibleMonth] = useState(
    inputInterval.start,
  );
  const [anchorDay, setAnchorDay] = useState<DateTime<true> | undefined>();

  const startDate = inputInterval?.start;

  const isZeroInterval = inputInterval?.start.equals(inputInterval.end);
  const endDate = isZeroInterval
    ? inputInterval?.end
    : inputInterval?.end.minus({ millisecond: 1 });

  // Calendar picker is for selecting days. Always snap to day.
  const adjustedMinDate = minDate?.startOf("day");
  // The exception is end date and the min grain is larger than day.
  // For grains like week, month, year, etc. we need to snap to that instead.
  const adjustedMaxDate = maxDate
    ? snapToDayOrLargerGrain(maxDate, minTimeGrain, zone)
    : undefined;

  const capMs = maxQueryTimeRange?.as("milliseconds") ?? 0;
  const exceedsCap =
    capMs > 0 &&
    !!inputInterval?.isValid &&
    inputInterval.toDuration("milliseconds").as("milliseconds") > capMs;
  const capLabel = maxQueryTimeRange?.shiftTo("days").toHuman({ listStyle: "long" });

  function onValidDateInput(date: DateTime<true>, boundary?: "start" | "end") {
    let newInterval: Interval;

    if (boundary) {
      if (boundary === "start") {
        newInterval = Interval.fromDateTimes(date, inputInterval.end);
      } else {
        newInterval = Interval.fromDateTimes(inputInterval.start, date);
      }
    } else if (!anchorDay) {
      const anchor = date;
      newInterval = Interval.fromDateTimes(
        anchor,
        anchor.plus({ day: 1 }).startOf("day"),
      ) as Interval<true>;
      setAnchorDay(anchor);
    } else if (date > anchorDay) {
      newInterval = Interval.fromDateTimes(
        anchorDay,
        date.plus({ day: 1 }).startOf("day"),
      ) as Interval<true>;
      setAnchorDay(undefined);
    } else {
      newInterval = Interval.fromDateTimes(
        date.startOf("day"),
        anchorDay.plus({ day: 1 }).startOf("day"),
      ) as Interval<true>;
      setAnchorDay(undefined);
    }

    let resolved = newInterval;
    if (!newInterval.isValid) {
      const singleDay = Interval.fromDateTimes(date, date.endOf("day"));
      if (singleDay.isValid) {
        resolved = singleDay;
      } else {
        return;
      }
    }

    setInputInterval(resolved);
    updateRange(
      `${resolved.start.toFormat("yyyy-MM-dd")} to ${resolved.end.toFormat("yyyy-MM-dd")}`,
    );
  }

  function withTabStop(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Tab") {
      e.stopPropagation();
    }
  }

  return (
    <div className="flex flex-col w-full gap-y-3" onKeyDownCapture={withTabStop}>
      <Calendar
        minDate={adjustedMinDate}
        maxDate={adjustedMaxDate}
        selection={inputInterval}
        anchorDay={anchorDay}
        firstVisibleMonth={firstVisibleMonth}
        onSelectDay={onValidDateInput}
      />

      <div className="w-full h-px bg-border"></div>

      <div className="flex flex-col gap-y-2">
        <DateInput
          boundary="start"
          zone={zone}
          date={startDate}
          minDate={adjustedMinDate}
          maxDate={adjustedMaxDate}
          currentYear={firstVisibleMonth.year}
          onValidDateInput={onValidDateInput}
          onFocus={() => setFirstVisibleMonth(inputInterval.start)}
        />

        <DateInput
          boundary="end"
          zone={zone}
          date={endDate}
          minDate={adjustedMinDate}
          maxDate={adjustedMaxDate}
          currentYear={firstVisibleMonth.year}
          onValidDateInput={onValidDateInput}
          onFocus={() => setFirstVisibleMonth(inputInterval.end)}
        />
      </div>

      {exceedsCap ? (
        <div className="text-red-500 text-xs px-1" role="alert">
          {m.calendar_range_exceeds_limit({ capLabel: capLabel ?? "" })}
        </div>
      ) : null}

      <div className="flex justify-end w-full">
        <button
          type="button"
          disabled={!inputInterval?.isValid || exceedsCap}
          className="px-2 w-fit rounded-md bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-default"
          onClick={() => {
            if (inputInterval) onApply(inputInterval);
            closeMenu();
          }}
        >
          <span className="px-2 w-fit">{m.calendar_apply()}</span>
        </button>
      </div>
    </div>
  );
}
