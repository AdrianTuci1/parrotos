<script lang="ts">
  import { featureFlags } from "../feature-flags";
  import SidebarChat from "./layouts/sidebar/SidebarChat.svelte";
  import {
    dashboardChatActions,
    dashboardChatOpen,
  } from "./layouts/sidebar/sidebar-store";
  import { createDashboardChatConfig } from "@statsparrot/web-common/features/dashboards/chat-context.ts";
  import { ResourceKind } from "@statsparrot/web-common/features/entity-management/resource-selectors.ts";
  import { createCanvasChatConfig } from "@statsparrot/web-common/features/canvas/chat-context.ts";
  import ThemeProvider from "@statsparrot/web-common/features/dashboards/ThemeProvider.svelte";
  import { activeDashboardTheme } from "@statsparrot/web-common/features/themes/active-dashboard-theme";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";

  const runtimeClient = useRuntimeClient();

  export let kind: ResourceKind.Explore | ResourceKind.Canvas =
    ResourceKind.Explore;

  $: chatConfig =
    kind === ResourceKind.Explore
      ? createDashboardChatConfig(runtimeClient)
      : createCanvasChatConfig(runtimeClient);

  const { dashboardChat } = featureFlags;
</script>

{#if $dashboardChat && $dashboardChatOpen}
  <ThemeProvider theme={$activeDashboardTheme} applyLayout={false}>
    <SidebarChat
      config={chatConfig}
      actions={dashboardChatActions}
      surface="dashboard"
    />
  </ThemeProvider>
{/if}
