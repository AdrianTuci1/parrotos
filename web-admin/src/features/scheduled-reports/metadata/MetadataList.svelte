<script lang="ts">
  import MetadataLabel from "@statsparrot/web-admin/features/scheduled-reports/metadata/MetadataLabel.svelte";
  import { Tag } from "@statsparrot/web-common/components/tag/index.js";
  export let data: string[];
  export let label: string;
</script>

<div class="flex flex-col gap-y-3">
  <MetadataLabel>{label} ({data.length})</MetadataLabel>
  <div class="flex flex-wrap gap-2">
    {#each data as datum}
      <Tag>
        {datum}
      </Tag>
    {/each}
  </div>
</div>
