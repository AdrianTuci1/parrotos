<script lang="ts">
  import Spinner from "@statsparrot/web-common/features/entity-management/Spinner.svelte";
  import { EntityStatus } from "@statsparrot/web-common/features/entity-management/types";
</script>

<div class="h-16">
  <Spinner status={EntityStatus.Running} size="3rem" duration={725} />
</div>
