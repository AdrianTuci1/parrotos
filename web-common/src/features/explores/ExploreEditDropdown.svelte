<script lang="ts">
  import { Button } from "@statsparrot/web-common/components/button";
  import * as DropdownMenu from "@statsparrot/web-common/components/dropdown-menu";
  import CaretDownIcon from "@statsparrot/web-common/components/icons/CaretDownIcon.svelte";
  import ExploreIcon from "@statsparrot/web-common/components/icons/ExploreIcon.svelte";
  import MetricsViewIcon from "@statsparrot/web-common/components/icons/MetricsViewIcon.svelte";
  import { useExplore } from "@statsparrot/web-common/features/explores/selectors";
  import { getFileHref } from "@statsparrot/web-common/layout/navigation/editor-routing";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";

  let { exploreName }: { exploreName: string } = $props();

  const runtimeClient = useRuntimeClient();

  let exploreQuery = $derived(useExplore(runtimeClient, exploreName));
  let exploreFilePath = $derived(
    $exploreQuery.data?.explore?.meta?.filePaths?.[0] ?? "",
  );
  let metricsViewFilePath = $derived(
    $exploreQuery.data?.metricsView?.meta?.filePaths?.[0] ?? "",
  );
  // When the explore is defined inline in the metrics view file, both items point
  // at the same file; the ?view= param selects what gets edited.
  let definedInMetricsView = $derived(
    $exploreQuery.data?.explore?.explore?.state?.validSpec
      ?.definedInMetricsView ?? false,
  );
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button {...props} type="secondary">
        Edit
        <CaretDownIcon />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Item
      href={getFileHref(
        exploreFilePath,
        definedInMetricsView ? "explore" : undefined,
      )}
    >
      <ExploreIcon size="16px" />
      Explore dashboard
    </DropdownMenu.Item>
    <DropdownMenu.Item
      href={getFileHref(
        metricsViewFilePath,
        definedInMetricsView ? "viz" : undefined,
      )}
    >
      <MetricsViewIcon size="16px" />
      Metrics View
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
