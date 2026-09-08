import { validateParrotTime } from "@statsparrot/web-common/features/dashboards/url-state/time-ranges/parser";
import type { DashboardTimeControls } from "@statsparrot/web-common/lib/time/types";
import {
  getQueryServiceMetricsViewTimeRangesQueryKey,
  queryServiceMetricsViewTimeRanges,
  type V1ExploreSpec,
} from "@statsparrot/web-common/runtime-client";
import type { RuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
import { queryClient } from "@statsparrot/web-common/lib/svelte-query/globalQueryClient";

export async function resolveTimeRanges(
  client: RuntimeClient,
  exploreSpec: V1ExploreSpec,
  timeRanges: (DashboardTimeControls | undefined)[],
  timeZone: string | undefined,
  executionTime: string | undefined = undefined,
  timeDimension: string | undefined = undefined,
) {
  const statsparrotTimes: string[] = [];
  const statsparrotTimeToTimeRange = new Map<number, number>();
  const timeRangesToReturn = new Array<DashboardTimeControls | undefined>(
    timeRanges.length,
  );

  timeRanges.forEach((tr, i) => {
    timeRangesToReturn[i] = tr;

    if (
      !tr?.name ||
      // already resolved
      tr.start ||
      tr.end ||
      !!validateParrotTime(tr.name)
    )
      return;

    statsparrotTimeToTimeRange.set(statsparrotTimes.length, i);
    statsparrotTimes.push(tr.name);
  });

  if (statsparrotTimes.length === 0) return timeRangesToReturn;

  const metricsViewName = exploreSpec.metricsView!;

  try {
    const timeRangesResp = await fetchTimeRanges({
      client,
      metricsViewName,
      statsparrotTimes,
      timeZone,
      timeDimension,
      executionTime,
    });

    timeRangesResp.resolvedTimeRanges?.forEach((tr, index) => {
      const mappedIndex = statsparrotTimeToTimeRange.get(index);
      if (mappedIndex === undefined || !timeRangesToReturn[mappedIndex]) return;
      timeRangesToReturn[mappedIndex].start = new Date(tr.start!);
      timeRangesToReturn[mappedIndex].end = new Date(tr.end!);
    });

    return timeRangesToReturn;
  } catch (error) {
    console.error(
      `Failed to resolve time ranges for metrics view ${metricsViewName} in instance ${client.instanceId}`,
      error,
    );
    return timeRangesToReturn;
  }
}

export async function fetchTimeRanges({
  client,
  metricsViewName,
  statsparrotTimes,
  timeZone,
  timeDimension,
  executionTime,
  cacheBust = false,
}: {
  client: RuntimeClient;
  metricsViewName: string;
  statsparrotTimes: string[];
  timeDimension?: string | undefined;
  timeZone: string | undefined;
  executionTime?: string;
  cacheBust?: boolean;
}) {
  const requestBody = {
    metricsViewName,
    expressions: statsparrotTimes,
    timeZone,
    executionTime: executionTime as any,
    timeDimension,
  };

  const queryKey = getQueryServiceMetricsViewTimeRangesQueryKey(
    client.instanceId,
    requestBody,
  );

  if (cacheBust) {
    await queryClient.invalidateQueries({
      queryKey: queryKey,
    });
  }

  const response = await queryClient.fetchQuery({
    queryKey: queryKey,
    queryFn: () => queryServiceMetricsViewTimeRanges(client, requestBody),
    staleTime: 60,
  });

  return response;
}
