<script lang="ts">
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
  import { fileArtifacts } from "@statsparrot/web-common/features/entity-management/file-artifacts.ts";
  import type { LayoutData } from "./$types";
  import type { Snippet } from "svelte";

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  let loaded = $state(false);
  const client = useRuntimeClient();
  $effect(() => {
    fileArtifacts.setClient(client, data.fileIo);
    loaded = true;
  });
</script>

{#if loaded}
  {@render children()}
{/if}
