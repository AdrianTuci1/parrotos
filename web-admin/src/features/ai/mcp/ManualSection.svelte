<script lang="ts">
  import CodeBlock from "@statsparrot/web-common/components/code-block/CodeBlock.svelte";
  import PersonalAccessTokensSection from "../../personal-access-tokens/PersonalAccessTokensSection.svelte";
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";

  export let apiUrl: string;
  export let isPublic: boolean;

  let issuedToken: string | null = null;

  $: publicConfig = `{
  "mcpServers": {
    "statsparrot": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "${apiUrl}"
      ]
    }
  }
}`;

  $: privateConfig = `{
  "mcpServers": {
    "statsparrot": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "${apiUrl}",
        "--header",
        "Authorization:\${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "Bearer ${issuedToken ? issuedToken : "<Parrot personal access token>"}"
      }
    }
  }
}`;
</script>

<div class="flex flex-col gap-y-6 min-w-0">
  {#if !isPublic}
    <PersonalAccessTokensSection bind:issuedToken />
  {/if}

  <div class="flex flex-col gap-y-3 min-w-0">
    <h4 class="text-sm font-medium text-fg-primary">{m.mcp_configuration()}</h4>
    <p class="text-sm text-fg-secondary">
      {m.mcp_add_to_config()}
      <a
        href="https://docs.statsparrot.com/guide/ai/mcp#manual-configuration-alternative-method"
        target="_blank"
        rel="noopener"
      >
        {m.mcp_learn_more()}
      </a>
    </p>
    <div class="overflow-x-auto">
      <CodeBlock
        code={isPublic ? publicConfig : privateConfig}
        language="json"
      />
    </div>
  </div>
</div>
