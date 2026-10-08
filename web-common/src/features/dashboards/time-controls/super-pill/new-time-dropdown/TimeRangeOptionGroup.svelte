<script lang="ts">
  import type { ParrotTime } from "../../../url-state/time-ranges/ParrotTime";
  import TimeRangeMenuItem from "../components/TimeRangeMenuItem.svelte";

  export let filter = "";
  export let options: ParrotTime[];
  export let timeString: string | undefined = undefined;
  export let hideDivider = false;

  export let onClick: (range: string) => void;

  $: filtered = options.filter((option) => {
    return (
      option.interval.toString().toLowerCase().includes(filter.toLowerCase()) ||
      option.getLabel().toLowerCase().includes(filter.toLowerCase())
    );
  });
</script>

{#if filtered.length}
  <div class="w-full h-fit px-1">
    {#if hideDivider}
      <div class="h-px w-full bg-border my-1"></div>
    {/if}
    {#each filtered as option, i (i)}
      <TimeRangeMenuItem statsparrotTime={option} {timeString} {onClick} />
    {/each}

    {#if !hideDivider}
      <div class="h-px w-full bg-border my-1"></div>
    {/if}
  </div>
{/if}
