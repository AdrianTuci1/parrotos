<script lang="ts">
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";
  import ErrorPage from "@statsparrot/web-common/components/ErrorPage.svelte";
  import { Dashboard } from "@statsparrot/web-common/features/dashboards";
  import DashboardStateManager from "@statsparrot/web-common/features/dashboards/state-managers/loaders/DashboardStateManager.svelte";
  import StateManagersProvider from "@statsparrot/web-common/features/dashboards/state-managers/StateManagersProvider.svelte";
  import { getHomeHref } from "@statsparrot/web-common/layout/navigation/editor-routing";
  import { createRuntimeServiceGetExplore } from "@statsparrot/web-common/runtime-client";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
  import type { PageData } from "./$types";

  export let data: PageData;
  $: ({ exploreName } = data);

  const client = useRuntimeClient();

  $: explore = createRuntimeServiceGetExplore(
    client,
    { name: exploreName },
    {
      query: { enabled: !!exploreName },
    },
  );

  $: metricsViewName = $explore.data?.metricsView?.meta?.name?.name;
  $: measures =
    $explore.data?.explore?.explore?.state?.validSpec?.measures ?? [];
</script>

<svelte:head>
  <title>{m.explore_page_title({ exploreName })}</title>
</svelte:head>

{#if measures.length === 0}
  <ErrorPage
    statusCode={undefined}
    header={m.explore_error_fetching()}
    body={m.explore_no_measures()}
    href={getHomeHref()}
  />
{:else if metricsViewName}
  <div class="h-full overflow-hidden">
    {#key exploreName}
      <StateManagersProvider {metricsViewName} {exploreName}>
        <DashboardStateManager {exploreName}>
          <Dashboard {metricsViewName} {exploreName} />
        </DashboardStateManager>
      </StateManagersProvider>
    {/key}
  </div>
{/if}
