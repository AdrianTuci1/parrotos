<script lang="ts">
  import { onNavigate } from "$app/navigation";
  import { page } from "$app/stores";
  import { createAdminServiceGetProject } from "@statsparrot/web-admin/client";
  import {
    TokenBannerID,
    TokenBannerPriority,
  } from "@statsparrot/web-common/components/banner/constants";
  import { Dashboard } from "@statsparrot/web-common/features/dashboards";
  import StateManagersProvider from "@statsparrot/web-common/features/dashboards/state-managers/StateManagersProvider.svelte";
  import DashboardStateManager from "@statsparrot/web-common/features/dashboards/state-managers/loaders/DashboardStateManager.svelte";
  import { eventBus } from "@statsparrot/web-common/lib/event-bus/event-bus";
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";
  import { createRuntimeServiceGetExplore } from "@statsparrot/web-common/runtime-client";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";

  const runtimeClient = useRuntimeClient();

  $: ({ organization, project, dashboard: exploreName } = $page.params);

  // Query the `GetProject` API with cookie-based auth to determine if the user has access to the original dashboard
  $: cookieProjectQuery = createAdminServiceGetProject(organization, project);
  $: ({ data: cookieProject } = $cookieProjectQuery);
  $: if (cookieProject) {
    eventBus.emit("add-banner", {
      id: TokenBannerID,
      priority: TokenBannerPriority,
      message: {
        type: "default",
        message: m.share_limited_view({
          link: `<a href='/${organization}/${project}/explore/${exploreName}'>${m.share_original_dashboard()}</a>`,
        }),
        includesHtml: true,
        iconType: "alert",
      },
    });
  }

  // Call `GetExplore` to get the Explore's metrics view
  $: exploreQuery = createRuntimeServiceGetExplore(runtimeClient, {
    name: exploreName,
  });
  $: ({ data: explore } = $exploreQuery);

  // Clear the banner when navigating away from the Public URL page
  // (We make sure to not clear it when the user interacts with the dashboard)
  onNavigate(({ from, to }) => {
    const currentPath = from?.url.pathname;
    const newPath = to?.url.pathname;
    if (newPath !== currentPath) {
      eventBus.emit("remove-banner", TokenBannerID);
    }
  });
</script>

{#key exploreName}
  {#if explore?.metricsView}
    <StateManagersProvider
      metricsViewName={explore.metricsView.meta.name.name}
      {exploreName}
    >
      <DashboardStateManager
        {exploreName}
        storageNamespacePrefix={`${organization}__${project}__`}
      >
        <Dashboard
          {exploreName}
          metricsViewName={explore.metricsView.meta.name.name}
        />
      </DashboardStateManager>
    </StateManagersProvider>
  {/if}
{/key}
