import { readable, writable } from "svelte/store";
import { getRillDefaultExploreState } from "@rilldata/web-common/features/dashboards/stores/get-rill-default-explore-state";
import { createStateManagerReadables } from "@rilldata/web-common/features/dashboards/state-managers/selectors";
import { createStateManagerActions } from "@rilldata/web-common/features/dashboards/state-managers/actions";
import { queryClient } from "@rilldata/web-common/lib/svelte-query/globalQueryClient";
import {
  DEFAULT_METRICS_VIEW,
  getMockMetricsView,
  getMockMetricsViewResource,
} from "./mockAdapter";

const MOCK_TIME_RANGE_SUMMARY = {
  min: "2026-01-01T00:00:00.000Z",
  max: "2026-01-05T23:59:59.000Z",
};

/**
 * A `StateManagers` populated entirely from the mock adapter when no Rill runtime
 * is reachable. Reuses the real, framework-agnostic Rill selectors/actions plus the
 * default explore-state builder, so the product `Filters` bar and the explore
 * state-management render against mock data without a live runtime.
 */
export function createMockStateManagers(
  metricsViewName = DEFAULT_METRICS_VIEW,
) {
  const mockResource = getMockMetricsViewResource(metricsViewName);
  const validSpec = mockResource?.metricsView?.state?.validSpec ?? null;
  if (!validSpec) {
    throw new Error(`No mock metrics view for "${metricsViewName}"`);
  }

  const exploreSpec = { metricsView: metricsViewName, timeRanges: [] };

  const dashboardStore = readable(
    getRillDefaultExploreState(
      validSpec,
      exploreSpec,
      MOCK_TIME_RANGE_SUMMARY,
    ),
  );
  const validSpecStore = readable({
    isSuccess: true,
    isLoading: false,
    isFetching: false,
    isRefetching: false,
    data: { explore: exploreSpec, metricsView: validSpec },
  });
  const timeRangeSummaryStore = readable({
    isSuccess: true,
    isLoading: false,
    isFetching: false,
    isRefetching: false,
    data: { timeRangeSummary: MOCK_TIME_RANGE_SUMMARY },
  });

  const selectors = createStateManagerReadables({
    dashboardStore,
    validSpecStore,
    timeRangeSummaryStore,
    queryClient,
  });
  const noOp = () => {};
  const actions = createStateManagerActions({ updateDashboard: noOp });

  return {
    runtimeClient: undefined,
    metricsViewName: writable(metricsViewName),
    exploreName: writable(metricsViewName),
    metricsStore: undefined,
    dashboardStore,
    timeDimension: writable(validSpec?.timeDimension),
    timeRangeSummaryStore,
    validSpecStore,
    queryClient,
    updateDashboard: noOp,
    selectors,
    actions,
    contextColumnWidths: writable({}),
    defaultExploreState: readable({}),
    getMockMetricsView: () => getMockMetricsView(metricsViewName),
  };
}
