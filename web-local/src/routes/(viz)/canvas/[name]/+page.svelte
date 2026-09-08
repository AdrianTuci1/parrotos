<script lang="ts">
  import CanvasDashboardEmbed from "@statsparrot/web-common/features/canvas/CanvasDashboardEmbed.svelte";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
  import CanvasProvider from "@statsparrot/web-common/features/canvas/CanvasProvider.svelte";
  import DashboardChat from "@statsparrot/web-common/features/chat/DashboardChat.svelte";
  import { ResourceKind } from "@statsparrot/web-common/features/entity-management/resource-selectors.ts";
  import ErrorPage from "@statsparrot/web-common/components/ErrorPage.svelte";
  import { resetSelectedMockUserAfterNavigate } from "@statsparrot/web-common/features/dashboards/granular-access-policies/resetSelectedMockUserAfterNavigate";
  import { selectedMockUserStore } from "@statsparrot/web-common/features/dashboards/granular-access-policies/stores";
  import { useCanvas } from "@statsparrot/web-common/features/canvas/selector";
  import {
    isNotFoundError,
    extractErrorStatusCode,
  } from "@statsparrot/web-common/lib/errors";
  import { previewModeStore } from "@statsparrot/web-common/layout/preview-mode-store";
  import { queryClient } from "@statsparrot/web-common/lib/svelte-query/globalQueryClient";
  import type { PageData } from "./$types";

  const runtimeClient = useRuntimeClient();

  export let data: PageData;

  $: ({ canvasName } = data);

  resetSelectedMockUserAfterNavigate(queryClient, runtimeClient);

  $: canvasQuery = useCanvas(runtimeClient, canvasName);

  $: mockUserHasNoAccess =
    $selectedMockUserStore && isNotFoundError($canvasQuery.error);

  $: isCanvasNotFound =
    !$canvasQuery.data &&
    $canvasQuery.isError &&
    isNotFoundError($canvasQuery.error);

  $: homeHref = $previewModeStore ? "/dashboards" : "/";
</script>

{#key `${runtimeClient.instanceId}::${canvasName}`}
  {#if mockUserHasNoAccess}
    <ErrorPage
      statusCode={extractErrorStatusCode($canvasQuery.error)}
      header="This user can't access this dashboard"
      body="The security policy for this dashboard may make contents invisible to you. If you deploy this dashboard, {$selectedMockUserStore?.email} will see a 404."
      href={homeHref}
    />
  {:else if isCanvasNotFound}
    <ErrorPage statusCode={404} header="Dashboard not found" href={homeHref} />
  {:else}
    <div class="flex h-full overflow-hidden">
      <div class="flex-1 overflow-hidden">
        <CanvasProvider
          {canvasName}
          instanceId={runtimeClient.instanceId}
          showBanner
        >
          <CanvasDashboardEmbed {canvasName} />
        </CanvasProvider>
      </div>
      <DashboardChat kind={ResourceKind.Canvas} />
    </div>
  {/if}
{/key}
