<script lang="ts">
  import { page } from "$app/state";
  import ConnectYourDataWidget from "@statsparrot/web-common/features/add-data/ConnectYourDataWidget.svelte";
  import TitleContent from "@statsparrot/web-common/features/welcome/TitleContent.svelte";
  import ProjectCards from "@statsparrot/web-common/features/welcome/ProjectCards.svelte";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
  import { projectWelcomeStatus } from "@statsparrot/web-admin/features/welcome/project/welcome-status.ts";
  import { checkpointProject } from "@statsparrot/web-admin/features/projects/publish-project.ts";
  import OnboardingGenerateSampleData from "@statsparrot/web-common/features/add-data/OnboardingGenerateSampleData.svelte";

  const runtimeClient = useRuntimeClient();

  let project = $derived(page.params.project);

  async function handleDone() {
    projectWelcomeStatus.setProjectWelcomeStep(project, false);
    await checkpointProject(runtimeClient);
  }

  function handleGenerateSampleData() {
    projectWelcomeStatus.setProjectWelcomeStep(project, false);
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

    <ProjectCards onSelect={handleDone} />
  </div>
</div>
