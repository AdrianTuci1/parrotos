<script lang="ts">
  import { Button } from "@statsparrot/web-common/components/button";
  import RefreshIcon from "@statsparrot/web-common/components/icons/RefreshIcon.svelte";
  import Tooltip from "@statsparrot/web-common/components/tooltip/Tooltip.svelte";
  import TooltipContent from "@statsparrot/web-common/components/tooltip/TooltipContent.svelte";
  import { ResourceKind } from "@statsparrot/web-common/features/entity-management/resource-selectors";
  import {
    V1ReconcileStatus,
    type V1Resource,
  } from "@statsparrot/web-common/runtime-client";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
  import { createRuntimeServiceCreateTriggerMutation } from "@statsparrot/web-common/runtime-client";

  export let resource: V1Resource | undefined;
  export let hasUnsavedChanges = false;

  const client = useRuntimeClient();
  const triggerMutation = createRuntimeServiceCreateTriggerMutation(client);

  $: connectorName = resource?.meta?.name?.name;
  $: isReconciling =
    resource?.meta?.reconcileStatus ===
    V1ReconcileStatus.RECONCILE_STATUS_RUNNING;

  function refreshConnector() {
    if (!connectorName) return;
    void $triggerMutation.mutateAsync({
      resources: [{ kind: ResourceKind.Connector, name: connectorName }],
    });
  }
</script>

<div class="flex items-center gap-x-2">
  <Tooltip distance={8}>
    <Button
      square
      type="secondary"
      onClick={refreshConnector}
      disabled={$triggerMutation.isPending ||
        isReconciling ||
        hasUnsavedChanges}
      loading={$triggerMutation.isPending}
      loadingCopy="Refreshing"
      label="Refresh Connector"
    >
      <RefreshIcon size="14px" />
    </Button>
    <TooltipContent slot="tooltip-content">
      {#if hasUnsavedChanges}
        Save your changes to refresh
      {:else}
        Refresh connector
      {/if}
    </TooltipContent>
  </Tooltip>
</div>
