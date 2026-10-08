<script lang="ts">
  import SourceImportedModal from "@statsparrot/web-common/features/sources/modal/SourceImportedModal.svelte";
  import { sourceIngestionTracker } from "@statsparrot/web-common/features/sources/sources-store";

  const ingestedPath = sourceIngestionTracker.ingestedPath;
</script>

<main
  role="application"
  class="index-body relative size-full flex flex-col overflow-hidden"
>
  <slot />
</main>

<SourceImportedModal sourcePath={$ingestedPath} />
