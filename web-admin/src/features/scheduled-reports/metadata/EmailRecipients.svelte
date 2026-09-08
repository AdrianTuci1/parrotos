<script lang="ts">
  import MetadataLabel from "@statsparrot/web-admin/features/scheduled-reports/metadata/MetadataLabel.svelte";
  import { Tag } from "@statsparrot/web-common/components/tag/index.js";
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";

  export let emailRecipients: string[];
</script>

<div class="flex flex-col gap-y-3">
  <MetadataLabel
    >{m.report_recipients({
      count: String(emailRecipients.length),
    })}</MetadataLabel
  >
  <div class="flex flex-wrap gap-2">
    {#each emailRecipients as recipient}
      <Tag>
        {recipient}
      </Tag>
    {/each}
  </div>
</div>
