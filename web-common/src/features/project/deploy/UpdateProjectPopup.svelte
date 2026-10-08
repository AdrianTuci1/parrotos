<script lang="ts">
  import { page } from "$app/stores";
  import { Button } from "@statsparrot/web-common/components/button";
  import * as Popover from "@statsparrot/web-common/components/popover";
  import ProjectSelector from "@statsparrot/web-common/features/project/deploy/ProjectSelector.svelte";
  import ProjectSelectorItem from "@statsparrot/web-common/features/project/deploy/ProjectSelectorItem.svelte";
  import RequestProjectAccessDialog from "@statsparrot/web-common/features/project/deploy/RequestProjectAccessDialog.svelte";
  import { getUpdateProjectRoute } from "@statsparrot/web-common/features/project/deploy/route-utils.ts";
  import { getManageProjectAccess } from "@statsparrot/web-common/features/project/selectors.ts";
  import type { Project } from "@statsparrot/web-common/proto/gen/statsparrot/admin/v1/api_pb";
  import { Rocket } from "lucide-svelte";
  import { getActiveResourceStore } from "@statsparrot/web-common/features/entity-management/nav-utils.ts";

  export let open = false;
  export let matchingProjects: Project[];

  let selectedProject: Project | undefined =
    matchingProjects.length === 1 ? matchingProjects[0] : undefined;
  $: hasManageProjectAccess = getManageProjectAccess(
    selectedProject?.orgName ?? "",
    selectedProject?.name ?? "",
  );

  $: enableUpdate = !!selectedProject;

  const currentResource = getActiveResourceStore();
  $: deployUrl = selectedProject
    ? getUpdateProjectRoute(
        $page,
        $currentResource,
        selectedProject.orgName,
        selectedProject.name,
      )
    : "";

  let showRequestProjectAccess = false;
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button {...props} type="primary">
        <Rocket size={16} />

        Deploy
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content align="start" class="w-[420px] flex flex-col gap-y-2">
    <div class="text-base font-medium">Update</div>
    <div class="text-sm text-fg-secondary">
      Push local changes to Parrot Cloud?
    </div>

    {#if matchingProjects.length === 1 && selectedProject}
      <div class="border rounded-sm border-gray-300">
        <ProjectSelectorItem project={selectedProject} />
      </div>
    {:else}
      <ProjectSelector bind:selectedProject projects={matchingProjects} />
    {/if}

    <div class="flex flex-row-reverse items-center gap-x-2">
      {#if $hasManageProjectAccess || !selectedProject}
        <Button
          type="primary"
          disabled={!enableUpdate}
          href={deployUrl}
          target="_blank"
          onClick={() => (open = false)}
        >
          Update
        </Button>
      {:else}
        <Button
          type="primary"
          disabled={!enableUpdate}
          onClick={() => {
            open = false;
            showRequestProjectAccess = true;
          }}
        >
          Update
        </Button>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>

{#if selectedProject}
  <RequestProjectAccessDialog
    bind:open={showRequestProjectAccess}
    project={selectedProject}
  />
{/if}
