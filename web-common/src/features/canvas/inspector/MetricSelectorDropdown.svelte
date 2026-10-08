<script lang="ts">
  import Select from "@statsparrot/web-common/components/forms/Select.svelte";
  import type {
    AllKeys,
    ComponentInputParam,
  } from "@statsparrot/web-common/features/canvas/inspector/types";
  import {
    ResourceKind,
    useFilteredResources,
  } from "@statsparrot/web-common/features/entity-management/resource-selectors";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
  import { isString } from "../../workspaces/visual-util";
  import type { BaseCanvasComponent } from "../components/BaseCanvasComponent";
  import type { ComponentSpec } from "../components/types";

  const client = useRuntimeClient();

  export let component: BaseCanvasComponent;
  export let key: AllKeys<ComponentSpec>;
  export let inputParam: ComponentInputParam;

  $: spec = component.specStore;

  $: metricsViewsQuery = useFilteredResources(client, ResourceKind.MetricsView);
  $: metricsViews = $metricsViewsQuery?.data ?? [];

  $: metricsViewNames = metricsViews
    .map((view) => view.meta?.name?.name)
    .filter(isString);

  $: metricsView =
    "metrics_view" in $spec ? $spec.metrics_view : metricsViewNames[0];
</script>

<Select
  id="metrics-view-selector"
  label={inputParam.label}
  bind:value={metricsView}
  full
  size="sm"
  sameWidth
  options={metricsViewNames.map((name) => ({
    label: name,
    value: name,
  }))}
  onChange={(value) => {
    component.updateProperty(key, value);
  }}
  tooltip="View documentation: https://docs.statsparrot.com/reference/project-files/metrics-views"
/>
