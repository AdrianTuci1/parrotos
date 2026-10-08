<script lang="ts">
  import CanvasIcon from "@statsparrot/web-common/components/icons/CanvasIcon.svelte";
  import ExploreIcon from "@statsparrot/web-common/components/icons/ExploreIcon.svelte";
  import Model from "@statsparrot/web-common/components/icons/Model.svelte";
  import { fileArtifacts } from "@statsparrot/web-common/features/entity-management/file-artifacts";
  import { ResourceKind } from "@statsparrot/web-common/features/entity-management/resource-selectors";
  import { featureFlags } from "@statsparrot/web-common/features/feature-flags";
  import { navigateToFile } from "@statsparrot/web-common/layout/navigation/editor-routing";
  import { getScreenNameFromPage } from "@statsparrot/web-common/features/file-explorer/telemetry";
  import { openResourceGraphQuickView } from "@statsparrot/web-common/features/resource-graph/quick-view/quick-view-store";
  import NavigationMenuItem from "@statsparrot/web-common/layout/navigation/NavigationMenuItem.svelte";
  import { queryClient } from "@statsparrot/web-common/lib/svelte-query/globalQueryClient";
  import { behaviourEvent } from "@statsparrot/web-common/metrics/initMetrics";
  import { BehaviourEventMedium } from "@statsparrot/web-common/metrics/service/BehaviourEventTypes";
  import {
    MetricsEventScreenName,
    MetricsEventSpace,
  } from "@statsparrot/web-common/metrics/service/MetricsTypes";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
  import { GitBranch, WandIcon } from "lucide-svelte";
  import {
    createCanvasDashboardFromMetricsView,
    createCanvasDashboardFromMetricsViewWithAgent,
  } from "./ai-generation/generateMetricsView";
  import {
    enableInlineExploreAndPreview,
    parseInlineExploreState,
  } from "./inline-explore";

  const runtimeClient = useRuntimeClient();
  const { ai, developerChat } = featureFlags;

  export let filePath: string;

  $: fileArtifact = fileArtifacts.getFileArtifact(filePath);

  $: resourceQuery = fileArtifact.getResource(queryClient);
  $: resource = $resourceQuery.data;

  $: ({ editorContent, remoteContent } = fileArtifact);
  // Legacy (unversioned) metrics views auto-emit an explore, so there is nothing
  // to create; the explore item is only shown for latest-version metrics views.
  $: ({ isLatestVersion, exploreEnabled } = parseInlineExploreState(
    $editorContent ?? $remoteContent,
  ));

  /**
   * Get the name of the dashboard's underlying model (if any).
   * Note that not all dashboards have an underlying model. Some dashboards are
   * underpinned by a source/table.
   */
  $: referenceModelName = $resourceQuery?.data?.meta?.refs?.filter(
    (ref) => ref.kind === ResourceKind.Model,
  )?.[0]?.name;

  $: hasMenuItems = Boolean(referenceModelName || resource);

  $: metricsViewName = resource?.meta?.name?.name;

  const editModel = async () => {
    if (!referenceModelName) return;
    const artifact = fileArtifacts.findFileArtifact(
      ResourceKind.Model,
      referenceModelName,
    );
    if (!artifact) return;
    const previousScreenName = getScreenNameFromPage();
    await navigateToFile(artifact.path);
    await behaviourEvent?.fireNavigationEvent(
      referenceModelName,
      BehaviourEventMedium.Menu,
      MetricsEventSpace.LeftPanel,
      previousScreenName,
      MetricsEventScreenName.Model,
    );
  };

  function viewGraph() {
    if (!resource) {
      console.warn(
        "[MetricsViewMenuItems] Cannot open resource graph: resource unavailable.",
      );
      return;
    }
    openResourceGraphQuickView(resource);
  }

  async function handleCreateCanvasDashboard() {
    if (!metricsViewName) return;
    // Use developer agent if enabled, otherwise fall back to RPC
    if ($developerChat) {
      createCanvasDashboardFromMetricsViewWithAgent(
        runtimeClient,
        metricsViewName,
      );
    } else {
      await createCanvasDashboardFromMetricsView(
        runtimeClient,
        metricsViewName,
      );
    }
  }
</script>

{#if hasMenuItems}
  {#if referenceModelName}
    <NavigationMenuItem onclick={editModel}>
      <Model slot="icon" />
      Edit underlying model
    </NavigationMenuItem>
  {/if}
  <NavigationMenuItem onclick={viewGraph}>
    <GitBranch slot="icon" size="14px" />
    View DAG graph
  </NavigationMenuItem>
  {#if resource}
    <NavigationMenuItem
      disabled={!metricsViewName}
      onclick={handleCreateCanvasDashboard}
    >
      <CanvasIcon slot="icon" />
      <div class="flex gap-x-2 items-center">
        Generate Canvas Dashboard
        {#if $ai}
          with AI
          <WandIcon class="w-3 h-3" />
        {/if}
      </div>
    </NavigationMenuItem>
  {/if}
  {#if resource && isLatestVersion}
    <NavigationMenuItem
      onclick={() => enableInlineExploreAndPreview(queryClient, filePath)}
    >
      <ExploreIcon slot="icon" />
      {exploreEnabled ? "Edit Explore Dashboard" : "Create Explore Dashboard"}
    </NavigationMenuItem>
  {/if}
{:else}
  <NavigationMenuItem onclick={viewGraph}>
    <GitBranch slot="icon" size="14px" />
    View DAG graph
  </NavigationMenuItem>
{/if}
