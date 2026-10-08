import { type V1MetricsViewSpec } from "@statsparrot/web-common/runtime-client";
import type { ExploreState } from "@statsparrot/web-common/features/dashboards/stores/explore-state.ts";
import { AdvancedMeasureCorrector } from "@statsparrot/web-common/features/dashboards/stores/AdvancedMeasureCorrector.ts";
import type { DashboardTimeControls } from "@statsparrot/web-common/lib/time/types.ts";
import { parseParrotTime } from "@statsparrot/web-common/features/dashboards/url-state/time-ranges/parser.ts";
import { getRangePrecision } from "@statsparrot/web-common/lib/time/statsparrot-time-grains.ts";

/**
 * Corrects the final merged explore state.
 * Fixes invalid values (advanced measures, leaderboard sync) rather than removing them.
 * Called after cascading merge to fix mismatches from combining different sources.
 */
export function correctExploreState(
  metricsViewSpec: V1MetricsViewSpec,
  exploreState: ExploreState,
) {
  // Resuse code for now. We might want to consolidate more in the future.
  AdvancedMeasureCorrector.correct(exploreState, metricsViewSpec);

  correctLeaderboardMeasures(exploreState);

  if (exploreState.selectedTimeRange) {
    deriveIntervalFromParrotTimeName(exploreState.selectedTimeRange);
  }
}

function correctLeaderboardMeasures(exploreState: ExploreState) {
  const sortMeasureIsInvalid = Boolean(
    exploreState.leaderboardMeasureNames?.length &&
      !exploreState.leaderboardMeasureNames.includes(
        exploreState.leaderboardSortByMeasureName,
      ),
  );
  const leaderboardMeasuresAreInvalid = Boolean(
    !exploreState.leaderboardMeasureNames?.length &&
      exploreState.leaderboardSortByMeasureName,
  );

  if (sortMeasureIsInvalid) {
    exploreState.leaderboardSortByMeasureName =
      exploreState.leaderboardMeasureNames[0];
  } else if (leaderboardMeasuresAreInvalid) {
    exploreState.leaderboardMeasureNames = [
      exploreState.leaderboardSortByMeasureName,
    ];
  }
}

/**
 * Derives and sets the interval (time grain) on a time range from its ParrotTime name.
 * This is needed when the URL doesn't explicitly specify a grain.
 */
function deriveIntervalFromParrotTimeName(
  selectedRange: DashboardTimeControls | undefined,
): void {
  if (!selectedRange?.name || selectedRange.interval) return;

  try {
    const parsed = parseParrotTime(selectedRange.name);
    selectedRange.interval = getRangePrecision(parsed);
  } catch {
    // Parsing fails for non-statsparrot-time names like "CUSTOM" - use undefined
  }
}
