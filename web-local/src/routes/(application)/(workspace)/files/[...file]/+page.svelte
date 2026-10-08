<script lang="ts">
  import WorkspaceDispatcher from "@statsparrot/web-common/features/workspaces/WorkspaceDispatcher.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  $: ({ fileArtifact } = data);
</script>

<WorkspaceDispatcher {fileArtifact} />
