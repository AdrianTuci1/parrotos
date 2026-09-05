import { useMemo } from "react";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import type { MeasureFilterEntry } from "@rilldata/web-common/features/dashboards/filters/measure-filters/measure-filter-entry";
import {
  AllMeasureFilterOperationOptions,
  AllMeasureFilterTypeOptions,
  MeasureFilterOperation,
  MeasureFilterType,
} from "@rilldata/web-common/features/dashboards/filters/measure-filters/measure-filter-options";

export interface MeasureFilterBodyProps {
  dimensionName: string;
  label?: string;
  filter?: MeasureFilterEntry;
  labelMaxWidth?: string;
  comparisonLabel?: string;
}

/**
 * React translation of `MeasureFilterBody.svelte`. Renders the body content of a
 * measure filter chip: the measure label, the optional "for {dimension}" suffix, the
 * comparison type label, and the short-hand notation of the filter criteria.
 */
export default function MeasureFilterBody({
  dimensionName,
  label,
  filter,
  labelMaxWidth = "320px",
  comparisonLabel = "",
}: MeasureFilterBodyProps) {
  const { typeLabel, shortLabel } = useMemo(() => {
    if (!filter) return { typeLabel: undefined, shortLabel: undefined };

    let typeLabel: string | undefined;
    let shortLabel: string | undefined;

    const typeOption = AllMeasureFilterTypeOptions.find(
      (o) => o.value === filter.type,
    );
    typeLabel = typeOption?.shortLabel;

    if (
      filter.type === MeasureFilterType.AbsoluteChange ||
      filter.type === MeasureFilterType.PercentChange
    ) {
      typeLabel =
        (typeLabel ?? "") +
        " " +
        m.filter_measure_from_comparison({ comparison: comparisonLabel });
    }

    switch (filter.operation) {
      case MeasureFilterOperation.GreaterThan:
      case MeasureFilterOperation.GreaterThanOrEquals:
      case MeasureFilterOperation.LessThan:
      case MeasureFilterOperation.LessThanOrEquals:
      case MeasureFilterOperation.Equals:
      case MeasureFilterOperation.NotEquals:
        shortLabel =
          (AllMeasureFilterOperationOptions.find(
            (o) => o.value === filter.operation,
          )?.shortLabel ?? "") +
          " " +
          filter.value1 +
          (filter.type === MeasureFilterType.PercentChange ? "%" : "");
        break;
      case MeasureFilterOperation.Between:
        shortLabel = `(${filter.value1},${filter.value2})`;
        break;
      case MeasureFilterOperation.NotBetween:
        shortLabel = `!(${filter.value1},${filter.value2})`;
        break;
    }

    return { typeLabel, shortLabel };
  }, [filter, comparisonLabel]);

  return (
    <div className="flex gap-x-2">
      <div
        className="font-bold text-ellipsis overflow-hidden whitespace-nowrap"
        style={{ maxWidth: labelMaxWidth }}
      >
        {label}
        {dimensionName ? (
          <span>
            {m.filter_measure_for_dimension({ dimension: dimensionName })}
          </span>
        ) : null}
        {typeLabel ? <span>{typeLabel}</span> : null}
      </div>
      <div className="flex flex-wrap flex-row items-baseline gap-y-1">
        {shortLabel ? shortLabel : null}
      </div>
    </div>
  );
}
