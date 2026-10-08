import { page } from "$app/stores";
import { getScreenNameFromPage } from "@statsparrot/web-admin/features/navigation/nav-utils";
import { ParrotAdminTelemetryClient } from "@statsparrot/web-admin/features/telemetry/ParrotAdminTelemetryClient";
import { BehaviourEventHandler } from "@statsparrot/web-common/metrics/BehaviourEventHandler";
import { collectCommonUserFields } from "@statsparrot/web-common/metrics/collectCommonUserFields";
import { ErrorEventHandler } from "@statsparrot/web-common/metrics/ErrorEventHandler";
import {
  setBehaviourEvent,
  setErrorEvent,
  setMetricsService,
} from "@statsparrot/web-common/metrics/initMetrics";
import { BehaviourEventFactory } from "@statsparrot/web-common/metrics/service/BehaviourEventFactory";
import { ErrorEventFactory } from "@statsparrot/web-common/metrics/service/ErrorEventFactory";
import { MetricsService } from "@statsparrot/web-common/metrics/service/MetricsService";
import { ProductHealthEventFactory } from "@statsparrot/web-common/metrics/service/ProductHealthEventFactory";
import { onDestroy } from "svelte";
import { get } from "svelte/store";

export const cloudVersion = import.meta.env.STATSPARROT_UI_PUBLIC_VERSION;

export async function initCloudMetrics() {
  const telemetryClient = new ParrotAdminTelemetryClient();

  const metricsService = new MetricsService(telemetryClient, [
    new ProductHealthEventFactory(),
    new BehaviourEventFactory(),
    new ErrorEventFactory(),
  ]);
  setMetricsService(metricsService);

  // --- Flush telemetry on unload/visibilitychange ---
  const flushTelemetry = () => {
    telemetryClient.flush(true);
  };
  window.addEventListener("beforeunload", flushTelemetry);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushTelemetry();
  });
  onDestroy(() => {
    window.removeEventListener("beforeunload", flushTelemetry);
    document.removeEventListener("visibilitychange", flushTelemetry);
  });

  const commonUserMetrics = await collectCommonUserFields();
  setBehaviourEvent(
    new BehaviourEventHandler(metricsService, commonUserMetrics),
  );
  setErrorEvent(
    new ErrorEventHandler(
      metricsService,
      commonUserMetrics,
      window.location.host.startsWith("localhost"),
      () => getScreenNameFromPage(get(page)),
    ),
  );
  // TODO: add other handlers and callers
}
