import { useEffect, useState } from "react";
import { DateTime } from "luxon";

const formatsWithoutYear = [
  "M/d",
  "MMMM d",
  "MMM d",
  "M-d",
  "d MMMM",
  "d MMM",
  "d.M",
];

const formatsWithYear = [
  "M/d/yy",
  "D",
  "DDD",
  "MMM d, yyyy",
  "MMM d yyyy",
  "MMMM d yyyy",
  "yyyy-M-d",
  "M-d-yyyy",
  "M-d-yy",
  "d MMMM yyyy",
  "d MMM yyyy",
  "d MMMM, yyyy",
  "d MMM, yyyy",
  "d.M.yyyy",
];

const formats = [...formatsWithoutYear, ...formatsWithYear];

const ErrorType = {
  INVALID: "invalid",
  OUT_OF_RANGE: "out-of-range",
} as const;
type ErrorType = (typeof ErrorType)[keyof typeof ErrorType];

/**
 * React translation of `components/date-picker/DateInput.svelte`. A single bound date
 * text input with the same flex format parsing and invalid/out-of-range feedback.
 */
export interface DateInputProps {
  date: DateTime;
  zone: string;
  boundary: "start" | "end";
  currentYear: number;
  minDate?: DateTime | undefined;
  maxDate?: DateTime | undefined;
  onValidDateInput: (date: DateTime, boundary: "start" | "end") => void;
  onFocus: () => void;
}

export function DateInput({
  date,
  zone,
  boundary,
  currentYear,
  minDate,
  maxDate,
  onValidDateInput,
  onFocus,
}: DateInputProps) {
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [inputIsFocused, setInputIsFocused] = useState(false);
  const [dateString, setDateString] = useState(
    date.toLocaleString({ month: "short", day: "numeric", year: "numeric" }),
  );

  const id = `${boundary}-date`;
  const label = `${boundary} date`;

  useEffect(() => {
    if (!inputIsFocused) {
      setDateString(
        date.toLocaleString({ month: "short", day: "numeric", year: "numeric" }),
      );
    }
  }, [date, inputIsFocused]);

  useEffect(() => {
    if (
      (minDate && date < minDate.startOf("day")) ||
      (maxDate && date >= maxDate)
    ) {
      setErrorType(ErrorType.OUT_OF_RANGE);
    } else {
      setErrorType(null);
    }
  }, [minDate, maxDate, date]);

  function convertToDateTime(value: string): DateTime<true> | undefined {
    let potentialDate: DateTime | undefined = undefined;
    let format: string | null = null;

    for (const potentialFormat of formats) {
      potentialDate = DateTime.fromFormat(value, potentialFormat, { zone });
      if (potentialDate.isValid) {
        format = potentialFormat;
        break;
      }
    }

    if (
      potentialDate &&
      potentialDate.year !== currentYear &&
      format &&
      formatsWithoutYear.includes(format)
    ) {
      potentialDate = potentialDate.set({ year: currentYear });
    }

    return potentialDate?.isValid ? potentialDate : undefined;
  }

  function processInput(value: string) {
    let potentialDate = convertToDateTime(value);

    if (potentialDate) {
      if (boundary === "end") {
        potentialDate = potentialDate?.plus({ day: 1 }).startOf("day");
      }
      onValidDateInput(potentialDate, boundary);
    } else {
      setErrorType(ErrorType.INVALID);
      return;
    }
  }

  function resetDate() {
    if (boundary === "start") {
      const reset = minDate ?? DateTime.now().startOf("day");
      onValidDateInput(reset, boundary);
    } else {
      const reset = maxDate ?? DateTime.now().plus({ day: 1 }).startOf("day");
      onValidDateInput(reset, boundary);
    }
  }

  return (
    <div className="flex flex-col gap-y-1 w-full">
      <label className="capitalize flex items-center font-semibold" htmlFor={id}>
        {label}
      </label>

      <div
        className={`h-8 px-2 w-full rounded-md border flex bg-input items-center justify-between ${
          inputIsFocused ? "border-theme-600" : ""
        } ${
          errorType === ErrorType.INVALID && !inputIsFocused
            ? "border-destructive text-destructive"
            : ""
        }`}
      >
        <input
          tabIndex={0}
          id={id}
          className="size-full bg-transparent outline-none"
          aria-label={label}
          type="text"
          value={dateString}
          onChange={(e) => setDateString(e.target.value)}
          onFocus={() => {
            onFocus();
            setInputIsFocused(true);
          }}
          onBlur={() => {
            processInput(dateString);
            setInputIsFocused(false);
          }}
        />
        {errorType === ErrorType.OUT_OF_RANGE ||
        (errorType && !inputIsFocused) ? (
          <button type="button" onClick={resetDate} aria-label="Reset date">
            <svg
              className={`size-4 ${
                errorType === ErrorType.INVALID ? "text-red-500" : "text-yellow-500"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
