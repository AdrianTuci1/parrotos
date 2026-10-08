import type { PivotChipData } from "@statsparrot/web-common/features/dashboards/pivot/types.ts";
import { TIME_GRAIN } from "@statsparrot/web-common/lib/time/config.ts";
import {
  type V1MetricsViewAggregationDimension,
  V1TimeGrain,
} from "@statsparrot/web-common/runtime-client";

export function getDimensionForTimeField(
  timeDimension: string,
  selectedTimezone: string,
  pivotChipData: PivotChipData,
  humanReadableAlias: boolean,
) {
  return <V1MetricsViewAggregationDimension>{
    name: timeDimension,
    timeGrain: pivotChipData.id as V1TimeGrain,
    timeZone: selectedTimezone,
    alias: humanReadableAlias
      ? `Time ${pivotChipData.title}`
      : `${timeDimension}_statsparrot_${pivotChipData.id}`,
  };
}

export function getDimensionNameFromAggregationDimension(
  dimension: V1MetricsViewAggregationDimension,
) {
  if (!dimension.timeGrain) return dimension.name!;
  return `${dimension.name}_statsparrot_${dimension.timeGrain}`;
}

const timeDimensionNameRegex = /^(.*)_statsparrot_(.*)$/;
export function getAggregationDimensionFromFieldName(
  fieldName: string,
  timeZone: string,
) {
  const match = timeDimensionNameRegex.exec(fieldName);
  if (!match) {
    return <V1MetricsViewAggregationDimension>{
      name: fieldName,
    };
  }

  const [, timeCol, grain] = match;
  const alias = `Time ${TIME_GRAIN[grain].label}`;
  return <V1MetricsViewAggregationDimension>{
    name: timeCol,
    timeGrain: grain as V1TimeGrain,
    timeZone,
    alias,
  };
}
