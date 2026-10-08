<script lang="ts">
  import * as Dialog from "@statsparrot/web-common/components/dialog";
  import { Search } from "@statsparrot/web-common/components/search";
  import PartitionsTable from "@statsparrot/web-common/features/models/partitions/PartitionsTable.svelte";
  import PartitionsFilter from "@statsparrot/web-common/features/models/partitions/PartitionsFilter.svelte";
  import type { V1Resource } from "@statsparrot/web-common/runtime-client";
  import {
    shouldFilterByErrored,
    shouldFilterByPending,
    type PartitionFilterType,
  } from "./utils";
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";

  export let open = false;
  export let resource: V1Resource | null = null;
  export let onClose: () => void = () => {};

  let selectedFilter: PartitionFilterType = "all";
  let searchText = "";

  function onFilterChange(value: string) {
    selectedFilter = value as PartitionFilterType;
  }

  $: modelName = resource?.meta?.name?.name ?? "";
  $: whereErrored = shouldFilterByErrored(selectedFilter);
  $: wherePending = shouldFilterByPending(selectedFilter);
</script>

<Dialog.Root
  {open}
  onOpenChange={(o) => {
    if (!o) {
      selectedFilter = "all";
      searchText = "";
      onClose();
    }
  }}
>
  <Dialog.Content class="max-w-screen-xl h-[40vh] flex flex-col gap-y-4">
    <Dialog.Header>
      <Dialog.Title>{m.status_model_partitions()}: {modelName}</Dialog.Title>
    </Dialog.Header>

    {#if resource}
      <div class="flex flex-row items-center gap-x-4 min-h-9">
        <div class="flex-1 min-w-0 min-h-9">
          <Search
            bind:value={searchText}
            large
            autofocus={false}
            showBorderOnFocus={false}
            retainValueOnMount
          />
        </div>
        <PartitionsFilter {selectedFilter} onChange={onFilterChange} />
      </div>
      <div class="flex-1 min-h-0 overflow-auto">
        <PartitionsTable
          {resource}
          {whereErrored}
          {wherePending}
          {searchText}
        />
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
