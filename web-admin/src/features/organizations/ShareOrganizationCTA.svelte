<script lang="ts">
  import CLICommandDisplay from "@statsparrot/web-common/components/commands/CLICommandDisplay.svelte";

  export let organization: string;

  $: addUserCommand = `statsparrot user add --org ${organization} --role viewer`;
</script>

<div class="flex flex-col">
  <span class="uppercase text-fg-secondary font-semibold text-[10px] leading-4"
    >Share</span
  >
  <div>
    Run this command in the Parrot CLI to invite a teammate to view this
    organization.
  </div>
  <CLICommandDisplay command={addUserCommand} />
</div>
