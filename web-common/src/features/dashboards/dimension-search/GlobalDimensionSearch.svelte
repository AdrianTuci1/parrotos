<script lang="ts">
  import { Button } from "@statsparrot/web-common/components/button";
  import Cancel from "@statsparrot/web-common/components/icons/Cancel.svelte";
  import SearchIcon from "@statsparrot/web-common/components/icons/Search.svelte";
  import { Search } from "@statsparrot/web-common/components/search";
  import GlobalDimensionSearchResults from "@statsparrot/web-common/features/dashboards/dimension-search/GlobalDimensionSearchResults.svelte";
  import { slideRight } from "@statsparrot/web-common/lib/transitions";
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";

  let searchBarOpen = false;
  let searchText = "";

  function reset() {
    searchBarOpen = false;
  }

  let submittedSearchText = "";
  let searchResultsOpen = false;
  function onSubmit() {
    submittedSearchText = searchText;
    searchResultsOpen = true;
  }
</script>

<div class="relative flex flex-row">
  {#if searchBarOpen}
    <div
      transition:slideRight={{}}
      class="flex items-center gap-x-2 pr-2 w-60 bg-surface-background border border-primary-300"
    >
      <Search
        bind:value={searchText}
        {onSubmit}
        placeholder={m.dashboard_search_dimensions()}
        autofocus
        border={false}
        background={false}
      />
      <button class="text-fg-secondary" onclick={reset}>
        <Cancel size="16px" />
      </button>
    </div>
  {:else}
    <Button
      class="flex items-center gap-x-2 p-1.5 text-fg-primary"
      onClick={() => (searchBarOpen = !searchBarOpen)}
      type="secondary"
      compact
    >
      <SearchIcon size="16px" />
    </Button>
  {/if}

  <GlobalDimensionSearchResults
    searchText={submittedSearchText}
    onSelect={reset}
    bind:open={searchResultsOpen}
  />
</div>
