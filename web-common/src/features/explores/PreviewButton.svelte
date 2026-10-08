<script lang="ts">
  import { navigating } from "$app/stores";
  import { Button } from "@statsparrot/web-common/components/button";
  import Tooltip from "@statsparrot/web-common/components/tooltip/Tooltip.svelte";
  import TooltipContent from "@statsparrot/web-common/components/tooltip/TooltipContent.svelte";
  import { clearExploreSessionStore } from "@statsparrot/web-common/features/dashboards/state-managers/loaders/explore-web-view-store";
  import { clearMostRecentExploreState } from "@statsparrot/web-common/features/dashboards/state-managers/loaders/most-recent-explore-state";
  import { behaviourEvent } from "@statsparrot/web-common/metrics/initMetrics";
  import { BehaviourEventMedium } from "@statsparrot/web-common/metrics/service/BehaviourEventTypes";
  import {
    MetricsEventScreenName,
    MetricsEventSpace,
  } from "@statsparrot/web-common/metrics/service/MetricsTypes";
  import { Play } from "lucide-svelte";

  export let disabled: boolean;
  export let href: string | null;
  export let reconciling: boolean = false;
  export let label: string = "Preview";

  const viewDashboard = () => {
    if (!href) return;
    // temporary fix. we should do a proper fix by removing this on statsparrot-dev when navigated to preview
    const [, entityType, entityName] = href.split("/");
    if (entityType === "explore") {
      clearExploreSessionStore(entityName, undefined);
      clearMostRecentExploreState(entityName, undefined);
    }
    behaviourEvent
      ?.fireNavigationEvent(
        href,
        BehaviourEventMedium.Button,
        MetricsEventSpace.Workspace,
        MetricsEventScreenName.MetricsDefinition,
        MetricsEventScreenName.Dashboard,
      )
      .catch(console.error);
  };

  $: loading = $navigating?.to?.url.pathname === href;
</script>

<Tooltip distance={8} location="left">
  <Button
    {label}
    type="secondary"
    preload={false}
    compact
    {loading}
    {href}
    {disabled}
    onClick={viewDashboard}
  >
    <div class="flex gap-x-1 items-center">
      <Play size={14} />
      {label}
    </div>
  </Button>
  <TooltipContent slot="tooltip-content">
    {#if reconciling}
      Dashboard preview available after reconciliation
    {:else if disabled}
      File errors must be resolved before previewing
    {:else}
      Preview dashboard
    {/if}
  </TooltipContent>
</Tooltip>
