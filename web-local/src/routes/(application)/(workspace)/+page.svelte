<script lang="ts">
  import { GeneratingMessage } from "@statsparrot/web-common/components/generating-message";
  import { generatingSampleData } from "@statsparrot/web-common/features/sample-data/generate-sample-data.ts";
  import OnboardingWorkspace from "@statsparrot/web-common/features/onboarding/OnboardingWorkspace.svelte";
  import type { LayoutData } from "../$types";

  export let data: LayoutData;
</script>

<svelte:head>
  <title>Parrot Developer</title>
</svelte:head>

<div class="flex size-full overflow-hidden bg-surface-subtle">
  {#if data.initialized}
    {#if $generatingSampleData}
      <GeneratingMessage title="Generating your sample data..." />
    {:else}
      <OnboardingWorkspace />
    {/if}
  {/if}
</div>
