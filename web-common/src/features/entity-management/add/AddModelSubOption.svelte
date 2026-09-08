<script lang="ts">
  import * as DropdownMenu from "@statsparrot/web-common/components/dropdown-menu";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
  import { getConnectorsWithImportSupport } from "@statsparrot/web-common/features/entity-management/add/selectors.ts";
  import { resourceIconMapping } from "@statsparrot/web-common/features/entity-management/resource-icon-mapping.ts";
  import { ResourceKind } from "@statsparrot/web-common/features/entity-management/resource-selectors.ts";
  import { useIsModelingSupportedForDefaultOlapDriverOLAP as useIsModelingSupportedForDefaultOlapDriver } from "@statsparrot/web-common/features/connectors/selectors.ts";
  import {
    connectorClassMapping,
    connectorIconMapping,
  } from "@statsparrot/web-common/features/connectors/connector-metadata.ts";
  import File from "@statsparrot/web-common/components/icons/File.svelte";
  import { createResourceAndNavigate } from "@statsparrot/web-common/features/entity-management/add/new-files.ts";

  export let onSelect: (connector: string) => void;

  const runtimeClient = useRuntimeClient();

  const isModelingSupportedForDefaultOlapDriver =
    useIsModelingSupportedForDefaultOlapDriver(runtimeClient);
  $: isModelingSupported = $isModelingSupportedForDefaultOlapDriver.data;

  const connectorsWithImportSupportQuery =
    getConnectorsWithImportSupport(runtimeClient);
  $: connectorsWithImportSupport = $connectorsWithImportSupportQuery.data ?? [];
</script>

{#if isModelingSupported}
  <DropdownMenu.Sub>
    <DropdownMenu.SubTrigger class="flex gap-x-2" aria-label="Add Model">
      <svelte:component
        this={resourceIconMapping[ResourceKind.Model]}
        size="16px"
      />
      Model
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent class="w-[240px]">
      {#each connectorsWithImportSupport as { displayName, connector, schema } (connector)}
        {@const icon = connectorIconMapping[schema]}
        {@const className = connectorClassMapping[schema] ?? ""}
        <DropdownMenu.Item
          onclick={() => onSelect(connector)}
          class="flex gap-x-2"
          aria-label="Create model for {displayName}"
        >
          <svelte:component this={icon} size="16px" class={className} />
          {displayName}
        </DropdownMenu.Item>
      {/each}
      <DropdownMenu.Item
        class="flex gap-x-2"
        onclick={() =>
          createResourceAndNavigate(runtimeClient, ResourceKind.Model)}
        aria-label="Create blank model"
      >
        <File size="14px" className="stroke-icon-muted" />
        Blank model
      </DropdownMenu.Item>
    </DropdownMenu.SubContent>
  </DropdownMenu.Sub>
{:else}
  <DropdownMenu.Item aria-label="Add Model" class="flex gap-x-2" disabled>
    <svelte:component
      this={resourceIconMapping[ResourceKind.Model]}
      size="16px"
    />
    <div class="flex flex-col items-start">
      Model
      <span class="text-fg-secondary text-xs">
        Requires a supported OLAP driver
      </span>
    </div>
  </DropdownMenu.Item>
{/if}
