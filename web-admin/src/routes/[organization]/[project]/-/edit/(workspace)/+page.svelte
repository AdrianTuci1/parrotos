<script lang="ts">
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";
  import { GeneratingMessage } from "@statsparrot/web-common/components/generating-message";
  import { generatingSampleData } from "@statsparrot/web-common/features/sample-data/generate-sample-data.ts";
  import OnboardingWorkspace from "@statsparrot/web-common/features/onboarding/OnboardingWorkspace.svelte";
</script>

<div class="flex size-full overflow-hidden bg-surface-subtle">
  {#if $generatingSampleData}
    <GeneratingMessage title={m.workspace_generating_sample_data()} />
  {:else}
    <OnboardingWorkspace />
  {/if}
</div>
