<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import IconButton from "@statsparrot/web-common/components/button/IconButton.svelte";
  import * as DropdownMenu from "@statsparrot/web-common/components/dropdown-menu/";
  import ExploreIcon from "@statsparrot/web-common/components/icons/ExploreIcon.svelte";
  import LoadingSpinner from "@statsparrot/web-common/components/LoadingSpinner.svelte";
  import Spinner from "@statsparrot/web-common/features/entity-management/Spinner.svelte";
  import { EntityStatus } from "@statsparrot/web-common/features/entity-management/types";
  import { generateExploreLink } from "@statsparrot/web-common/features/explore-mappers/generate-explore-link";
  import {
    ExploreLinkErrorType,
    type ExploreLinkError,
  } from "@statsparrot/web-common/features/explore-mappers/types";
  import { getErrorMessage } from "@statsparrot/web-common/features/explore-mappers/utils";
  import type { ExploreState } from "@statsparrot/web-common/features/dashboards/stores/explore-state";
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";

  const runtimeClient = useRuntimeClient();

  export let exploreName: string;
  export let displayName: string | undefined = undefined;
  export let organization: string | undefined = undefined;
  export let project: string | undefined = undefined;
  export let exploreState: Partial<ExploreState> | undefined = undefined;
  export let mode: "inline" | "dropdown-item" | "icon-button" = "inline";
  export let disabled: boolean = false;

  let isNavigating = false;
  let navigationError: ExploreLinkError | null = null;

  $: onEditPage = $page.route?.id?.includes("/edit/(viz)/canvas");

  async function gotoExplorePage() {
    if (!exploreName || !exploreState || disabled) return;

    navigationError = null;
    isNavigating = true;

    try {
      const exploreURL = await generateExploreLink(
        runtimeClient,
        exploreState,
        exploreName,
        onEditPage ? undefined : organization,
        onEditPage ? undefined : project,
      );
      await goto(exploreURL);
    } catch (error) {
      console.warn("Navigation error:", error);
      if (error.type) {
        navigationError = error as ExploreLinkError;
      } else {
        navigationError = {
          type: ExploreLinkErrorType.TRANSFORMATION_ERROR,
          message: error?.message,
          details: error,
        };
      }
    } finally {
      isNavigating = false;
    }
  }

  $: canNavigate = !isNavigating && !!exploreState && !disabled;
  $: tooltipText = displayName
    ? m.explore_go_to_named({ name: displayName })
    : m.explore_go_to_dashboard();
</script>

{#if mode === "dropdown-item"}
  <DropdownMenu.Item onclick={gotoExplorePage}>
    {#if isNavigating}
      <Spinner status={EntityStatus.Running} size="14px" />
    {:else}
      <ExploreIcon size="14px" />
    {/if}
    {m.explore_go_to_explore()}
  </DropdownMenu.Item>
{:else if mode === "icon-button"}
  <IconButton
    onclick={gotoExplorePage}
    size={28}
    disabled={!canNavigate}
    ariaLabel={tooltipText}
    disableHover={!canNavigate}
  >
    {#if isNavigating}
      <Spinner status={EntityStatus.Running} size="18px" />
    {:else}
      <ExploreIcon size="18px" />
    {/if}
    <div slot="tooltip-content">{tooltipText}</div>
  </IconButton>
{:else}
  <button
    onclick={gotoExplorePage}
    class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    disabled={!canNavigate}
    type="button"
  >
    {#if isNavigating}
      <Spinner status={EntityStatus.Running} size="1em" />
    {/if}
    {tooltipText}
  </button>
{/if}

{#if navigationError && mode === "inline"}
  <div class="flex flex-col gap-y-2 text-red-600 mt-2">
    <h3 class="text-sm font-semibold">{m.explore_unable_to_open()}</h3>
    <p class="text-xs">{getErrorMessage(navigationError)}</p>
  </div>
{:else if isNavigating && mode === "inline"}
  <LoadingSpinner />
{/if}
