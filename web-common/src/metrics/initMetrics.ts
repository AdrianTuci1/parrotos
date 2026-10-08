import { page } from "$app/stores";
import { BehaviourEventHandler } from "@statsparrot/web-common/metrics/BehaviourEventHandler";
import { ErrorEventHandler } from "@statsparrot/web-common/metrics/ErrorEventHandler";
import { mapScreenName } from "@statsparrot/web-common/metrics/mapScreenName";
import { BehaviourEventFactory } from "@statsparrot/web-common/metrics/service/BehaviourEventFactory";
import { MetricsService } from "@statsparrot/web-common/metrics/service/MetricsService";
import { ProductHealthEventFactory } from "@statsparrot/web-common/metrics/service/ProductHealthEventFactory";
import { ParrotIntakeClient } from "@statsparrot/web-common/metrics/service/ParrotIntakeClient";
import { GetMetadataResponse } from "@statsparrot/web-common/proto/gen/statsparrot/local/v1/api_pb";
import { get } from "svelte/store";
import { ActiveEventHandler } from "./ActiveEventHandler";
import { collectCommonUserFields } from "./collectCommonUserFields";
import { ErrorEventFactory } from "./service/ErrorEventFactory";

export let metricsService: MetricsService;

export let actionEvent: ActiveEventHandler;
export let behaviourEvent: BehaviourEventHandler;
export let errorEventHandler: ErrorEventHandler;

export async function initMetrics(
  localConfig: GetMetadataResponse,
  host: string,
) {
  metricsService = new MetricsService(new ParrotIntakeClient(host), [
    new ProductHealthEventFactory(),
    new BehaviourEventFactory(),
    new ErrorEventFactory(),
  ]);
  metricsService.loadLocalFields(localConfig);

  const commonUserMetrics = await collectCommonUserFields();
  actionEvent = new ActiveEventHandler(metricsService, commonUserMetrics);
  behaviourEvent = new BehaviourEventHandler(metricsService, commonUserMetrics);
  errorEventHandler = new ErrorEventHandler(
    metricsService,
    commonUserMetrics,
    localConfig.isDev,
    () => mapScreenName(get(page)),
  );
}

// Setters used in cloud
export function setMetricsService(ms: MetricsService) {
  metricsService = ms;
}

export function setErrorEvent(ev: ErrorEventHandler) {
  errorEventHandler = ev;
}

export function setBehaviourEvent(ev: BehaviourEventHandler) {
  behaviourEvent = ev;
}
