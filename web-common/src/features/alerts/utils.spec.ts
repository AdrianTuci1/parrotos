import type { AlertFormValues } from "@statsparrot/web-common/features/alerts/form-utils";
import { generateAlertName } from "@statsparrot/web-common/features/alerts/utils";
import {
  MeasureFilterOperation,
  MeasureFilterType,
} from "@statsparrot/web-common/features/dashboards/filters/measure-filters/measure-filter-options";
import type { DashboardTimeControls } from "@statsparrot/web-common/lib/time/types.ts";
import type { V1MetricsViewSpec } from "@statsparrot/web-common/runtime-client";
import { describe, expect, it } from "vitest";

const MetricsView: V1MetricsViewSpec = {
  measures: [
    {
      name: "total_records",
      displayName: "Total records",
    },
  ],
};

describe("generateAlertName", () => {
  const TestCases: {
    title: string;
    formValues: Partial<AlertFormValues>;
    selectedComparisonTimeRange: DashboardTimeControls | undefined;
    expected: string;
  }[] = [
    {
      title: "value criteria without comparison",
      formValues: {
        measure: "total_records",
        criteria: [
          {
            measure: "total_records",
            type: MeasureFilterType.Value,
            operation: MeasureFilterOperation.LessThan,
            value1: "10",
            value2: "",
          },
        ],
      },
      selectedComparisonTimeRange: undefined,
      expected: "Total records value alert",
    },
    {
      title: "absolute change criteria with comparison",
      formValues: {
        measure: "total_records",
        criteria: [
          {
            measure: "total_records",
            type: MeasureFilterType.AbsoluteChange,
            operation: MeasureFilterOperation.GreaterThanOrEquals,
            value1: "10",
            value2: "",
          },
        ],
      },
      selectedComparisonTimeRange: {
        name: "statsparrot-PW",
      } as DashboardTimeControls,
      expected: "Total records change vs previous week alert",
    },
    {
      title: "percent change criteria with comparison",
      formValues: {
        measure: "total_records",
        criteria: [
          {
            measure: "total_records",
            type: MeasureFilterType.PercentChange,
            operation: MeasureFilterOperation.GreaterThan,
            value1: "-10",
            value2: "",
          },
        ],
      },
      selectedComparisonTimeRange: {
        name: "statsparrot-PM",
      } as DashboardTimeControls,
      expected: "Total records % change vs previous month alert",
    },
  ];

  for (const {
    title,
    formValues,
    selectedComparisonTimeRange,
    expected,
  } of TestCases) {
    it(title, () => {
      expect(
        generateAlertName(
          formValues as AlertFormValues,
          selectedComparisonTimeRange,
          MetricsView,
        ),
      ).toEqual(expected);
    });
  }
});
