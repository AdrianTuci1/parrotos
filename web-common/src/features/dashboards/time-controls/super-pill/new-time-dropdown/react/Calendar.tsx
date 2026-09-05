import { useMemo, useState } from "react";
import { DateTime, Interval, Settings } from "luxon";

type MaybeDate = DateTime | undefined;

export interface CalendarProps {
  selection: Interval | DateTime;
  maxDate?: MaybeDate;
  minDate?: MaybeDate;
  visibleMonths?: number;
  anchorDay?: DateTime | undefined;
  firstVisibleMonth?: MaybeDate;
  singleDaySelection?: boolean;
  onSelectDay: (date: DateTime<true>) => void;
  onHoverDay?: (date: DateTime<true>) => void;
}

function isDateTime(value: MaybeDate | Interval): value is DateTime {
  return Boolean(value && value instanceof DateTime && value.isValid);
}

function isInterval(value: MaybeDate | Interval): value is Interval {
  return Boolean(value && value instanceof Interval && value.isValid);
}

/**
 * React stand-in for `components/date-picker/Calendar.svelte`. A month-grid day picker
 * used by the time-range custom date picker. Replicates the observable behavior:
 * month navigation, a 6-week grid, and `onSelectDay` callbacks that respect the
 * `minDate`/`maxDate` bounds.
 */
export function Calendar({
  selection,
  maxDate = DateTime.now().startOf("day"),
  minDate,
  visibleMonths = 1,
  firstVisibleMonth,
  onSelectDay,
}: CalendarProps) {
  const firstDayOfWeek = Settings.defaultWeekSettings?.firstDay ?? 1;

  const initialMonth = isDateTime(firstVisibleMonth)
    ? firstVisibleMonth
    : isInterval(selection)
      ? (selection.start ?? DateTime.now())
      : isDateTime(selection)
        ? selection
        : DateTime.now();

  const [firstMonth, setFirstMonth] = useState(initialMonth);

  const interval = useMemo(() => {
    if (isInterval(selection)) return selection;
    if (isDateTime(selection))
      return Interval.fromDateTimes(
        selection.startOf("day"),
        selection.startOf("day").plus({ day: 1 }),
      ) as Interval<true>;
    return Interval.fromDateTimes(
      DateTime.now().startOf("day"),
      DateTime.now().startOf("day").plus({ day: 1 }),
    ) as Interval<true>;
  }, [selection]);

  function onPan(direction: -1 | 1) {
    setFirstMonth((m) => m.plus({ month: direction }));
  }

  return (
    <div className="flex gap-x-3 w-full">
      {Array.from({ length: visibleMonths }, (_, i) => (
        <MonthGrid
          key={i}
          firstDayOfWeek={firstDayOfWeek}
          maxDate={maxDate}
          minDate={minDate}
          interval={interval}
          startDay={firstMonth.plus({ month: i }).set({ day: 1 }).startOf("day")}
          visibleIndex={i}
          visibleMonths={visibleMonths}
          onSelectDay={onSelectDay}
          onPan={onPan}
        />
      ))}
    </div>
  );
}

function MonthGrid({
  interval,
  startDay,
  firstDayOfWeek,
  visibleMonths,
  visibleIndex,
  maxDate,
  minDate,
  onPan,
  onSelectDay,
}: {
  interval: Interval<true>;
  startDay: DateTime<true>;
  firstDayOfWeek: number;
  visibleMonths: number;
  visibleIndex: number;
  maxDate?: MaybeDate;
  minDate?: MaybeDate;
  onPan: (direction: -1 | 1) => void;
  onSelectDay: (date: DateTime<true>) => void;
}) {
  const weekCount = 6;
  const weekDayOfFirstDay = startDay.startOf("month").localWeekday;

  const forwardPanEnabled = !maxDate || startDay.plus({ month: 1 }) < maxDate;
  const backwardPanEnabled = !minDate || startDay.minus({ month: 1 }) >= minDate;

  const days = useMemo(
    () =>
      Array.from({ length: weekCount * 7 }, (_, i) =>
        startDay.plus({ day: i + 1 - weekDayOfFirstDay }),
      ),
    [startDay, weekDayOfFirstDay],
  );

  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        startDay.startOf("week").plus({ day: i + (firstDayOfWeek - 1) })
          .weekdayShort,
      ),
    [startDay, firstDayOfWeek],
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center px-2">
        <button
          type="button"
          className={`hover:bg-surface-hover text-fg-secondary rounded-full aspect-square size-5 flex items-center justify-center ${
            !backwardPanEnabled ? "opacity-50" : ""
          } ${visibleIndex !== 0 ? "opacity-0 pointer-events-none" : ""}`}
          onClick={() => onPan(-1)}
          aria-label="Previous month"
        >
          <svg width="14px" height="14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="w-full text-center px-2 py-1 text-sm flex gap-x-1 justify-center select-none">
          <b>{startDay.monthLong}</b>
          <p>{startDay.year}</p>
        </div>
        <button
          type="button"
          className={`hover:bg-surface-hover text-fg-secondary rounded-full aspect-square size-5 flex items-center justify-center ${
            !forwardPanEnabled ? "opacity-50" : ""
          } ${
            visibleIndex !== visibleMonths - 1 ? "opacity-0 pointer-events-none" : ""
          }`}
          onClick={() => onPan(1)}
          aria-label="Next month"
        >
          <svg width="14px" height="14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div role="presentation" className="grid grid-cols-7 w-full">
        {weekdays.map((weekday) => (
          <div key={weekday} className="text-center w-full aspect-[2/1] text-fg-secondary select-none">
            {weekday}
          </div>
        ))}
        {days.map((date) => {
          const outOfMonth = date.month !== startDay.month;
          const startOfMonth = interval.start?.startOf("day");
          const endOfMonth = interval.end?.startOf("day");
          const inSelection =
            startOfMonth && endOfMonth && date >= startOfMonth && date <= endOfMonth;
          const disabled =
            (minDate && date < minDate.startOf("day")) ||
            (maxDate && date > maxDate.startOf("day"));
          return (
            <button
              key={date.toISO()}
              type="button"
              disabled={disabled}
              className={`text-center w-full aspect-square flex items-center justify-center text-xs rounded-sm ${
                inSelection ? "bg-primary-100 text-primary-800 font-bold" : "text-fg-primary"
              } ${outOfMonth ? "opacity-40" : ""} hover:bg-surface-hover disabled:opacity-30 disabled:cursor-default`}
              onClick={() => onSelectDay(date)}
            >
              {date.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
