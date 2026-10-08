<script lang="ts">
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";
  import { Button } from "@statsparrot/web-common/components/button";
  import Check from "@statsparrot/web-common/components/icons/Check.svelte";
  import Link from "@statsparrot/web-common/components/icons/Link.svelte";
  import { isClipboardApiSupported } from "@statsparrot/web-common/lib/actions/copy-to-clipboard";

  export let copyLink: string;

  let copied = false;

  function onCopy() {
    navigator.clipboard.writeText(copyLink).catch(console.error);
    copied = true;

    setTimeout(() => {
      copied = false;
    }, 2_000);
  }
</script>

{#if isClipboardApiSupported()}
  {#if copied}
    <div class="flex flex-row gap-x-1 items-center min-h-6">
      <Check size="12px" />
      <span class="font-medium text-xs text-fg-secondary">
        {m.users_url_copied()}
      </span>
    </div>
  {:else}
    <Button
      type="secondary"
      class="flex flex-row items-center"
      forcedStyle="min-height: 24px !important; height: 24px !important;  "
      onClick={onCopy}
      compact
    >
      <Link size="12px" />
      <span class="font-medium text-xs">{m.users_copy_url()}</span>
    </Button>
  {/if}
{/if}
