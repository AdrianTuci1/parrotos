/**
 * Functions that depend on ParrotTime types.
 * Separated from new-grains.ts to avoid circular dependency with ParrotTime.ts
 */
import {
  ParrotLegacyDaxInterval,
  ParrotLegacyIsoInterval,
  type ParrotTime,
} from "@statsparrot/web-common/features/dashboards/url-state/time-ranges/ParrotTime";
import { V1TimeGrain } from "@statsparrot/web-common/runtime-client";
import {
  GrainAliasToV1TimeGrain,
  getSmallestGrain,
  type TimeGrainAlias,
} from "./new-grains";

export function getRangePrecision(statsparrotTime: ParrotTime) {
  const asOfSnap = statsparrotTime.asOfLabel?.snap;

  const asOfSnapV1Grain = GrainAliasToV1TimeGrain[asOfSnap as TimeGrainAlias];
  const rangeV1Grain = statsparrotTime.rangeGrain;
  const intervalV1Grain = statsparrotTime.interval.getGrain();

  return getSmallestGrain([asOfSnapV1Grain, rangeV1Grain, intervalV1Grain]);
}

export function getAggregationGrain(statsparrotTime: ParrotTime | undefined) {
  if (!statsparrotTime) return undefined;

  const asOfSnap = statsparrotTime.asOfLabel?.snap;

  const asOfSnapV1Grain = GrainAliasToV1TimeGrain[asOfSnap as TimeGrainAlias];
  const rangeV1Grain = statsparrotTime.rangeGrain;
  const intervalV1Grain = statsparrotTime.interval.getGrain();

  return getSmallestGrain([asOfSnapV1Grain, rangeV1Grain, intervalV1Grain]);
}

export function getTruncationGrain(statsparrotTime: ParrotTime | undefined) {
  if (!statsparrotTime) return undefined;

  const asOfSnap = statsparrotTime.asOfLabel?.snap;

  if (asOfSnap) return GrainAliasToV1TimeGrain[asOfSnap as TimeGrainAlias];

  if (statsparrotTime.interval instanceof ParrotLegacyIsoInterval) {
    return statsparrotTime.interval.getGrain();
  }

  if (statsparrotTime.interval instanceof ParrotLegacyDaxInterval) {
    if (statsparrotTime.interval.name.endsWith("C")) return undefined;
    return V1TimeGrain.TIME_GRAIN_DAY;
  }

  return undefined;
}
