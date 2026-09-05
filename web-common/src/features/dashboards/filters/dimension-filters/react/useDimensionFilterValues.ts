import { useEffect, useState } from "react";
import type { DimensionFilterMode } from "@rilldata/web-common/features/dashboards/filters/dimension-filters/constants";
import {
  combineDimensionSearchCounts,
  combineDimensionSearchResults,
  getFilterForSearchArgs,
} from "@rilldata/web-common/features/dashboards/filters/dimension-filters/dimension-filter-values";
import { mergeDimensionAndMeasureFilters } from "@rilldata/web-common/features/dashboards/filters/measure-filters/measure-filter-utils";
import { getFiltersForOtherDimensions } from "@rilldata/web-common/features/dashboards/selectors";
import {
  createAndExpression,
  sanitiseExpression,
} from "@rilldata/web-common/features/dashboards/stores/filter-utils";
import {
  queryServiceMetricsViewAggregation,
  V1BuiltinMeasure,
  type V1Expression,
} from "@rilldata/web-common/runtime-client";
import type { RuntimeClient } from "@rilldata/web-common/runtime-client/v2";

/**
 * Mirror of the Svelte `DimensionSearchArgs` used by `useDimensionSearch` /
 * `useAllSearchResultsCount` in `dimension-filter-values.ts`. Kept in sync so the
 * React renderer builds identical queries without re-implementing the filter logic.
 */
export type DimensionFilterSearchArgs = {
  mode: DimensionFilterMode;
  searchText: string;
  values: string[];
  timeStart?: string;
  timeEnd?: string;
  timeDimension?: string;
  enabled?: boolean;
  metricsViewWheres?: Map<string, V1Expression>;
};

type QueryState<T> = {
  data: T | undefined;
  error: unknown;
  isFetching: boolean;
};

/**
 * Builds the `additionalFilter` for a single metrics view, mirroring the logic
 * used by the Svelte `useDimensionSearch` query (other dimensions + measure filters).
 */
function buildAdditionalFilter(
  expressionMap: Map<string, V1Expression>,
  mvName: string,
  dimensionName: string,
): ReturnType<typeof sanitiseExpression> {
  return sanitiseExpression(
    mergeDimensionAndMeasureFilters(
      getFiltersForOtherDimensions(
        expressionMap.get(mvName) ?? createAndExpression([]),
        dimensionName,
      ),
      [],
    ),
    undefined,
  );
}

/**
 * React equivalent of the Svelte `useDimensionSearch` query. Returns the deduped
 * search results (including the "below the fold" selected values merge).
 *
 * Reuses the framework-agnostic `getFilterForSearchArgs` and
 * `combineDimensionSearchResults` logic verbatim; only the query wiring differs
 * (raw runtime-client RPC + React state instead of `@tanstack/svelte-query`).
 */
export function useDimensionSearchResults(
  client: RuntimeClient,
  metricsViewNames: string[],
  dimensionName: string,
  args: DimensionFilterSearchArgs,
): QueryState<string[]> {
  const {
    mode,
    searchText,
    values,
    timeStart,
    timeEnd,
    timeDimension,
    enabled,
    metricsViewWheres,
  } = args;

  const [state, setState] = useState<QueryState<string[]>>({
    data: undefined,
    error: undefined,
    isFetching: false,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ data: [], error: undefined, isFetching: false });
      return;
    }

    let active = true;
    const controller = new AbortController();
    setState((prev) => ({ ...prev, isFetching: true }));

    const queries = metricsViewNames.map((mvName) => {
      const where = getFilterForSearchArgs(dimensionName, {
        mode,
        searchText,
        values,
        additionalFilter: buildAdditionalFilter(
          metricsViewWheres ?? new Map(),
          mvName,
          dimensionName,
        ),
      });

      return queryServiceMetricsViewAggregation(
        client,
        {
          metricsView: mvName,
          dimensions: [{ name: dimensionName }],
          timeRange: { start: timeStart, end: timeEnd, timeDimension },
          limit: "250",
          offset: "0",
          sort: [{ name: dimensionName }],
          where,
        },
        { signal: controller.signal },
      );
    });

    Promise.all(queries)
      .then((responses) => {
        if (!active) return;
        // "Above the fold" results read straight off each aggregation row.
        const mainValues: Array<string | null | undefined> = responses
          .filter((r) => !!r?.data)
          .map((r) =>
            r!.data!.map((i) => i[dimensionName] as string | null | undefined),
          )
          .flat();
        setState({
          data: combineDimensionSearchResults(mainValues, mode, values),
          error: undefined,
          isFetching: false,
        });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ data: undefined, error, isFetching: false });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    client,
    metricsViewNames,
    dimensionName,
    mode,
    searchText,
    values,
    timeStart,
    timeEnd,
    timeDimension,
    enabled,
    metricsViewWheres,
  ]);

  return state;
}

/**
 * React equivalent of the Svelte `useAllSearchResultsCount` query. Returns the
 * aggregate count of matching values across all metrics views.
 */
export function useDimensionSearchCount(
  client: RuntimeClient,
  metricsViewNames: string[],
  dimensionName: string,
  args: DimensionFilterSearchArgs,
): QueryState<number> {
  const {
    mode,
    searchText,
    values,
    timeStart,
    timeEnd,
    timeDimension,
    enabled,
    metricsViewWheres,
  } = args;

  const [state, setState] = useState<QueryState<number>>({
    data: undefined,
    error: undefined,
    isFetching: false,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ data: undefined, error: undefined, isFetching: false });
      return;
    }

    let active = true;
    const controller = new AbortController();
    setState((prev) => ({ ...prev, isFetching: true }));

    const queries = metricsViewNames.map((mvName) => {
      const where = getFilterForSearchArgs(dimensionName, {
        mode,
        searchText,
        values,
        additionalFilter: buildAdditionalFilter(
          metricsViewWheres ?? new Map(),
          mvName,
          dimensionName,
        ),
      });

      return queryServiceMetricsViewAggregation(
        client,
        {
          metricsView: mvName,
          measures: [
            {
              name: dimensionName + "__distinct_count",
              builtinMeasure: V1BuiltinMeasure.BUILTIN_MEASURE_COUNT_DISTINCT,
              builtinMeasureArgs: [dimensionName],
            },
          ],
          timeRange: { start: timeStart, end: timeEnd, timeDimension },
          limit: "250",
          offset: "0",
          where,
        },
        { signal: controller.signal },
      );
    });

    Promise.all(queries)
      .then((responses) => {
        if (!active) return;
        const counts = responses
          .filter((r) => !!r?.data)
          .map((r) =>
            r!.data!.map(
              (i) => i[dimensionName + "__distinct_count"] as number,
            ),
          )
          .flat();
        setState({
          data: combineDimensionSearchCounts(counts),
          error: undefined,
          isFetching: false,
        });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ data: undefined, error, isFetching: false });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    client,
    metricsViewNames,
    dimensionName,
    mode,
    searchText,
    values,
    timeStart,
    timeEnd,
    timeDimension,
    enabled,
    metricsViewWheres,
  ]);

  return state;
}
