import { categorizeSourceError } from "@statsparrot/web-common/features/sources/errors/errors";
import { getFileTypeFromPath } from "@statsparrot/web-common/features/sources/sourceUtils";
import {
  behaviourEvent,
  errorEventHandler,
} from "@statsparrot/web-common/metrics/initMetrics";
import type { BehaviourEventMedium } from "@statsparrot/web-common/metrics/service/BehaviourEventTypes";
import type {
  MetricsEventScreenName,
  MetricsEventSpace,
} from "@statsparrot/web-common/metrics/service/MetricsTypes";
import type { SourceConnectionType } from "@statsparrot/web-common/metrics/service/SourceEventTypes";

export function emitSourceErrorTelemetry(
  space: MetricsEventSpace,
  screenName: MetricsEventScreenName,
  errorMessage: string,
  connectionType: SourceConnectionType,
  fileName: string,
) {
  const categorizedError = categorizeSourceError(errorMessage);
  const fileType = getFileTypeFromPath(fileName);
  const isGlob = fileName.includes("*");

  errorEventHandler?.fireSourceErrorEvent(
    space,
    screenName,
    categorizedError,
    connectionType,
    fileType,
    isGlob,
  );
}

export function emitSourceSuccessTelemetry(
  space: MetricsEventSpace,
  screenName: MetricsEventScreenName,
  medium: BehaviourEventMedium,
  connectionType: SourceConnectionType,
  fileName: string,
) {
  const fileType = getFileTypeFromPath(fileName);
  const isGlob = fileName.includes("*");

  behaviourEvent?.fireSourceSuccessEvent(
    medium,
    screenName,
    space,
    connectionType,
    fileType,
    isGlob,
  );
}
