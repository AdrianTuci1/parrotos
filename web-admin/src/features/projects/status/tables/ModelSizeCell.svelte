<script lang="ts">
  import { formatModelSize } from "@statsparrot/web-common/features/projects/status/tables/utils";

  export let sizeBytes: string | number | undefined;

  $: formattedSize = formatModelSize(sizeBytes);
</script>

<div class="truncate text-right tabular-nums">
  <span class:text-fg-muted={formattedSize === "-"}>
    {formattedSize}
  </span>
</div>
