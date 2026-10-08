<script lang="ts">
  import { useCanvas } from "@statsparrot/web-common/features/canvas/selector";
  import { useRuntimeClient } from "../../runtime-client/v2";
  import { featureFlags } from "../feature-flags";
  import ChatToggle from "@statsparrot/web-common/features/chat/layouts/sidebar/ChatToggle.svelte";
  import {
    dashboardChatActions,
    dashboardChatOpen,
  } from "@statsparrot/web-common/features/chat/layouts/sidebar/sidebar-store";
  import ViewAsButton from "../dashboards/granular-access-policies/ViewAsButton.svelte";
  import {
    useDashboardPolicyCheck,
    useParrotYamlPolicyCheck,
  } from "../dashboards/granular-access-policies/useSecurityPolicyCheck";
  import CanvasEditButton from "@statsparrot/web-common/features/canvas/CanvasEditButton.svelte";

  const client = useRuntimeClient();

  export let canvasName: string;

  $: canvasQuery = useCanvas(client, canvasName);
  $: canvasFilePath = $canvasQuery.data?.filePath ?? "";

  $: canvasPolicyCheck = useDashboardPolicyCheck(client, canvasFilePath);
  $: statsparrotYamlPolicyCheck = useParrotYamlPolicyCheck(client);

  // Check if any metrics view referenced by this canvas has security rules
  $: referencedMetricsViewsHavePolicy = Object.values(
    $canvasQuery.data?.metricsViews ?? {},
  ).some((mv) => (mv?.state?.validSpec?.securityRules?.length ?? 0) > 0);

  $: hasSecurityPolicy =
    $canvasPolicyCheck.data ||
    $statsparrotYamlPolicyCheck.data ||
    referencedMetricsViewsHavePolicy;

  const { dashboardChat, readOnly } = featureFlags;

  $: hasAnyContent = hasSecurityPolicy || $dashboardChat || !$readOnly;
</script>

{#if hasAnyContent}
  <div class="flex gap-2 flex-shrink-0 ml-auto">
    {#if hasSecurityPolicy}
      <ViewAsButton />
    {/if}
    {#if $dashboardChat}
      <ChatToggle open={dashboardChatOpen} actions={dashboardChatActions} />
    {/if}
    {#if !$readOnly}
      <CanvasEditButton {canvasName} />
    {/if}
  </div>
{/if}
