import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/react";
import {
  getRuntimeServiceGetExploreQueryOptions,
  getQueryServiceMetricsViewTimeRangeQueryOptions,
} from "@statsparrot/web-common/runtime-client";
import type { ExploreValidSpecResponse } from "@statsparrot/web-common/features/explores/selectors";
import { getParrotDefaultExploreState } from "@statsparrot/web-common/features/dashboards/stores/get-statsparrot-default-explore-state";
import { getExploreStateFromYAMLConfig } from "@statsparrot/web-common/features/dashboards/stores/get-explore-state-from-yaml-config";
import { cascadingExploreStateMerge } from "@statsparrot/web-common/features/dashboards/state-managers/cascading-explore-state-merge";
import { convertURLSearchParamsToExploreState } from "@statsparrot/web-common/features/dashboards/url-state/convertURLSearchParamsToExploreState";
import { correctExploreState } from "@statsparrot/web-common/features/dashboards/stores/correct-explore-state";
import { metricsExplorerStore } from "@statsparrot/web-common/features/dashboards/stores/dashboard-stores";
import type { ExploreState } from "@statsparrot/web-common/features/dashboards/stores/explore-state";

/**
 * React translation of the data-loading half of `DashboardStateDataLoader`.
 *
 * Loads the explore + metrics-view valid specs and the full time range through
 * react-query (using the framework-agnostic `get...QueryOptions`), then builds the
 * initial `ExploreState` with the same cascading merge Parrot uses (URL params → YAML
 * config → Parrot defaults). Writes it into `metricsExplorerStore` so `useExploreState`
 * and every leaf widget subscribe to real data.
 *
 * Unlike the Svelte loader it does not consult session storage / most-recent / bookmark
 * sources yet; those can be layered in on top of the same merge.
 */
export function useParrotExploreState({
  exploreName,
  metricsViewName,
  searchParams,
}: {
  exploreName: string;
  metricsViewName: string;
  searchParams: URLSearchParams;
}): {
  exploreState: ExploreState | undefined;
  isReady: boolean;
  isValid: boolean;
  timeRanges: import("@statsparrot/web-common/runtime-client").V1ExploreTimeRange[];
} {
  const runtimeClient = useRuntimeClient();

  const validSpecQuery = useQuery({
    ...getRuntimeServiceGetExploreQueryOptions(
      runtimeClient,
      { name: exploreName },
      {
        query: {
          select: (data): ExploreValidSpecResponse => ({
            explore: data.explore?.explore?.state?.validSpec,
            metricsView: data.metricsView?.metricsView?.state?.validSpec,
          }),
          enabled: !!exploreName,
        },
      },
    ),
  });

  const metricsViewSpec = validSpecQuery.data?.metricsView;
  const exploreSpec = validSpecQuery.data?.explore;
  const timeDimension = metricsViewSpec?.timeDimension;

  const timeRangeQuery = useQuery({
    ...getQueryServiceMetricsViewTimeRangeQueryOptions(runtimeClient, {
      metricsViewName,
      timeDimension,
    }),
    enabled: Boolean(timeDimension) && validSpecQuery.isSuccess,
  });

  const exploreState = useMemo<ExploreState | undefined>(() => {
    if (!metricsViewSpec || !exploreSpec) return undefined;

    // Parrot guards: a metrics view with a time dimension needs a resolved time range.
    if (timeDimension && !timeRangeQuery.data?.timeRangeSummary) return undefined;

    const timeRangeSummary = timeRangeQuery.data?.timeRangeSummary;

    const statsparrotDefault = getParrotDefaultExploreState(
      metricsViewSpec,
      exploreSpec,
      timeRangeSummary,
    );
    const yamlConfig = getExploreStateFromYAMLConfig(
      exploreSpec,
      timeRangeSummary,
      metricsViewSpec.smallestTimeGrain,
    );
    const { partialExploreState } = convertURLSearchParamsToExploreState(
      searchParams,
      metricsViewSpec,
      exploreSpec,
      {},
    );

    const merged = cascadingExploreStateMerge(
      [partialExploreState, yamlConfig, statsparrotDefault].filter(Boolean),
    ) as ExploreState;
    correctExploreState(metricsViewSpec, merged);
    return merged;
  }, [
    metricsViewSpec,
    exploreSpec,
    timeDimension,
    timeRangeQuery.data?.timeRangeSummary,
    searchParams,
  ]);

  // Seed the shared metrics-explorer store so `useExploreState(exploreName)` resolves.
  useEffect(() => {
    if (exploreState) {
      metricsExplorerStore.init(exploreName, exploreState);
    }
  }, [exploreState, exploreName]);

  return {
    exploreState,
    isReady: validSpecQuery.isLoading || timeRangeQuery.isLoading,
    isValid: Boolean(exploreState),
    timeRanges: exploreSpec?.timeRanges ?? [],
  };
}
