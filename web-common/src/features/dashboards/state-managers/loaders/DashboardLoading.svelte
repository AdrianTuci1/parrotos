<script lang="ts">
  import BrandedLoader from "@statsparrot/web-common/components/BrandedLoader.svelte";
  import CtaContentContainer from "@statsparrot/web-common/components/calls-to-action/CTAContentContainer.svelte";
  import CtaLayoutContainer from "@statsparrot/web-common/components/calls-to-action/CTALayoutContainer.svelte";
  import { LoadingTracker } from "@statsparrot/web-common/lib/LoadingTracker";
  import { fade } from "svelte/transition";

  export let isLoading: boolean;
  export let shortLoadDelay: number = 1000;
  export let longLoadDelay: number = 5000;

  const loadingTracker = new LoadingTracker(shortLoadDelay, longLoadDelay);
  $: loadingTracker.updateLoading(isLoading);
  $: ({ loadingForShortTime, loadingForLongTime } = loadingTracker);
</script>

{#if $loadingForShortTime}
  <CtaLayoutContainer>
    <CtaContentContainer>
      <div class="flex h-36 items-center">
        <BrandedLoader size="72px" label="Loading your dashboard" />
      </div>
      {#if $loadingForLongTime}
        <h1
          class="text-lg font-semibold text-fg-primary text-center"
          transition:fade|local={{ duration: 50 }}
        >
          Loading your dashboard...If this is taking a while, your database may
          be waking up.
        </h1>
      {/if}
    </CtaContentContainer>
  </CtaLayoutContainer>
{/if}
