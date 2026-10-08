<script lang="ts">
  import ExternalLink from "@statsparrot/web-common/components/icons/ExternalLink.svelte";
  import Github from "@statsparrot/web-common/components/icons/Github.svelte";
  import ParrotFilled from "@statsparrot/web-common/components/icons/ParrotFilled.svelte";
  import type { Project } from "@statsparrot/web-common/proto/gen/statsparrot/admin/v1/api_pb";
  import * as Tooltip from "@statsparrot/web-common/components/tooltip-v2";

  export let project: Project;
  export let selected = false;
  export let onClick: () => void = () => {};

  let hovered = false;
  $: isManaged = !project.gitRemote || !!project.managedGitId;
</script>

<button
  class="flex flex-row items-center justify-between w-full text-xs text-fg-primary text-left font-medium p-1 pl-2"
  class:hover:bg-surface-background={!selected}
  class:bg-primary-100={selected}
  onclick={onClick}
  onmouseenter={() => (hovered = true)}
  onmouseleave={() => (hovered = false)}
>
  <div class="flex flex-row items-center gap-x-2 w-full">
    {#if isManaged}
      <Tooltip.Root>
        <Tooltip.Trigger>
          <ParrotFilled size="14" />
        </Tooltip.Trigger>
        <Tooltip.Content side="bottom">Parrot-managed</Tooltip.Content>
      </Tooltip.Root>
    {:else}
      <Github size="14" />
    {/if}
    <span class="w-full">{project.orgName}/{project.name}</span>
  </div>
  {#if hovered}
    <Tooltip.Root>
      <Tooltip.Trigger>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={project.frontendUrl}
          class="justify-end"
        >
          <ExternalLink className="fill-gray-700" />
        </a>
      </Tooltip.Trigger>
      <Tooltip.Content side="bottom">Open Parrot Cloud project</Tooltip.Content>
    </Tooltip.Root>
  {/if}
</button>
