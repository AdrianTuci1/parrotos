<script lang="ts">
  import type { V1Message } from "@statsparrot/web-common/runtime-client";
  import ErrorComponent from "@statsparrot/web-common/features/chat/core/messages/Error.svelte";
  import { extractMessageText } from "@statsparrot/web-common/features/chat/core/utils.ts";
  import { formatTransportError } from "@statsparrot/web-common/features/chat/core/errors.ts";

  let { message }: { message: V1Message } = $props();
  let errorMessage = $derived(extractMessageText(message));
  let headline = $derived(formatTransportError(new Error(errorMessage)));
</script>

<ErrorComponent {headline} error={errorMessage} />
