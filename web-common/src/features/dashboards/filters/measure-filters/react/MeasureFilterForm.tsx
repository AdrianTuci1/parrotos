import { useMemo, useState } from "react";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import type { MeasureFilterEntry } from "@rilldata/web-common/features/dashboards/filters/measure-filters/measure-filter-entry";
import type { MetricsViewSpecDimension } from "@rilldata/web-common/runtime-client";
import {
  MeasureFilterOperation,
  MeasureFilterOperationOptions,
  MeasureFilterType,
} from "@rilldata/web-common/features/dashboards/filters/measure-filters/measure-filter-options";
import { getDimensionDisplayName } from "@rilldata/web-common/features/dashboards/filters/getDisplayName";
import Button from "../../dimension-filters/react/Button";
import { PinIcon } from "./icons";
import type { MeasureFilterSide } from "./MeasureFilter";

function isMFO(value: string): value is MeasureFilterOperation {
  return value in MeasureFilterOperation;
}

function expressionIsBetween(op: string): boolean {
  return (
    isMFO(op) &&
    (op === MeasureFilterOperation.Between ||
      op === MeasureFilterOperation.NotBetween)
  );
}

export interface MeasureFilterFormProps {
  dimensionName: string;
  name: string;
  label: string;
  filter?: MeasureFilterEntry;
  onApply: (params: {
    dimension: string;
    oldDimension: string;
    filter: MeasureFilterEntry;
  }) => void;
  onClose: () => void;
  allDimensions: MetricsViewSpecDimension[];
  side?: MeasureFilterSide;
  pinned?: boolean;
  showPinControl?: boolean;
  required?: boolean;
  showRequiredControl?: boolean;
  onTogglePin?: () => void;
  onToggleRequired?: () => void;
}

interface FormErrors {
  dimension?: string;
  value1?: string;
  value2?: string;
}

/**
 * React translation of `MeasureFilterForm.svelte`. Renders the measure filter
 * threshold / subquery form inside the popover: dimension picker, operation picker,
 * the threshold value (and upper bound for between), plus the reveal-only pin and
 * required controls in the header. Reuses the framework-agnostic
 * `measure-filter-options` + `measure-filter-entry` modules for option lists and the
 * `MeasureFilterEntry` shape.
 */
export default function MeasureFilterForm({
  dimensionName,
  name,
  label,
  filter,
  onApply,
  onClose,
  allDimensions,
  side = "bottom",
  pinned = false,
  showPinControl = false,
  required = false,
  showRequiredControl = false,
  onTogglePin,
  onToggleRequired,
}: MeasureFilterFormProps) {
  const [dimension, setDimension] = useState(dimensionName);
  const [operation, setOperation] = useState<MeasureFilterOperation | string>(
    filter?.operation ?? MeasureFilterOperationOptions[0].value,
  );
  const [value1, setValue1] = useState(filter?.value1 ?? "");
  const [value2, setValue2] = useState(filter?.value2 ?? "");

  const isBetween = useMemo(() => expressionIsBetween(operation), [operation]);

  const dimensionOptions = useMemo(
    () =>
      allDimensions.map((d) => ({
        value: d.name as string,
        label: getDimensionDisplayName(d),
      })),
    [allDimensions],
  );

  const errors = useMemo<FormErrors>(() => {
    const errs: FormErrors = {};
    if (!dimension) errs.dimension = m.common_required();
    if (!value1.trim()) {
      errs.value1 = m.common_required();
    } else if (isNaN(Number(value1))) {
      errs.value1 = m.common_must_be_number();
    }
    if (isBetween) {
      if (!value2.trim()) {
        errs.value2 = m.common_required();
      } else if (isNaN(Number(value2))) {
        errs.value2 = m.common_must_be_number();
      }
    }
    return errs;
  }, [dimension, value1, value2, isBetween]);

  const valid = Object.keys(errors).length === 0;

  const handleSubmit = () => {
    if (!valid) return;
    onApply({
      dimension,
      oldDimension: dimensionName,
      filter: {
        measure: name,
        operation: operation as MeasureFilterOperation,
        type: MeasureFilterType.Value,
        value1,
        value2: value2 ?? "",
      },
    });
    onClose();
  };

  const handleOperationChange = (newOperation: string) => {
    setOperation(newOperation);
    if (!expressionIsBetween(newOperation)) {
      setValue2("");
    }
  };

  const popoverPosition =
    side === "right"
      ? "left-full top-0 ml-1"
      : side === "left"
        ? "right-full top-0 mr-1"
        : side === "top"
          ? "bottom-full left-0 mb-1"
          : "top-full left-0 mt-1";

  return (
    <div
      className={`absolute z-50 p-2 px-3 w-[250px] rounded-md border bg-popover text-popover-foreground shadow-md focus:outline-none ${popoverPosition}`}
      id="measure-filter-popover"
      role="dialog"
    >
      {showPinControl || showRequiredControl ? (
        <div className="flex flex-row items-center justify-between mb-2 pointer-events-auto">
          <b>{label}</b>
          <div className="flex flex-row items-center gap-x-1">
            {showRequiredControl ? (
              <button
                type="button"
                className="h-full aspect-square flex items-center text-base font-bold leading-none"
                aria-label={required ? m.filter_make_optional() : m.filter_make_required()}
                title={m.filter_required_tooltip()}
                onClick={onToggleRequired}
              >
                <span
                  className={required ? "text-red-600" : "text-fg-secondary"}
                  aria-hidden="true"
                >
                  *
                </span>
              </button>
            ) : null}
            {showPinControl ? (
              <button
                type="button"
                className="h-full aspect-square flex items-center"
                aria-label={pinned ? m.filter_unpin() : m.filter_pin()}
                title={m.filter_pin_tooltip()}
                onClick={onTogglePin}
              >
                <PinIcon pinned={!!pinned} size={15} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        autoComplete="off"
        className="flex flex-col gap-y-3"
      >
        <FieldSelect
          id="dimension"
          label={m.measure_filter_by_dimension()}
          value={dimension}
          options={dimensionOptions}
          placeholder={m.measure_filter_select_dimension()}
          onChange={setDimension}
        />
        <FieldSelect
          id="operation"
          label={m.measure_filter_threshold()}
          value={operation}
          options={MeasureFilterOperationOptions}
          onChange={handleOperationChange}
        />
        <FieldInput
          id="value1"
          value={value1}
          error={errors.value1}
          placeholder={
            isBetween
              ? m.measure_filter_lower_value()
              : m.measure_filter_enter_number()
          }
          onChange={setValue1}
          onEnter={handleSubmit}
        />

        {isBetween ? (
          <FieldInput
            id="value2"
            value={value2}
            error={errors.value2}
            placeholder={m.measure_filter_higher_value()}
            onChange={setValue2}
            onEnter={handleSubmit}
          />
        ) : null}

        <Button type="primary" className="pointer-events-auto" onClick={handleSubmit}>
          {m.measure_filter_apply()}
        </Button>
      </form>
    </div>
  );
}

/** React stand-in for the `Select` form control (simple native select). */
function FieldSelect({
  id,
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-y-2 max-w-full">
      <label htmlFor={id} className="text-sm flex items-center gap-x-1">
        <span className="text-fg-primary dark:text-fg-primary font-medium">
          {label}
        </span>
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="bg-input flex px-3 py-1 gap-x-2 max-w-full border rounded-[2px] focus:ring-2 focus:ring-primary-100 w-full h-8 text-xs text-fg-primary outline-none"
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** React stand-in for the `Input` form control (numeric threshold field). */
function FieldInput({
  id,
  value,
  onChange,
  onEnter,
  error,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-y-1 max-w-full">
      <div
        className={`flex items-center border rounded-[2px] bg-input px-2 h-8 ${
          error ? "border-red-600 ring-1 ring-transparent" : "border-gray-300"
        }`}
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full h-full outline-none border-0 bg-transparent text-xs placeholder-fg-muted truncate"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
        />
      </div>
      {error ? <div className="text-red-500 text-xs">{error}</div> : null}
    </div>
  );
}
