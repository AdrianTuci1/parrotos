<script lang="ts">
  import ExploreEmbed from "@statsparrot/web-admin/features/embeds/ExploreEmbed.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
  $: ({ exploreName } = data);
</script>

<ExploreEmbed {exploreName} />
