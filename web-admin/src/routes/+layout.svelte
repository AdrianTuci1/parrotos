<script lang="ts">
  import { page } from "$app/stores";
  import { initializeI18n } from "@statsparrot/web-common/lib/i18n";
  import {
    handleAdminServerNetworkError,
    handleAdminServerQuerySuccess,
    registerAdminNetworkRecoveryListeners,
  } from "@statsparrot/web-admin/components/errors/admin-network-errors";
  import { dynamicHeight } from "@statsparrot/web-common/layout/layout-settings.ts";
  import BillingBannerManager from "@statsparrot/web-admin/features/billing/banner/BillingBannerManager.svelte";
  import {
    isBillingUpgradePage,
    isOnboardingPage,
    isPublicReportPage,
    withinOrganization,
    withinProject,
  } from "@statsparrot/web-admin/features/navigation/nav-utils";
  import OrganizationTabs from "@statsparrot/web-admin/features/organizations/OrganizationTabs.svelte";
  import { initCloudMetrics } from "@statsparrot/web-admin/features/telemetry/initCloudMetrics";
  import BannerCenter from "@statsparrot/web-common/components/banner/BannerCenter.svelte";
  import NotificationCenter from "@statsparrot/web-common/components/notifications/NotificationCenter.svelte";
  import { featureFlags } from "@statsparrot/web-common/features/feature-flags";
  import { initPylonWidget } from "@statsparrot/web-common/features/help/initPylonWidget";
  import { isEmbedPage } from "@statsparrot/web-common/layout/navigation/navigation-utils.ts";
  import { eventBus } from "@statsparrot/web-common/lib/event-bus/event-bus.ts";
  import { queryClient } from "@statsparrot/web-common/lib/svelte-query/globalQueryClient";
  import { errorEventHandler } from "@statsparrot/web-common/metrics/initMetrics";
  import { type Query, QueryClientProvider } from "@tanstack/svelte-query";
  import { onMount } from "svelte";
  import ErrorBoundary from "../components/errors/ErrorBoundary.svelte";
  import OrgHeader from "../features/organizations/OrgHeader.svelte";
  import "@statsparrot/web-common/app.css";
  import * as Tooltip from "@statsparrot/web-common/components/tooltip-v2";
  import { themeControl } from "@statsparrot/web-common/features/themes/theme-control";
  import { getThemedLogoUrl } from "@statsparrot/web-admin/features/themes/organization-logo";
  import type { V1Organization } from "@statsparrot/web-admin/client";

  export let data;

  initializeI18n();

  $: ({
    organizationPermissions,
    organization: organizationObj,
    planDisplayName,
  } = data);

  $: organizationFaviconUrl = organizationObj?.faviconUrl;
  $: organizationLogoUrl = getThemedLogoUrl(
    $themeControl,
    organizationObj as V1Organization | undefined,
  );

  $: ({
    params: { organization: organizationName },
    url: { pathname },
  } = $page);

  $: organization = organizationName;

  // Remember:
  // - https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose#a-bad-api
  // - https://tkdodo.eu/blog/react-query-error-handling#the-global-callbacks
  queryClient.getQueryCache().config.onError = (
    error: unknown,
    query: Query,
  ) => {
    // Add TanStack Query errors to telemetry
    errorEventHandler?.requestErrorEventHandler(error, query);

    handleAdminServerNetworkError(error, query, queryClient);
  };

  queryClient.getQueryCache().config.onSuccess = (
    _data: unknown,
    query: Query,
  ) => {
    handleAdminServerQuerySuccess(query);
  };

  // The admin server enables some dashboard features like scheduled reports and alerts
  // Set read-only mode so that the user can't edit the dashboard
  featureFlags.set(true, "adminServer", "readOnly");

  let removeJavascriptListeners: () => void;

  initCloudMetrics()
    .then(() => {
      removeJavascriptListeners =
        errorEventHandler?.addJavascriptErrorListeners();
    })
    .catch(console.error);
  initPylonWidget();

  onMount(() => {
    const removeNetworkRecoveryListeners =
      registerAdminNetworkRecoveryListeners(queryClient);

    return () => {
      removeJavascriptListeners?.();
      removeNetworkRecoveryListeners();
    };
  });

  $: isEmbed = isEmbedPage($page);

  // Onboarding pages like the project invite page, org/project welcome page, and project create page should hide the top bar and billing manager
  $: onOnboardingPage = isOnboardingPage($page);

  $: hideTopBar =
    // upgrade callback landing page shouldn't show any statsparrot identifications
    isBillingUpgradePage($page) ||
    // public reports are shared to external users who shouldn't be shown any statsparrot related stuff
    isPublicReportPage($page) ||
    onOnboardingPage;
  $: hideBillingManager =
    // billing manager needs organization
    !organization || onOnboardingPage;

  $: withinOnlyOrg = withinOrganization($page) && !withinProject($page);

  function pageContentSizeHandler(node: HTMLElement) {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        eventBus.emit("page-content-resized", {
          width,
          height,
        });
      }
    });

    resizeObserver.observe(node);

    return {
      destroy() {
        resizeObserver.disconnect();
      },
    };
  }
</script>

<svelte:head>
  <meta content="Parrot Cloud" name="description" />
  {#if organizationFaviconUrl}
    <link rel="icon" href={organizationFaviconUrl} />
  {:else}
    <link rel="icon" href="/favicon.png" />
  {/if}
</svelte:head>

<Tooltip.Provider>
  <QueryClientProvider client={queryClient}>
    <main
      class="flex flex-col bg-surface-base dark:bg-surface-background"
      class:min-h-screen={!$dynamicHeight}
      class:h-screen={!$dynamicHeight}
      use:pageContentSizeHandler
    >
      <BannerCenter />
      {#if !hideBillingManager}
        <BillingBannerManager {organization} {organizationPermissions} />
      {/if}
      {#if !isEmbed && !hideTopBar && !withinProject($page)}
        <OrgHeader
          readProjects={organizationPermissions?.readProjects}
          {planDisplayName}
          {organizationLogoUrl}
        />

        {#if withinOnlyOrg}
          <OrganizationTabs
            {organization}
            {organizationPermissions}
            {pathname}
          />
        {/if}
      {/if}
      <ErrorBoundary>
        <slot />
      </ErrorBoundary>
    </main>
  </QueryClientProvider>

  <NotificationCenter />
</Tooltip.Provider>
