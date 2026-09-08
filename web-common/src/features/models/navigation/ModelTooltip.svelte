<script lang="ts">
  import Shortcut from "@statsparrot/web-common/components/tooltip/Shortcut.svelte";
  import StackingWord from "@statsparrot/web-common/components/tooltip/StackingWord.svelte";
  import TooltipShortcutContainer from "@statsparrot/web-common/components/tooltip/TooltipShortcutContainer.svelte";
  import TooltipTitle from "@statsparrot/web-common/components/tooltip/TooltipTitle.svelte";
  import { isClipboardApiSupported } from "../../../lib/actions/copy-to-clipboard";

  export let modelName;
</script>

<TooltipTitle>
  <svelte:fragment slot="name">
    {modelName}
  </svelte:fragment>
  <svelte:fragment slot="description" />
</TooltipTitle>
<TooltipShortcutContainer>
  <div>Open in workspace</div>
  <Shortcut>Click</Shortcut>
  {#if isClipboardApiSupported()}
    <div>
      <StackingWord key="shift">Copy</StackingWord> name to clipboard
    </div>
    <Shortcut>
      <span
        style="
  font-family: var(--system); 
  font-size: 11.5px;
">⇧</span
      > + Click</Shortcut
    >
  {/if}
</TooltipShortcutContainer>
