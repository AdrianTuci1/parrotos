<script lang="ts">
  import ProjectCards from "@statsparrot/web-common/features/welcome/ProjectCards.svelte";
  import TitleContent from "@statsparrot/web-common/features/welcome/TitleContent.svelte";
  import OnboardingGenerateSampleData from "@statsparrot/web-common/features/add-data/OnboardingGenerateSampleData.svelte";
  import ConnectYourDataWidget from "@statsparrot/web-common/features/add-data/ConnectYourDataWidget.svelte";
  import { onMount } from "svelte";
  import { behaviourEvent } from "@statsparrot/web-common/metrics/initMetrics.ts";
  import {
    BehaviourEventAction,
    BehaviourEventMedium,
  } from "@statsparrot/web-common/metrics/service/BehaviourEventTypes.ts";
  import {
    MetricsEventScreenName,
    MetricsEventSpace,
  } from "@statsparrot/web-common/metrics/service/MetricsTypes.ts";
  import { waitUntil } from "@statsparrot/web-common/lib/waitUtils.ts";
  import { WelcomeStatus } from "@statsparrot/web-common/features/welcome/status.ts";

  onMount(async () => {
    await waitUntil(() => !!behaviourEvent);
    void behaviourEvent?.fireAddDataStepEvent(
      BehaviourEventAction.WelcomePageViewed,
      BehaviourEventMedium.Card,
      MetricsEventSpace.Workspace,
      MetricsEventScreenName.Splash,
      {},
    );
  });

  function handleGenerateSampleData() {
    WelcomeStatus.set(false);
  }
</script>

<div class="my-auto">
  <TitleContent />

  <div class="flex flex-col py-6 gap-[28px]">
    <div class="flex flex-col mx-auto md:flex-row gap-x-12 gap-y-6">
      <ConnectYourDataWidget onWelcomeScreen />
      <OnboardingGenerateSampleData onGenerate={handleGenerateSampleData} />
    </div>

    <p class="text-base font-normal text-fg-secondary text-center">
      Or jump right into an example project.
    </p>

    <ProjectCards isLocal />
  </div>
</div>
