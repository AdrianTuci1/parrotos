import { protoBase64, Value } from "@bufbuild/protobuf";
import { getDashboardStateFromUrl } from "@statsparrot/web-common/features/dashboards/proto-state/fromProto";
import { getProtoFromDashboardState } from "@statsparrot/web-common/features/dashboards/proto-state/toProto";
import { getFullInitExploreState } from "@statsparrot/web-common/features/dashboards/stores/dashboard-store-defaults";
import {
  createAndExpression,
  createInExpression,
} from "@statsparrot/web-common/features/dashboards/stores/filter-utils";
import {
  AD_BIDS_EXPLORE_INIT,
  AD_BIDS_EXPLORE_WITH_BOOL_DIMENSION,
  AD_BIDS_METRICS_INIT_WITH_TIME,
  AD_BIDS_METRICS_WITH_BOOL_DIMENSION,
  AD_BIDS_NAME,
  AD_BIDS_PUBLISHER_DIMENSION,
  AD_BIDS_PUBLISHER_IS_NULL_DOMAIN,
  TestTimeConstants,
} from "@statsparrot/web-common/features/dashboards/stores/test-data/data";
import { getInitExploreStateForTest } from "@statsparrot/web-common/features/dashboards/stores/test-data/helpers";
import {
  MetricsViewFilter,
  MetricsViewFilter_Cond,
} from "@statsparrot/web-common/proto/gen/statsparrot/runtime/v1/queries_pb";
import { DashboardState } from "@statsparrot/web-common/proto/gen/statsparrot/ui/v1/dashboard_pb";
import { V1TimeGrain } from "@statsparrot/web-common/runtime-client";
import { describe, expect, it } from "vitest";

describe("toProto/fromProto", () => {
  it("backwards compatibility for time controls", () => {
    const exploreState = getFullInitExploreState(
      AD_BIDS_NAME,
      getInitExploreStateForTest(
        AD_BIDS_METRICS_INIT_WITH_TIME,
        AD_BIDS_EXPLORE_INIT,
        {
          timeRangeSummary: {
            min: TestTimeConstants.LAST_DAY.toISOString(),
            max: TestTimeConstants.NOW.toISOString(),
          },
        },
      ),
    );
    exploreState.selectedTimeRange = {
      name: "LAST_SIX_HOURS",
      interval: V1TimeGrain.TIME_GRAIN_HOUR,
    } as any;
    const newState = getDashboardStateFromUrl(
      getProtoFromDashboardState(exploreState, AD_BIDS_EXPLORE_INIT),
      AD_BIDS_METRICS_INIT_WITH_TIME,
      AD_BIDS_EXPLORE_INIT,
    );
    expect(newState.selectedTimeRange?.name).toEqual("PT6H");
  });

  it("backwards compatibility for dimension values", () => {
    const message = new DashboardState({
      filters: new MetricsViewFilter({
        include: [
          new MetricsViewFilter_Cond({
            name: AD_BIDS_PUBLISHER_DIMENSION,
            in: [
              new Value({
                kind: {
                  case: "stringValue",
                  value: "Yahoo",
                },
              }),
              new Value({
                kind: {
                  case: "stringValue",
                  value: "Google",
                },
              }),
            ],
          }),
          new MetricsViewFilter_Cond({
            name: AD_BIDS_PUBLISHER_IS_NULL_DOMAIN,
            in: [
              new Value({
                kind: {
                  case: "stringValue",
                  value: "false",
                },
              }),
            ],
          }),
        ],
      }),
    });
    const proto = protoBase64.enc(message.toBinary());

    const newState = getDashboardStateFromUrl(
      proto,
      AD_BIDS_METRICS_WITH_BOOL_DIMENSION,
      AD_BIDS_EXPLORE_WITH_BOOL_DIMENSION,
    );
    expect(newState.whereFilter).toEqual(
      createAndExpression([
        createInExpression(AD_BIDS_PUBLISHER_DIMENSION, ["Yahoo", "Google"]),
        createInExpression(AD_BIDS_PUBLISHER_IS_NULL_DOMAIN, [false]),
      ]),
    );
  });
});
