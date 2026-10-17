<script lang="ts">
  import { EmbedStore } from "@statsparrot/web-common/features/embeds/embed-store";

  export let leading: string | undefined = undefined;

  $: isEmbedded = EmbedStore.isEmbedded();
</script>

{#if !isEmbedded}
  <p class="text-sm text-fg-secondary text-center">
    {#if leading}{leading}{" "}{/if}Need help? Reach out to us at
    <a href="https://staticlabs.ro" target="_blank">staticlabs.ro</a>
  </p>
{/if}
