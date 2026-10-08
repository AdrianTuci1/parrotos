<script lang="ts">
  import CanvasDashboardEmbed from "@statsparrot/web-common/features/canvas/CanvasDashboardEmbed.svelte";
  import CanvasProvider from "@statsparrot/web-common/features/canvas/CanvasProvider.svelte";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";

  export let data;

  $: ({
    canvasName,
    project: { id: projectId },
  } = data);

  const runtimeClient = useRuntimeClient();
</script>

{#key `${runtimeClient.instanceId}::${canvasName}`}
  <CanvasProvider
    {canvasName}
    instanceId={runtimeClient.instanceId}
    {projectId}
    showBanner
  >
    <CanvasDashboardEmbed {canvasName} />
  </CanvasProvider>
{/key}
