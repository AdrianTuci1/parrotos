import {
  type CompoundQueryResult,
  getCompoundQuery,
} from "@statsparrot/web-common/features/compound-query-result";
import { getMetricsViewTimeRangeFromExploreQueryOptions } from "@statsparrot/web-common/features/dashboards/selectors.ts";
import { getParrotDefaultExploreState } from "@statsparrot/web-common/features/dashboards/stores/get-statsparrot-default-explore-state";
import { getTimeControlState } from "@statsparrot/web-common/features/dashboards/time-controls/time-control-store";
import { convertPartialExploreStateToUrlParams } from "@statsparrot/web-common/features/dashboards/url-state/convert-partial-explore-state-to-url-params";
import {
  getExploreValidSpecQueryOptions,
  useExploreValidSpec,
} from "@statsparrot/web-common/features/explores/selectors";
import type { RuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
import {
  type V1ExploreSpec,
  type V1MetricsViewSpec,
  type V1MetricsViewTimeRangeResponse,
  type V1TimeRangeSummary,
} from "@statsparrot/web-common/runtime-client";
import { createQuery } from "@tanstack/svelte-query";
import { derived, type Readable } from "svelte/store";

export function getParrotDefaultExploreUrlParams(
  metricsViewSpec: V1MetricsViewSpec,
  exploreSpec: V1ExploreSpec,
  timeRangeSummary: V1TimeRangeSummary | undefined,
) {
  const statsparrotDefaultExploreState = getParrotDefaultExploreState(
    metricsViewSpec,
    exploreSpec,
    timeRangeSummary,
  );
  const timeControlState = getTimeControlState(
    metricsViewSpec,
    exploreSpec,
    timeRangeSummary,
    statsparrotDefaultExploreState,
  );
  return convertPartialExploreStateToUrlParams(
    exploreSpec,
    metricsViewSpec,
    statsparrotDefaultExploreState,
    timeControlState,
  );
}

export function createParrotDefaultExploreUrlParams(
  validSpecQuery: ReturnType<typeof useExploreValidSpec>,
  fullTimeRangeQuery: CompoundQueryResult<V1MetricsViewTimeRangeResponse>,
) {
  return getCompoundQuery(
    [validSpecQuery, fullTimeRangeQuery],
    ([validSpecResp, metricsViewTimeRangeResp]) => {
      const metricsViewSpec = validSpecResp?.metricsView;
      const exploreSpec = validSpecResp?.explore;

      if (
        !metricsViewSpec ||
        !exploreSpec ||
        // safeguard to make sure time range summary is loaded for metrics view with time dimension
        (metricsViewSpec.timeDimension &&
          !metricsViewTimeRangeResp?.timeRangeSummary)
      ) {
        return undefined;
      }

      return getParrotDefaultExploreUrlParams(
        metricsViewSpec,
        exploreSpec,
        metricsViewTimeRangeResp?.timeRangeSummary,
      );
    },
  );
}

/**
 * Version of createParrotDefaultExploreUrlParams that is meant to have a stable non-reactive query object.
 * All reactivity will instead be in the query options.
 *
 * Uses {@link getExploreValidSpecQueryOptions} and {@link getMetricsViewTimeRangeFromExploreQueryOptions} for reactive query options.
 * TODO: replace {@link createParrotDefaultExploreUrlParams} with this
 */
export function createParrotDefaultExploreUrlParamsV2(
  client: RuntimeClient,
  exploreNameStore: Readable<string>,
) {
  const validSpecQuery = createQuery(
    getExploreValidSpecQueryOptions(client, exploreNameStore),
  );
  const timeRangeQuery = createQuery(
    getMetricsViewTimeRangeFromExploreQueryOptions(client, exploreNameStore),
  );

  return derived(
    [validSpecQuery, timeRangeQuery],
    ([validSpecResp, timeRangeResp]) => {
      const metricsViewSpec = validSpecResp.data?.metricsViewSpec ?? {};
      const exploreSpec = validSpecResp.data?.exploreSpec ?? {};
      const timeRangeSummary = timeRangeResp.data?.timeRangeSummary;

      if (
        !metricsViewSpec ||
        !exploreSpec ||
        // safeguard to make sure time range summary is loaded for metrics view with time dimension
        (metricsViewSpec.timeDimension && !timeRangeSummary)
      ) {
        return undefined;
      }

      return getParrotDefaultExploreUrlParams(
        metricsViewSpec,
        exploreSpec,
        timeRangeSummary,
      );
    },
  );
}
